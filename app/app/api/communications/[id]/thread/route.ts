import { NextRequest, NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Strip Re:/Fwd:/Fw: prefixes to get the base subject for threading */
function baseSubject(subject: string | null): string {
    if (!subject) return "";
    return subject
        .replace(/^(\s*(Re|Fwd|Fw)\s*:\s*)+/gi, "")
        .trim();
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getCommDb();

        // Get the anchor email
        const anchor = db
            .prepare(
                `SELECT message_id as msg_id, subject, date, sender, account FROM emails WHERE message_id = ?`
            )
            .get(id) as { msg_id: string; subject: string; date: string; sender: string; account: string } | undefined;

        if (!anchor) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        const base = baseSubject(anchor.subject);
        if (!base) {
            return NextResponse.json({
                anchor_msg_id: id,
                base_subject: "",
                thread: [anchor],
                count: 1,
            });
        }

        // Single query: LIKE '%base_subject' catches all Re:/Fwd: prefixes
        const threadMessages = db
            .prepare(
                `SELECT DISTINCT id as row_id, message_id as msg_id, sender, account, subject, date, body,
                        mbox_name as source_file, zip_file as zip_path, client_id, case_id
                 FROM emails
                 WHERE subject LIKE ?
                 ORDER BY date ASC`
            )
            .all(`%${base}`);

        return NextResponse.json({
            anchor_msg_id: id,
            base_subject: base,
            thread: threadMessages,
            count: (threadMessages as unknown[]).length,
        });
    } catch (error) {
        console.error("Thread API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch thread" },
            { status: 500 }
        );
    }
}

