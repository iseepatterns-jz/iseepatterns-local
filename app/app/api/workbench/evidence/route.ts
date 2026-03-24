import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getCommDb, getImessageDb, EVIDENCE_DIR } from "@/lib/db";

/**
 * GET /api/workbench/evidence?section=17_RECEIVERSHIP_FRAUD&type=email&page=1&limit=50&q=search
 * Returns paginated evidence items from a section.
 */

interface EvidenceItem {
    id: string;
    type: "email" | "text" | "transcript";
    title: string;
    subtitle: string;
    date: string;
    preview: string;
    source: string;
    batesNumber?: string;
}

function parseEmlHeader(filePath: string): {
    from: string; to: string; subject: string; date: string; messageId: string;
} | null {
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const headerEnd = raw.indexOf("\n\n");
        const headerBlock = headerEnd > 0 ? raw.slice(0, headerEnd) : raw.slice(0, 4000);

        const get = (name: string): string => {
            const re = new RegExp(`^${name}:\\s*(.+?)(?=\\n\\S|\\n\\n|$)`, "mis");
            const m = headerBlock.match(re);
            return m ? m[1].replace(/\\s+/g, " ").trim() : "";
        };

        return {
            from: get("From"),
            to: get("To"),
            subject: get("Subject"),
            date: get("Date"),
            messageId: get("Message-ID"),
        };
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") || "";
    const type = searchParams.get("type") || "email";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const query = searchParams.get("q") || "";

    try {
        const items: EvidenceItem[] = [];

        if (type === "email") {
            // 1) Get assigned evidence IDs for this section from workbench.db
            const { getWorkbenchDb } = await import("@/lib/db");
            const wbDb = getWorkbenchDb();
            
            let assignedIds: string[] = [];
            if (section) {
                const rows = wbDb.prepare(
                    `SELECT evidence_id FROM evidence_assignments 
                     WHERE evidence_type = 'email' AND target_section = ?
                     ORDER BY assigned_at DESC`
                ).all(section) as { evidence_id: string }[];
                assignedIds = rows.map(r => r.evidence_id);
            }

            if (assignedIds.length === 0) {
                // No assignments → no items (don't fall through to dump all emails)
            } else {
                // 2) Look up email metadata from mbox_metadata.db
                const db = getCommDb();
                const ph = assignedIds.map(() => "?").join(",");
                let sql = `SELECT rfc822_id as msg_id, from_addr as sender, subject, date_sent as date, mbox_source as source_file
                           FROM emails WHERE rfc822_id IN (${ph})`;
                const params: string[] = [...assignedIds];

                if (query) {
                    sql = `SELECT rfc822_id as msg_id, from_addr as sender, subject, date_sent as date, mbox_source as source_file
                           FROM emails WHERE rfc822_id IN (${ph}) AND (subject LIKE ? OR from_addr LIKE ?)`;
                    params.push(`%${query}%`, `%${query}%`);
                }

                sql += ` ORDER BY date_sent DESC`;

                const rows = db.prepare(sql).all(...params) as Array<{
                    msg_id: string; sender: string; subject: string; date: string; source_file: string;
                }>;

                for (const row of rows) {
                    items.push({
                        id: row.msg_id,
                        type: "email",
                        title: row.subject || "(no subject)",
                        subtitle: row.sender || "Unknown",
                        date: row.date || "",
                        preview: "",
                        source: row.source_file || "",
                    });
                }
            }

            // 3) Also add any physical .eml files not yet in the list
            const rawEmlDir = path.join(EVIDENCE_DIR, section, "RAW_EML");
            if (fs.existsSync(rawEmlDir)) {
                const existingIds = new Set(items.map(i => i.id));
                const walk = (dir: string): string[] => {
                    const results: string[] = [];
                    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                        const full = path.join(dir, entry.name);
                        if (entry.isDirectory()) results.push(...walk(full));
                        else if (entry.name.toLowerCase().endsWith(".eml")) results.push(full);
                    }
                    return results;
                };

                for (const emlFile of walk(rawEmlDir).sort()) {
                    const parsed = parseEmlHeader(emlFile);
                    if (!parsed) continue;
                    const id = parsed.messageId || path.basename(emlFile);
                    if (existingIds.has(id)) continue; // already in list from DB

                    if (query) {
                        const haystack = `${parsed.subject} ${parsed.from} ${parsed.date}`.toLowerCase();
                        if (!haystack.includes(query.toLowerCase())) continue;
                    }

                    items.push({
                        id,
                        type: "email",
                        title: parsed.subject || "(no subject)",
                        subtitle: parsed.from || "Unknown",
                        date: parsed.date || "",
                        preview: "",
                        source: path.basename(emlFile),
                    });
                }
            }
        } else if (type === "text") {
            try {
                const db = getImessageDb();
                let sql = `SELECT rowid, contact_name, contact_phone, date_local, is_from_me, text, service, guid
                           FROM messages`;
                const params: string[] = [];
                if (query) {
                    sql += ` WHERE text LIKE ? OR contact_name LIKE ?`;
                    params.push(`%${query}%`, `%${query}%`);
                }
                sql += ` ORDER BY date_utc DESC LIMIT ? OFFSET ?`;
                params.push(String(limit), String((page - 1) * limit));

                const rows = db.prepare(sql).all(...params) as Array<{
                    rowid: number; contact_name: string; contact_phone: string;
                    date_local: string; is_from_me: number; text: string;
                    service: string; guid: string;
                }>;

                for (const row of rows) {
                    items.push({
                        id: row.guid || String(row.rowid),
                        type: "text",
                        title: row.text ? row.text.slice(0, 120) : "(no text)",
                        subtitle: row.is_from_me ? `You → ${row.contact_name}` : `${row.contact_name} → You`,
                        date: row.date_local || "",
                        preview: row.text || "",
                        source: `${row.service} — ${row.contact_phone}`,
                    });
                }
            } catch (e) {
                console.error("iMessage DB error:", e);
            }
        } else if (type === "transcript") {
            const transcriptDir = path.join(EVIDENCE_DIR, "11_COURT_TRANSCRIPTS");
            if (fs.existsSync(transcriptDir)) {
                const files = fs.readdirSync(transcriptDir)
                    .filter(f => f.endsWith(".txt") || f.endsWith(".pdf"))
                    .sort();

                for (const file of files) {
                    const filePath = path.join(transcriptDir, file);
                    let preview = "";
                    if (file.endsWith(".txt")) {
                        try {
                            preview = fs.readFileSync(filePath, "utf-8").slice(0, 200);
                        } catch { /* skip */ }
                    }

                    if (query && !file.toLowerCase().includes(query.toLowerCase())) continue;

                    items.push({
                        id: file,
                        type: "transcript",
                        title: file.replace(/\.(txt|pdf)$/, ""),
                        subtitle: "Court Transcript",
                        date: "",
                        preview,
                        source: file,
                    });
                }
            }
        }

        // Paginate
        const total = items.length;
        const paginated = type === "email" && section
            ? items.slice((page - 1) * limit, page * limit)
            : items; // text and transcript already paginated via SQL

        return NextResponse.json({
            items: paginated,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            section,
            type,
        });
    } catch (error) {
        console.error("Evidence API error:", error);
        return NextResponse.json(
            { error: "Failed to load evidence" },
            { status: 500 }
        );
    }
}
