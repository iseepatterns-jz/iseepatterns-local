import { NextRequest, NextResponse } from "next/server";
import { getCommDb, getWorkbenchDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * POST /api/correlator/auto-link
 * Scan timeline events and find matching emails by date range and keywords.
 * Returns matches and optionally links them to claim_evidence.
 *
 * Body: { dryRun?: boolean, windowDays?: number }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const dryRun = body.dryRun !== false; // true by default
        const windowDays = body.windowDays || 7;

        const wb = getWorkbenchDb();
        const commDb = getCommDb();

        // Ensure timeline_events table exists
        const PROJECT_ROOT = process.env.VAULT_ROOT ||
            "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data";
        const schemaPath = path.join(PROJECT_ROOT, "schemas", "timeline.sql");
        if (fs.existsSync(schemaPath)) {
            wb.exec(fs.readFileSync(schemaPath, "utf-8"));
        }

        // Fetch all timeline events
        const events = wb.prepare(
            "SELECT id, date, title, description, category, claims FROM timeline_events ORDER BY date"
        ).all() as {
            id: number; date: string; title: string;
            description: string; category: string; claims: string;
        }[];

        const results: {
            eventId: number;
            eventDate: string;
            eventTitle: string;
            matchCount: number;
            topMatches: { msg_id: string; subject: string; sender: string; date: string; score: number }[];
        }[] = [];

        let totalMatches = 0;

        for (const event of events) {
            // Build date window
            const eventDate = new Date(event.date + "T12:00:00Z");
            if (isNaN(eventDate.getTime())) continue;

            const startDate = new Date(eventDate);
            startDate.setDate(startDate.getDate() - windowDays);
            const endDate = new Date(eventDate);
            endDate.setDate(endDate.getDate() + windowDays);

            const startISO = startDate.toISOString().slice(0, 10);
            const endISO = endDate.toISOString().slice(0, 10);

            // Extract keywords from title (ignore common words)
            const stopWords = new Set([
                "the", "a", "an", "is", "to", "of", "and", "in", "for", "on",
                "at", "by", "with", "from", "via", "sends", "forward", "forwards",
                "regarding", "re", "about", "into", "without"
            ]);
            const keywords = event.title
                .replace(/[^a-zA-Z0-9\s@.]/g, " ")
                .split(/\s+/)
                .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
                .slice(0, 6);

            if (keywords.length === 0) continue;

            // Build keyword match scoring query
            // Match by date window + at least one keyword in subject or body
            const keywordConditions = keywords
                .map(() => "(subject LIKE ? OR body LIKE ?)")
                .join(" OR ");

            const params: string[] = [startISO + "%", endISO + "Z"];
            for (const kw of keywords) {
                params.push(`%${kw}%`, `%${kw}%`);
            }

            const matches = commDb.prepare(`
                SELECT id, subject, from_addr, date_sent,
                    (${keywords.map((_, i) => `(CASE WHEN subject LIKE ? THEN 2 ELSE 0 END + CASE WHEN body LIKE ? THEN 1 ELSE 0 END)`).join(" + ")}) as score
                FROM emails
                WHERE date_sent >= ? AND date_sent <= ?
                AND (${keywordConditions})
                ORDER BY score DESC
                LIMIT 10
            `).all(
                // Score params first
                ...keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`]),
                // Date params
                startISO + "%", endISO + "Z",
                // Keyword filter params
                ...keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`])
            ) as { msg_id: string; subject: string; sender: string; date: string; score: number }[];

            if (matches.length > 0) {
                results.push({
                    eventId: event.id,
                    eventDate: event.date,
                    eventTitle: event.title,
                    matchCount: matches.length,
                    topMatches: matches.slice(0, 5),
                });
                totalMatches += matches.length;
            }
        }

        return NextResponse.json({
            success: true,
            dryRun,
            windowDays,
            eventsScanned: events.length,
            eventsWithMatches: results.length,
            totalMatches,
            results,
        });
    } catch (error) {
        console.error("Auto-link error:", error);
        return NextResponse.json(
            { error: "Auto-link failed", detail: String(error) },
            { status: 500 }
        );
    }
}

/**
 * GET /api/correlator/auto-link
 * Quick summary of cross-reference status.
 */
export async function GET() {
    try {
        const wb = getWorkbenchDb();
        const commDb = getCommDb();

        let eventCount = 0;
        try {
            eventCount = (wb.prepare("SELECT COUNT(*) as c FROM timeline_events").get() as { c: number }).c;
        } catch { /* table may not exist */ }

        const emailCount = (commDb.prepare("SELECT COUNT(*) as c FROM emails").get() as { c: number }).c;

        return NextResponse.json({
            timelineEvents: eventCount,
            totalEmails: emailCount,
            status: "ready",
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
