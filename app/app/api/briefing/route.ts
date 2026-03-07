import { NextResponse } from "next/server";
import { getCaseCornerDb, getCommDb } from "@/lib/db";
import Database from "better-sqlite3";
import path from "path";

/* ─── Briefing API ───
   Returns the complete case briefing data for the presentation.
   Pulls from claims/agencies (workbench.db via case_corner schema)
   and players (players.db).
*/

function getPlayersDb(): Database.Database {
    const dbPath = process.env.VAULT_ROOT
        ? path.join(process.env.VAULT_ROOT, "db", "players.db")
        : path.join(
            "/Volumes/batdrivetb5/ANTIGRAVITY_LOCKER/_2026-02-21_iseepatterns",
            "data",
            "players.db"
        );
    return new Database(dbPath, { readonly: true });
}

export async function GET() {
    try {
        const ccDb = getCaseCornerDb();

        // ── Claims ──
        const claims = ccDb
            .prepare(
                `SELECT id, slug, title, category, severity, legal_elements, description, sort_order
                 FROM claims ORDER BY sort_order`
            )
            .all() as Array<{
                id: number;
                slug: string;
                title: string;
                category: string;
                severity: string;
                legal_elements: string;
                description: string;
                sort_order: number;
            }>;

        // ── Claim players ──
        let claimPlayers: Array<{
            claim_id: number;
            player_slug: string;
            player_name: string;
            role: string;
            notes: string;
        }> = [];
        try {
            claimPlayers = ccDb
                .prepare(
                    `SELECT cp.claim_id, cp.player_slug, cp.player_name, cp.role, cp.notes
                     FROM claim_players cp ORDER BY cp.claim_id`
                )
                .all() as typeof claimPlayers;
        } catch { /* table may be empty */ }

        // ── Claim evidence ──
        let claimEvidence: Array<{
            claim_id: number;
            evidence_id: string;
            evidence_type: string;
            relevance: string;
        }> = [];
        try {
            claimEvidence = ccDb
                .prepare(
                    `SELECT ce.claim_id, ce.evidence_id, ce.evidence_type, ce.relevance
                     FROM claim_evidence ce ORDER BY ce.claim_id`
                )
                .all() as typeof claimEvidence;
        } catch { /* table may be empty */ }

        // ── Agency submissions ──
        const agencies = ccDb
            .prepare(
                `SELECT id, slug, title, agency_type, submission_method, contact_info, status, sort_order
                 FROM agency_submissions ORDER BY sort_order`
            )
            .all() as Array<{
                id: number;
                slug: string;
                title: string;
                agency_type: string;
                submission_method: string;
                contact_info: string;
                status: string;
                sort_order: number;
            }>;

        // ── Players (from players.db) with avatars ──
        const fs = require("fs");
        const LOCKER_BASE = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/LINKED_IN_PROFILE_LOCKER";
        const IS_LAMBDA = !!process.env.VAULT_ROOT;

        let rawPlayers: Array<{
            id: number;
            slug: string;
            display_name: string;
            title: string;
            company: string;
            location: string;
            profile_type: string;
            skills: string;
            linkedin_url: string;
            aliases: string;
            email_addresses: string;
            phone_numbers: string;
            notes: string;
            summary: string;
        }> = [];
        try {
            const pDb = getPlayersDb();
            rawPlayers = pDb
                .prepare(
                    `SELECT id, slug, display_name, title, company, location, profile_type, skills, linkedin_url, aliases, email_addresses, phone_numbers, notes, summary
                     FROM players ORDER BY display_name`
                )
                .all() as typeof rawPlayers;
        } catch (e) {
            console.warn("Could not load players:", e);
        }

        // Add avatars from LINKED_IN_PROFILE_LOCKER (local only — not available on Lambda)
        const players = rawPlayers.map((row) => {
            let avatar: string | null = null;
            if (!IS_LAMBDA) {
                try {
                    const playerDir = path.join(LOCKER_BASE, row.slug);
                    if (fs.existsSync(playerDir)) {
                        const files = fs.readdirSync(playerDir);
                        let imgPath = files.find((f: string) => /\.(jpe?g|png)$/i.test(f));
                        if (!imgPath && fs.existsSync(path.join(playerDir, "profile-pic"))) {
                            const subFiles = fs.readdirSync(path.join(playerDir, "profile-pic"));
                            const subImg = subFiles.find((f: string) => /\.(jpe?g|png)$/i.test(f));
                            if (subImg) imgPath = path.join("profile-pic", subImg);
                        }
                        if (imgPath) {
                            const fullPath = path.join(playerDir, imgPath);
                            const buffer = fs.readFileSync(fullPath);
                            const mime = imgPath.endsWith(".png") ? "image/png" : "image/jpeg";
                            avatar = `data:${mime};base64,${buffer.toString("base64")}`;
                        }
                    }
                } catch { /* ignore avatar errors */ }
            }
            return { ...row, avatar };
        });

        // ── Stats ──
        let emailCount = 0;
        let messageCount = 0;
        let cocCount = 0;
        try {
            const commDb = getCommDb();
            emailCount = (commDb.prepare("SELECT COUNT(*) as c FROM messages").get() as { c: number })?.c || 0;
        } catch { /* ignore */ }
        try {
            const commDb = getCommDb();
            messageCount = (commDb.prepare("SELECT COUNT(*) as c FROM imessages").get() as { c: number })?.c || 0;
        } catch { /* ignore */ }

        // ── Build enriched claims ──
        const enrichedClaims = claims.map((c) => ({
            ...c,
            legal_elements: (() => { try { return JSON.parse(c.legal_elements || "[]"); } catch { return []; } })(),
            players: claimPlayers.filter((p) => p.claim_id === c.id),
            evidence: claimEvidence.filter((e) => e.claim_id === c.id),
        }));

        return NextResponse.json({
            case: {
                caption: "Zangrilli v. Guariglia",
                caseId: "RC-2026",
                client: "rowboat-creative",
                date: new Date().toISOString().split("T")[0],
            },
            claims: enrichedClaims,
            agencies,
            players,
            stats: {
                emails: emailCount,
                messages: messageCount,
                cocRecords: cocCount,
                claims: claims.length,
                agencies: agencies.length,
                players: players.length,
            },
        });
    } catch (error) {
        console.error("Briefing API error:", error);
        return NextResponse.json(
            { error: "Failed to load briefing data" },
            { status: 500 }
        );
    }
}
