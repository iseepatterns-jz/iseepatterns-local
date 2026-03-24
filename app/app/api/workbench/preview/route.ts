import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getImessageDb, getCommDb, EVIDENCE_DIR } from "@/lib/db";

/**
 * GET /api/workbench/preview?type=email&id=<MSG_ID_or_filename>&section=<section>
 * Returns HTML rendering of evidence as it would appear in the final PDF.
 */

// ── Body cleaning (mirrors rebuild_all_evidence_pdfs.py) ──

const SIGNATURE_PATTERNS = [
    /^--\s*$/,
    /^[-_]{2,}\s*$/,
    /^sent from my/i,
    /^get outlook/i,
    /^begin forwarded message/i,
    /^joe\s+zangrilli\s*$/i,
    /^joseph\s+zangrilli\s*$/i,
    /^lucas\s+guariglia\s*$/i,
    /^rowboat\s+creative\s*$/i,
    /^cell:\s*[\d(]/i,
    /^office:\s*[\d(]/i,
    /^fax:\s*[\d(]/i,
    /^tel:\s*[\d(]/i,
    /^phone:\s*[\d(]/i,
    /^(CEO|COO|CFO|CTO|owner|co-founder|founder|designer|manager|president|vp|vice president)/i,
    /^custom screen printing/i,
    /^ASI:\s*\d/i,
    /^www\./i,
    /^https?:\/\/(www\.)?(instagram|rowboat|linkedin|twitter|facebook)/i,
    /^\s*On .+ wrote:\s*$/i,
    /^this (email|message|communication) (is|may be) (intended|confidential)/i,
    /^(disclaimer|confidentiality|privilege)/i,
    /^if you (are not|have received) the intended/i,
    /^please (consider|think|note).*environment.*print/i,
    /^\*{3,}/i,
    /^_{5,}/i,
    /^={5,}/i,
    /^-{5,}/i,
];

const REPLY_CHAIN_PATTERNS = [
    /^-{3,}\s*Original Message\s*-{3,}/i,
    /^_{3,}\s*$/i,
    /^From:\s*.+\s*Sent:\s*/i,
    /^From:\s*.+\s*Date:\s*/i,
    /^On\s+.+\d{4}.+wrote:\s*$/i,
    /^On\s+.+\d{4}.+at\s+\d/i,
];

function cleanBody(text: string): { cleaned: string; issues: CleaningIssue[] } {
    if (!text) return { cleaned: "(no body)", issues: [] };

    const lines = text.split("\n");
    const cleaned: string[] = [];
    const issues: CleaningIssue[] = [];
    let inSig = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Quoted reply
        if (/^\s*>/.test(line)) {
            issues.push({ line: i + 1, type: "quoted_reply", text: line.trim().slice(0, 80) });
            continue;
        }

        // Reply chain start
        const contentLines = cleaned.filter(l => l.trim());
        if (contentLines.length >= 3 && REPLY_CHAIN_PATTERNS.some(p => p.test(line))) {
            issues.push({ line: i + 1, type: "reply_chain", text: line.trim().slice(0, 80) });
            break;
        }

        // Signature
        if (SIGNATURE_PATTERNS.some(p => p.test(line))) {
            inSig = true;
            issues.push({ line: i + 1, type: "signature", text: line.trim().slice(0, 80) });
            continue;
        }

        if (inSig) {
            const stripped = line.trim();
            if (stripped === "") continue;
            if (stripped.length > 60 && /^[a-zA-Z]/.test(stripped)) {
                inSig = false;
                cleaned.push(line);
            } else {
                issues.push({ line: i + 1, type: "signature", text: stripped.slice(0, 80) });
                continue;
            }
        } else {
            cleaned.push(line);
        }
    }

    // Trim blanks
    while (cleaned.length && cleaned[cleaned.length - 1].trim() === "") cleaned.pop();
    while (cleaned.length && cleaned[0].trim() === "") cleaned.shift();

    // Check for whitespace issues
    for (let i = 0; i < cleaned.length; i++) {
        if (/\t/.test(cleaned[i])) {
            issues.push({ line: i + 1, type: "whitespace", text: "Contains tab characters" });
        }
        if (/\s{3,}/.test(cleaned[i])) {
            issues.push({ line: i + 1, type: "whitespace", text: "Excessive whitespace" });
        }
        if (/[\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u00a0]/.test(cleaned[i])) {
            issues.push({ line: i + 1, type: "encoding", text: "Non-ASCII characters found" });
        }
    }

    const result = cleaned.join("\n").trim();
    return { cleaned: result || "(no substantive body content)", issues };
}

interface CleaningIssue {
    line: number;
    type: "signature" | "quoted_reply" | "reply_chain" | "whitespace" | "encoding";
    text: string;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderEmailPreview(headers: Record<string, string>, body: string, batesPrefix: string, index: number): string {
    const bates = `${batesPrefix}-${String(index).padStart(4, "0")}`;
    const { cleaned } = cleanBody(body);

    return `
<div style="font-family: Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #fff; color: #111; padding: 40px; border: 1px solid #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="color: #CC0000; font-weight: bold; font-size: 14px; margin-bottom: 12px;">${escapeHtml(bates)}</div>
    <table style="width: 100%; border-collapse: collapse; background: #F0F0F0; border: 0.5px solid #CCC; margin-bottom: 16px;">
        ${Object.entries(headers).map(([key, val]) => `
        <tr>
            <td style="font-weight: bold; font-size: 11px; padding: 4px 8px; border: 0.25px solid #DDD; width: 80px; vertical-align: top;">${escapeHtml(key)}:</td>
            <td style="font-size: 11px; padding: 4px 8px; border: 0.25px solid #DDD;">${escapeHtml(val)}</td>
        </tr>`).join("")}
    </table>
    <div style="font-size: 11px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(cleaned)}</div>
    <div style="margin-top: 24px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 9px; color: #888;">
        ${escapeHtml(bates)} | Preview render | Chain of custody preserved
    </div>
</div>`;
}

function renderTextPreview(messages: Array<{
    text: string; is_from_me: number; date_local: string;
    contact_name: string; contact_phone: string;
}>): string {
    const bubbles = messages.map(m => {
        const isMe = m.is_from_me === 1;
        const align = isMe ? "flex-end" : "flex-start";
        const bg = isMe ? "#007AFF" : "#E9E9EB";
        const color = isMe ? "#fff" : "#000";
        const label = isMe ? "You" : (m.contact_name || m.contact_phone || "Unknown");

        return `
        <div style="display: flex; flex-direction: column; align-items: ${align}; margin-bottom: 8px;">
            <div style="font-size: 9px; color: #888; margin-bottom: 2px;">${escapeHtml(label)} — ${escapeHtml(m.date_local || "")}</div>
            <div style="background: ${bg}; color: ${color}; padding: 8px 14px; border-radius: 18px; max-width: 70%; font-size: 12px; line-height: 1.4;">
                ${escapeHtml(m.text || "(no text)")}
            </div>
        </div>`;
    }).join("");

    const header = messages.length > 0
        ? `Messages — ${messages[0].contact_name || messages[0].contact_phone || "Unknown"}`
        : "Messages";

    return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', Helvetica, sans-serif; max-width: 420px; margin: 0 auto; background: #fff; color: #111; padding: 24px; border: 1px solid #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="font-weight: 600; font-size: 14px; text-align: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
        ${escapeHtml(header)}
    </div>
    ${bubbles}
    <div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 9px; color: #888; text-align: center;">
        Preview render | Original data from iMessage database
    </div>
</div>`;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "email";
    const id = searchParams.get("id") || "";
    const section = searchParams.get("section") || "";

    try {
        if (type === "email") {
            // Try to find by filename in section RAW_EML
            if (section && id) {
                const rawEmlDir = path.join(EVIDENCE_DIR, section, "RAW_EML");
                const walk = (dir: string): string[] => {
                    const results: string[] = [];
                    try {
                        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                            const full = path.join(dir, entry.name);
                            if (entry.isDirectory()) results.push(...walk(full));
                            else if (entry.name === id || entry.name.toLowerCase().endsWith(".eml")) results.push(full);
                        }
                    } catch { /* skip */ }
                    return results;
                };

                // Find specific file or by Message-ID
                const emlFiles = walk(rawEmlDir);
                let targetFile = emlFiles.find(f => path.basename(f) === id);
                if (!targetFile) {
                    // Search by reading headers
                    for (const ef of emlFiles) {
                        try {
                            const raw = fs.readFileSync(ef, "utf-8").slice(0, 4000);
                            if (raw.includes(id)) {
                                targetFile = ef;
                                break;
                            }
                        } catch { continue; }
                    }
                }

                if (targetFile) {
                    const raw = fs.readFileSync(targetFile, "utf-8");
                    const headerEnd = raw.indexOf("\n\n");
                    const headerBlock = headerEnd > 0 ? raw.slice(0, headerEnd) : raw.slice(0, 4000);
                    const body = headerEnd > 0 ? raw.slice(headerEnd + 2) : "";

                    const getHeader = (name: string): string => {
                        const re = new RegExp(`^${name}:\\s*(.+?)(?=\\n\\S|\\n\\n|$)`, "mis");
                        const m = headerBlock.match(re);
                        return m ? m[1].replace(/\s+/g, " ").trim() : "";
                    };

                    const headers = {
                        From: getHeader("From"),
                        To: getHeader("To"),
                        Date: getHeader("Date"),
                        Subject: getHeader("Subject"),
                        "Message-ID": getHeader("Message-ID"),
                    };

                    const cc = getHeader("Cc");
                    if (cc) (headers as Record<string, string>)["CC"] = cc;

                    const html = renderEmailPreview(headers, body, "PREVIEW", 1);
                    const { issues } = cleanBody(body);

                    return NextResponse.json({ html, issues, type: "email", id });
                }
            }

            // Fallback: try indexed DB
            try {
                const db = getCommDb();
                const row = db.prepare(
                    `SELECT rfc822_id, from_addr, to_addr, cc_addr, subject, date_sent, body FROM emails WHERE rfc822_id = ?`
                ).get(id) as { rfc822_id: string; from_addr: string; to_addr: string; cc_addr: string; subject: string; date_sent: string; body: string } | undefined;

                if (row) {
                    const headers: Record<string, string> = {
                        From: row.from_addr || "",
                        To: row.to_addr || "",
                        Subject: row.subject || "",
                        Date: row.date_sent || "",
                        "Message-ID": row.rfc822_id || "",
                    };
                    if (row.cc_addr) headers["CC"] = row.cc_addr;
                    const html = renderEmailPreview(headers, row.body || "", "PREVIEW", 1);
                    const { issues } = cleanBody(row.body || "");
                    return NextResponse.json({ html, issues, type: "email", id });
                }
            } catch { /* skip */ }

            return NextResponse.json({ error: "Email not found" }, { status: 404 });

        } else if (type === "text") {
            try {
                const db = getImessageDb();

                // Get a range of messages around the target
                const target = db.prepare(
                    `SELECT rowid, contact_name, contact_phone, date_utc FROM messages WHERE guid = ? OR rowid = ?`
                ).get(id, parseInt(id) || 0) as { rowid: number; contact_name: string; contact_phone: string; date_utc: string } | undefined;

                if (!target) {
                    return NextResponse.json({ error: "Message not found" }, { status: 404 });
                }

                // Get surrounding messages in the same conversation (±20 messages)
                const messages = db.prepare(`
                    SELECT rowid, contact_name, contact_phone, date_local, is_from_me, text, service, guid
                    FROM messages
                    WHERE contact_phone = ?
                    AND rowid BETWEEN ? AND ?
                    ORDER BY date_utc ASC
                `).all(target.contact_phone, target.rowid - 20, target.rowid + 20) as Array<{
                    rowid: number; contact_name: string; contact_phone: string;
                    date_local: string; is_from_me: number; text: string;
                    service: string; guid: string;
                }>;

                const html = renderTextPreview(messages);
                return NextResponse.json({ html, issues: [], type: "text", id, messageCount: messages.length });
            } catch (e) {
                console.error("Text preview error:", e);
                return NextResponse.json({ error: "Failed to preview text message" }, { status: 500 });
            }
        }

        return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
    } catch (error) {
        console.error("Preview error:", error);
        return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
    }
}
