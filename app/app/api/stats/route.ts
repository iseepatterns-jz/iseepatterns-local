import { NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const db = getCommDb();

        const totalEmails = db
            .prepare("SELECT COUNT(*) as count FROM messages")
            .get() as { count: number };

        const uniqueSenders = db
            .prepare("SELECT COUNT(DISTINCT sender) as count FROM messages")
            .get() as { count: number };

        const uniqueAccounts = db
            .prepare("SELECT COUNT(DISTINCT account) as count FROM messages")
            .get() as { count: number };

        const dateRange = db
            .prepare(
                "SELECT MIN(date) as earliest, MAX(date) as latest FROM messages WHERE date IS NOT NULL AND date != ''"
            )
            .get() as { earliest: string; latest: string };

        // CoC records — chain_of_custody table is in communications.db from reingest
        let cocCount = 0;
        try {
            const coc = db
                .prepare("SELECT COUNT(*) as count FROM chain_of_custody")
                .get() as { count: number };
            cocCount = coc.count;
        } catch {
            cocCount = 0;
        }

        return NextResponse.json({
            totalEmails: totalEmails.count,
            uniqueSenders: uniqueSenders.count,
            uniqueAccounts: uniqueAccounts.count,
            dateRange: {
                earliest: dateRange.earliest,
                latest: dateRange.latest,
            },
            cocRecords: cocCount,
        });
    } catch (error) {
        console.error("Stats API error:", error);
        // Return fallback stats when email DB is unavailable (e.g., Lambda without mbox_index.db)
        return NextResponse.json({
            totalEmails: 0,
            uniqueSenders: 0,
            uniqueAccounts: 0,
            dateRange: { earliest: null, latest: null },
            cocRecords: 0,
            unavailable: true,
        });
    }
}
