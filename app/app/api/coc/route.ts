import { NextResponse } from "next/server";
import { getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const db = getCommDb();
        console.log("CoC API: got db connection");

        // Attach mbox_index.db to the connection so we can query chain_of_custody
        const INDEX_DB_PATH = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/MBOX_LOCKER/mbox_index.db";
        db.exec(`ATTACH DATABASE '${INDEX_DB_PATH}' AS index_db`);

        let records: unknown[] = [];
        try {
            const stmt = db.prepare(`
        SELECT
          id,
          source_path,
          source_type,
          sha256,
          size_bytes,
          case_id,
          notes,
          ingested_at
        FROM index_db.chain_of_custody
        ORDER BY id ASC
      `);
            records = stmt.all();
            console.log("CoC API: rows returned:", records.length);
        } catch (err) {
            console.error("CoC inner query error:", err);
            records = [];
        }

        return NextResponse.json({ records });
    } catch (error) {
        console.error("CoC API outer error:", error);
        return NextResponse.json({ records: [], unavailable: true });
    }
}
