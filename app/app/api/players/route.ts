import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "data", "players.db");

function getDb() {
    return new Database(DB_PATH, { readonly: true });
}

/** GET /api/players — list all players, optional ?q=search&type=person|entity */
export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const q = req.nextUrl.searchParams.get("q") || "";
        const typeFilter = req.nextUrl.searchParams.get("type") || "";

        let sql = `SELECT id, slug, display_name, title, company, location, 
                    profile_type, skills, linkedin_url, aliases, 
                    email_addresses, phone_numbers, notes
                    FROM players WHERE 1=1`;
        const params: string[] = [];

        if (q) {
            sql += ` AND (
                display_name LIKE ? OR 
                title LIKE ? OR 
                company LIKE ? OR 
                skills LIKE ? OR 
                notes LIKE ? OR
                EXISTS (SELECT 1 FROM player_files pf WHERE pf.player_id = players.id AND pf.content_text LIKE ?)
            )`;
            const like = `%${q}%`;
            params.push(like, like, like, like, like, like);
        }

        if (typeFilter) {
            sql += ` AND profile_type = ?`;
            params.push(typeFilter);
        }

        sql += ` ORDER BY CASE profile_type WHEN 'person' THEN 0 WHEN 'entity' THEN 1 ELSE 2 END, display_name`;

        const rows = db.prepare(sql).all(...params) as any[];
        db.close();

        // ─ Manual Overrides & Image Discovery ─
        const fs = require('fs');
        const LOCKER_BASE = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/LINKED_IN_PROFILE_LOCKER";
        const PHONE_OVERRIDES: Record<string, string[]> = {
            "lucas-guariglia-5258ab19": ["+18478280944"],
            "joseph-zangrilli-248a52195": ["+17736109104"],
            "ryan-hayes-4a62a627": ["+13127254069"]
        };

        const URL_OVERRIDES: Record<string, string> = {
            "54319": "https://www.linkedin.com/groups/54319/",
            "45173": "https://www.linkedin.com/groups/54319/"
        };

        const NAME_OVERRIDES: Record<string, string> = {
            "54319": "BNI",
            "45173": "BNI",
            "attorneythomaschandler": "Holland & Hart LLP",
            "holland-hart-llp": "Holland & Hart LLP",
            "aguariglia714": "Adrienne Guariglia"
        };

        const SLUG_MAPPINGS: Record<string, string> = {
            "45173": "54319"
        };

        // Create a list of all players (DB + Injected)
        const allPlayers = [...rows];
        const adrienneSlug = "aguariglia714";
        if (!allPlayers.find(r => r.slug === adrienneSlug)) {
            const matchesSearch = !q || "Adrienne Guariglia".toLowerCase().includes(q.toLowerCase()) || adrienneSlug.includes(q.toLowerCase());
            const matchesType = !typeFilter || typeFilter === "person";
            if (matchesSearch && matchesType) {
                allPlayers.push({
                    id: 999999,
                    slug: adrienneSlug,
                    display_name: "Adrienne Guariglia",
                    title: "Sister of Lucas Guariglia",
                    company: "RBC Lawyer / Payment Recipient",
                    location: "N/A",
                    profile_type: "person",
                    skills: "",
                    linkedin_url: "",
                    aliases: "",
                    email_addresses: '["aguariglia714@gmail.com"]',
                    phone_numbers: "[]",
                    notes: "LG was using RBC lawyer and RBC payment for aguariglia714 as well"
                });
            }
        }

        const HUB_DB_PATH = path.join(process.cwd(), "..", "data", "evidence_hub.db");
        let hubDb: any = null;
        try {
            hubDb = new Database(HUB_DB_PATH, { readonly: true });
        } catch (e) {
            console.error("Could not open Evidence Hub DB for players integration:", e);
        }

        const processedRows = allPlayers.map(row => {
            // Inject phone numbers if empty
            if (PHONE_OVERRIDES[row.slug] && (!row.phone_numbers || row.phone_numbers === '[]')) {
                row.phone_numbers = JSON.stringify(PHONE_OVERRIDES[row.slug]);
            }

            if (URL_OVERRIDES[row.slug]) {
                row.linkedin_url = URL_OVERRIDES[row.slug];
            }

            if (NAME_OVERRIDES[row.slug]) {
                row.display_name = NAME_OVERRIDES[row.slug];
            }

            // Look for profile picture
            const actualSlug = SLUG_MAPPINGS[row.slug] || row.slug;
            const playerDir = path.join(LOCKER_BASE, actualSlug);
            let avatar = null;
            try {
                if (fs.existsSync(playerDir)) {
                    const files = fs.readdirSync(playerDir);
                    let imgPath = files.find((f: string) => /\.(jpe?g|png)$/i.test(f));

                    if (!imgPath && fs.existsSync(path.join(playerDir, 'profile-pic'))) {
                        const subFiles = fs.readdirSync(path.join(playerDir, 'profile-pic'));
                        const subImg = subFiles.find((f: string) => /\.(jpe?g|png)$/i.test(f));
                        if (subImg) imgPath = path.join('profile-pic', subImg);
                    }

                    if (imgPath) {
                        const fullPath = path.join(playerDir, imgPath);
                        const buffer = fs.readFileSync(fullPath);
                        const mime = imgPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
                        avatar = `data:${mime};base64,${buffer.toString('base64')}`;
                    }
                }
            } catch (e) {
                console.error(`Error looking for avatar for ${row.slug}:`, e);
            }

            // --- Evidence Hub Linkage ---
            let evidence_count = 0;
            if (hubDb) {
                try {
                    // Try to match by display name in Hub entities
                    const hubRow = hubDb.prepare(`
                        SELECT COUNT(pe.participant_id) as count
                        FROM entities e
                        JOIN participant_entities pe ON e.id = pe.entity_id
                        WHERE e.name = ?
                    `).get(row.display_name) as { count: number };
                    if (hubRow) evidence_count = hubRow.count;
                } catch (e) {
                    console.error(`Error fetching hub metrics for ${row.display_name}:`, e);
                }
            }

            return { ...row, avatar, evidence_count };
        });

        if (hubDb) hubDb.close();

        return NextResponse.json({ players: processedRows, total: processedRows.length });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Players API error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
