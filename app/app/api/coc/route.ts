import { NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const db = getCommDb();

        let records: unknown[] = [];
        try {
            records = db
                .prepare(
                    `SELECT * FROM chain_of_custody ORDER BY ingested_at DESC LIMIT 50`
                )
                .all();
        } catch {
            records = [];
        }

        return NextResponse.json({ records });
    } catch (error) {
        console.error("CoC API error:", error);
        return NextResponse.json({ records: [], unavailable: true });
    }
}
