import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * GET /api/timeline?category=...&severity=...&q=...
 * Returns timeline events from the database.
 */
export async function GET(req: NextRequest) {
    try {
        const db = getWorkbenchDb();

        // Ensure timeline schema is applied
        const PROJECT_ROOT = process.env.VAULT_ROOT ||
            "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data";
        const schemaPath = path.join(PROJECT_ROOT, "schemas", "timeline.sql");
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, "utf-8");
            db.exec(schema);
        }

        const url = req.nextUrl;
        const category = url.searchParams.get("category") || "";
        const severity = url.searchParams.get("severity") || "";
        const q = url.searchParams.get("q") || "";

        let whereClause = "WHERE 1=1";
        const params: string[] = [];

        if (category) {
            whereClause += " AND category = ?";
            params.push(category);
        }
        if (severity) {
            whereClause += " AND severity = ?";
            params.push(severity);
        }
        if (q) {
            whereClause += " AND (title LIKE ? OR description LIKE ?)";
            params.push(`%${q}%`, `%${q}%`);
        }

        const events = db
            .prepare(
                `SELECT event_id, date, date_label, title, description, category, severity,
                        claims, sources, lg_involved, jz_involved, created_at
                 FROM timeline_events
                 ${whereClause}
                 ORDER BY date ASC`
            )
            .all(...params);

        // Parse JSON fields
        const parsed = (events as Record<string, unknown>[]).map((e) => ({
            id: e.event_id,
            date: e.date,
            dateLabel: e.date_label,
            title: e.title,
            description: e.description,
            category: e.category,
            severity: e.severity,
            claims: e.claims ? JSON.parse(e.claims as string) : [],
            sources: e.sources ? JSON.parse(e.sources as string) : [],
            lg: !!(e.lg_involved),
            jz: !!(e.jz_involved),
        }));

        return NextResponse.json({ events: parsed, total: parsed.length });
    } catch (error) {
        console.error("Timeline API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch timeline" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/timeline
 * Create a new timeline event.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventId, date, dateLabel, title, description, category, severity, claims, sources, lg, jz } = body;

        if (!eventId || !date || !title || !description || !category || !severity) {
            return NextResponse.json(
                { error: "Missing required fields: eventId, date, title, description, category, severity" },
                { status: 400 }
            );
        }

        const db = getWorkbenchDb();

        // Ensure schema
        const PROJECT_ROOT = process.env.VAULT_ROOT ||
            "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data";
        const schemaPath = path.join(PROJECT_ROOT, "schemas", "timeline.sql");
        if (fs.existsSync(schemaPath)) {
            db.exec(fs.readFileSync(schemaPath, "utf-8"));
        }

        const stmt = db.prepare(
            `INSERT INTO timeline_events (event_id, date, date_label, title, description, category, severity, claims, sources, lg_involved, jz_involved)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        stmt.run(
            eventId,
            date,
            dateLabel || null,
            title,
            description,
            category,
            severity,
            claims ? JSON.stringify(claims) : null,
            sources ? JSON.stringify(sources) : null,
            lg ? 1 : 0,
            jz ? 1 : 0
        );

        return NextResponse.json({ success: true, eventId });
    } catch (error) {
        console.error("Timeline POST error:", error);
        return NextResponse.json(
            { error: "Failed to create timeline event" },
            { status: 500 }
        );
    }
}
