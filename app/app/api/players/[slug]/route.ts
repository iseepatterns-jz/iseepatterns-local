import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data";
const DB_PATH = path.join(DATA_DIR, "players.db");

function getDb() {
    return new Database(DB_PATH, { readonly: true });
}

/** GET /api/players/[slug] — full profile detail for one player */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    let db;
    try {
        const { slug } = await params;
        db = getDb();

        let player = db
            .prepare(
                `SELECT id, slug, display_name, title, company, location,
                profile_type, skills, summary, linkedin_url, aliases,
                email_addresses, phone_numbers, notes
                FROM players WHERE slug = ?`
            )
            .get(slug) as any;

        // If not in DB, check for hardcoded Adrienne
        if (!player && slug === "aguariglia714") {
            player = {
                id: 999999,
                slug: "aguariglia714",
                display_name: "Adrienne Guariglia",
                title: "Sister of Lucas Guariglia",
                company: "RBC Lawyer / Payment Recipient",
                location: "N/A",
                profile_type: "person",
                summary: "Sister of Lucas Guariglia. RBC records indicate payments and legal services were provided to her using company funds.",
                linkedin_url: "",
                aliases: "",
                email_addresses: '["aguariglia714@gmail.com"]',
                phone_numbers: "[]",
                notes: "LG was using RBC lawyer and RBC payment for aguariglia714 as well"
            };
        }

        if (!player) {
            db.close();
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        // Apply Overrides & Discover Image
        const { processedPlayer, avatar } = handleOverrides(player, slug);

        // --- Evidence Hub Linkage ---
        const HUB_DB_PATH = path.join(DATA_DIR, "evidence_hub.db");
        let evidence_count = 0;
        try {
            const hubDb = new Database(HUB_DB_PATH, { readonly: true });
            const hubRow = hubDb.prepare(`
                SELECT COUNT(pe.participant_id) as count
                FROM entities e
                JOIN participant_entities pe ON e.id = pe.entity_id
                WHERE e.name = ?
            `).get(processedPlayer.display_name) as { count: number };
            if (hubRow) evidence_count = hubRow.count;
            hubDb.close();
        } catch (e) {
            console.error("Evidence Hub detail integration error:", e);
        }

        // Get associated files (only if not dummy Adrienne)
        let files: unknown[] = [];
        if (processedPlayer.id !== 999999) {
            try {
                files = db
                    .prepare(
                        `SELECT id, file_type, file_path, content_text 
                         FROM player_files WHERE player_id = ?`
                    )
                    .all(processedPlayer.id);
            } catch (e) {
                console.error("Error fetching player files:", e);
            }
        }

        db.close();
        return NextResponse.json({ 
            player: { ...processedPlayer, avatar, evidence_count }, 
            files 
        });
    } catch (err: unknown) {
        if (db) try { db.close(); } catch { }
        console.error("Player detail API error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

function handleOverrides(playerObj: any, slug: string) {
    const LOCKER_BASE = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/LINKED_IN_PROFILE_LOCKER";

    const PHONE_OVERRIDES: Record<string, string[]> = {
        "lucas-guariglia-5258ab19": ["+18478280944"],
        "joseph-zangrilli-248a52195": ["+17736109104"],
        "ryan-hayes-4a62a627": ["+13127254069"]
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

    const processed = { ...playerObj };

    if (PHONE_OVERRIDES[slug] && (!processed.phone_numbers || processed.phone_numbers === '[]')) {
        processed.phone_numbers = JSON.stringify(PHONE_OVERRIDES[slug]);
    }

    if (NAME_OVERRIDES[slug]) {
        processed.display_name = NAME_OVERRIDES[slug];
    }

    // Look for profile picture
    const actualSlug = SLUG_MAPPINGS[slug] || slug;
    const playerDir = path.join(LOCKER_BASE, actualSlug);
    let avatar = null;
    try {
        if (fs.existsSync(playerDir)) {
            const children = fs.readdirSync(playerDir);
            let imgPath = children.find((f: string) => /\.(jpe?g|png)$/i.test(f));

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
        console.error("Image discovery error:", e);
    }

    return { processedPlayer: processed, avatar };
}
