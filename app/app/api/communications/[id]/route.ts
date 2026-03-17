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

        console.log(`[API] Fetching email detail for ID: ${id}`);

        let row = db
            .prepare(
                `SELECT id as row_id, rfc822_id as msg_id, account, from_addr as sender, 
                        subject, date_sent as date, body, mbox_source as source_file, zip_source as zip_path,
                        locker_source
                 FROM emails WHERE rfc822_id = ?`
            )
            .get(id);

        // Fallback: search by integer id if not found by rfc822_id
        if (!row && !isNaN(Number(id))) {
            console.log(`[API] Email not found by rfc822_id, trying integer id: ${id}`);
            row = db
                .prepare(
                    `SELECT id as row_id, rfc822_id as msg_id, account, from_addr as sender, 
                            subject, date_sent as date, body, mbox_source as source_file, zip_source as zip_path,
                            locker_source
                     FROM emails WHERE id = ?`
                )
                .get(Number(id));
        }

        if (!row) {
            console.warn(`[API] Email NOT FOUND for ID: ${id}`);
            return NextResponse.json({ error: "Email not found" }, { status: 404 });
        }

        console.log(`[API] Found email: ${(row as any).subject}`);
        return NextResponse.json(row);
    } catch (error) {
        console.error("Message detail API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch message" },
            { status: 500 }
        );
    }
}
