import { NextRequest, NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";
import { simpleParser, ParsedMail } from "mailparser";

export const dynamic = "force-dynamic";

interface MatchResult {
    confidence: "exact" | "probable" | "none";
    message: Record<string, unknown> | null;
    parsed: {
        messageId: string | null;
        subject: string | null;
        from: string | null;
        date: string | null;
    };
    searchDetails: string;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("eml") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No .eml file provided" }, { status: 400 });
        }

        // Parse the .eml file
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed: ParsedMail = await simpleParser(buffer);

        const messageId = parsed.messageId
            ? parsed.messageId.replace(/^<|>$/g, "")
            : null;
        const subject = parsed.subject || null;
        const fromAddr =
            parsed.from?.value?.[0]?.address || null;
        const dateStr = parsed.date
            ? parsed.date.toISOString()
            : null;

        const db = getCommDb();
        let result: MatchResult;

        // Strategy 1: Exact match by Message-ID
        if (messageId) {
            const row = db
                .prepare(
                    `SELECT msg_id, account, sender, subject, date, source_file, zip_path, client_id, case_id
           FROM messages WHERE msg_id = ? LIMIT 1`
                )
                .get(messageId);

            if (row) {
                result = {
                    confidence: "exact",
                    message: row as Record<string, unknown>,
                    parsed: { messageId, subject, from: fromAddr, date: dateStr },
                    searchDetails: `Matched by Message-ID: ${messageId}`,
                };
                return NextResponse.json(result);
            }

            // Also try with angle brackets
            const rowAngled = db
                .prepare(
                    `SELECT msg_id, account, sender, subject, date, source_file, zip_path, client_id, case_id
           FROM messages WHERE msg_id = ? LIMIT 1`
                )
                .get(`<${messageId}>`);

            if (rowAngled) {
                result = {
                    confidence: "exact",
                    message: rowAngled as Record<string, unknown>,
                    parsed: { messageId, subject, from: fromAddr, date: dateStr },
                    searchDetails: `Matched by Message-ID: <${messageId}>`,
                };
                return NextResponse.json(result);
            }
        }

        // Strategy 2: Fuzzy match by Subject + Sender
        if (subject && fromAddr) {
            const row = db
                .prepare(
                    `SELECT msg_id, account, sender, subject, date, source_file, zip_path, client_id, case_id
           FROM messages
           WHERE subject LIKE ? AND sender LIKE ?
           LIMIT 1`
                )
                .get(`%${subject}%`, `%${fromAddr}%`);

            if (row) {
                result = {
                    confidence: "probable",
                    message: row as Record<string, unknown>,
                    parsed: { messageId, subject, from: fromAddr, date: dateStr },
                    searchDetails: `Matched by Subject + Sender: "${subject}" from ${fromAddr}`,
                };
                return NextResponse.json(result);
            }
        }

        // Strategy 3: Subject-only match
        if (subject) {
            const row = db
                .prepare(
                    `SELECT msg_id, account, sender, subject, date, source_file, zip_path, client_id, case_id
           FROM messages
           WHERE subject LIKE ?
           LIMIT 1`
                )
                .get(`%${subject}%`);

            if (row) {
                result = {
                    confidence: "probable",
                    message: row as Record<string, unknown>,
                    parsed: { messageId, subject, from: fromAddr, date: dateStr },
                    searchDetails: `Matched by Subject only: "${subject}"`,
                };
                return NextResponse.json(result);
            }
        }

        // No match
        result = {
            confidence: "none",
            message: null,
            parsed: { messageId, subject, from: fromAddr, date: dateStr },
            searchDetails: "No matching email found in the index",
        };
        return NextResponse.json(result);
    } catch (error) {
        console.error("Match EML API error:", error);
        return NextResponse.json(
            { error: "Failed to process .eml file" },
            { status: 500 }
        );
    }
}
