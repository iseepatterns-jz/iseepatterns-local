import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";

/**
 * GET /api/workbench/cleaning?id=MSG_ID&type=email
 * Returns cleaning overrides for an evidence item.
 *
 * POST /api/workbench/cleaning
 * Creates a new cleaning override.
 */

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    const type = searchParams.get("type") || "email";

    try {
        const db = getWorkbenchDb();

        const overrides = db.prepare(`
            SELECT * FROM cleaning_overrides
            WHERE evidence_id = ? AND evidence_type = ? AND superseded_at IS NULL
            ORDER BY created_at DESC
        `).all(id, type);

        const history = db.prepare(`
            SELECT * FROM cleaning_overrides
            WHERE evidence_id = ? AND evidence_type = ? AND superseded_at IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 20
        `).all(id, type);

        return NextResponse.json({ overrides, history });
    } catch (error) {
        console.error("Get cleaning error:", error);
        return NextResponse.json({ error: "Failed to get cleaning rules" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { evidenceId, evidenceType, ruleType, params, reason } = body;

        if (!evidenceId || !evidenceType || !ruleType || !params) {
            return NextResponse.json(
                { error: "Missing required fields: evidenceId, evidenceType, ruleType, params" },
                { status: 400 }
            );
        }

        const db = getWorkbenchDb();

        // Supersede existing active rules of the same type
        const existing = db.prepare(`
            SELECT id, version FROM cleaning_overrides
            WHERE evidence_id = ? AND evidence_type = ? AND rule_type = ? AND superseded_at IS NULL
        `).all(evidenceId, evidenceType, ruleType) as Array<{ id: number; version: number }>;

        const newVersion = existing.length > 0
            ? Math.max(...existing.map(e => e.version)) + 1
            : 1;

        if (existing.length > 0) {
            db.prepare(`
                UPDATE cleaning_overrides
                SET superseded_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                WHERE evidence_id = ? AND evidence_type = ? AND rule_type = ? AND superseded_at IS NULL
            `).run(evidenceId, evidenceType, ruleType);
        }

        // Insert new rule
        const result = db.prepare(`
            INSERT INTO cleaning_overrides (evidence_id, evidence_type, rule_type, params, reason, version)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(evidenceId, evidenceType, ruleType, JSON.stringify(params), reason || null, newVersion);

        // Audit log
        db.prepare(`
            INSERT INTO workbench_audit (action, target_type, target_id, details)
            VALUES (?, ?, ?, ?)
        `).run(
            "cleaning_override",
            evidenceType,
            evidenceId,
            JSON.stringify({ ruleType, params, reason, version: newVersion })
        );

        return NextResponse.json({
            success: true,
            overrideId: result.lastInsertRowid,
            version: newVersion,
        });
    } catch (error) {
        console.error("Create cleaning override error:", error);
        return NextResponse.json(
            { error: "Failed to create cleaning override" },
            { status: 500 }
        );
    }
}
