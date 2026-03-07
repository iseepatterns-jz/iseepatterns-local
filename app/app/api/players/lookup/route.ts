import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "data", "players.db");

function getDb() {
    return new Database(DB_PATH, { readonly: true });
}

/** GET /api/players/lookup?email=...&phone=... — cross-reference lookup */
export async function GET(req: NextRequest) {
    try {
        const email = req.nextUrl.searchParams.get("email")?.toLowerCase().trim() || "";
        const phone = req.nextUrl.searchParams.get("phone")?.trim() || "";
        const name = req.nextUrl.searchParams.get("name")?.trim() || "";

        if (!email && !phone && !name) {
            return NextResponse.json(
                { error: "Provide email, phone, or name parameter" },
                { status: 400 }
            );
        }

        const db = getDb();
        let player = null;

        // 1. Try email match (most precise)
        if (email) {
            const rows = db
                .prepare(
                    `SELECT id, slug, display_name, title, company, location,
                    profile_type, linkedin_url, email_addresses, phone_numbers
                    FROM players WHERE email_addresses LIKE ?`
                )
                .all(`%${email}%`);

            if (rows.length > 0) {
                player = rows[0];
            }
        }

        // 2. Try phone match
        if (!player && phone) {
            // Normalize phone — strip everything except digits and +
            const normalized = phone.replace(/[^\d+]/g, "");
            const rows = db
                .prepare(
                    `SELECT id, slug, display_name, title, company, location,
                    profile_type, linkedin_url, email_addresses, phone_numbers
                    FROM players WHERE phone_numbers LIKE ?`
                )
                .all(`%${normalized}%`);

            if (rows.length > 0) {
                player = rows[0];
            }
        }

        // 3. Try name match (fuzzy)
        if (!player && name) {
            const rows = db
                .prepare(
                    `SELECT id, slug, display_name, title, company, location,
                    profile_type, linkedin_url, email_addresses, phone_numbers
                    FROM players WHERE display_name LIKE ? OR aliases LIKE ?`
                )
                .all(`%${name}%`, `%${name}%`);

            if (rows.length > 0) {
                player = rows[0];
            }
        }

        db.close();

        if (player) {
            return NextResponse.json({ match: true, player });
        }

        return NextResponse.json({ match: false, player: null });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Player lookup API error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
