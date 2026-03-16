import { NextRequest, NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getCommDb();

        const row = db
            .prepare(
                `SELECT id as row_id, message_id as msg_id, account, sender, subject, date, body,
                thread_id, source_file, source_hash, zip_path,
                byte_offset, client_id, case_id, created_at
         FROM emails WHERE message_id = ?`
            )
            .get(id);

        if (!row) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        return NextResponse.json(row);
    } catch (error) {
        console.error("Message detail API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch message" },
            { status: 500 }
        );
    }
}
