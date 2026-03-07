import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb } from "@/lib/db";

/**
 * GET /api/workbench/descriptions?targetType=section&targetId=17_RECEIVERSHIP_FRAUD
 * Returns the latest description edit for a target.
 *
 * POST /api/workbench/descriptions
 * Saves a new description version.
 */

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType") || "section";
    const targetId = searchParams.get("targetId") || "";

    try {
        const db = getWorkbenchDb();

        const current = db.prepare(`
            SELECT * FROM description_edits
            WHERE target_type = ? AND target_id = ? AND superseded_at IS NULL
            ORDER BY created_at DESC LIMIT 1
        `).get(targetType, targetId);

        const history = db.prepare(`
            SELECT id, version, created_at, created_by
            FROM description_edits
            WHERE target_type = ? AND target_id = ?
            ORDER BY version DESC
            LIMIT 20
        `).all(targetType, targetId);

        return NextResponse.json({ current, history });
    } catch (error) {
        console.error("Get descriptions error:", error);
        return NextResponse.json({ error: "Failed to get descriptions" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetType, targetId, content } = body;

        if (!targetType || !targetId || content === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: targetType, targetId, content" },
                { status: 400 }
            );
        }

        const db = getWorkbenchDb();

        // Get current version
        const existing = db.prepare(`
            SELECT id, version, content FROM description_edits
            WHERE target_type = ? AND target_id = ? AND superseded_at IS NULL
            ORDER BY version DESC LIMIT 1
        `).get(targetType, targetId) as { id: number; version: number; content: string } | undefined;

        const newVersion = existing ? existing.version + 1 : 1;
        const previousContent = existing?.content || null;

        // Supersede current
        if (existing) {
            db.prepare(`
                UPDATE description_edits
                SET superseded_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                WHERE id = ?
            `).run(existing.id);
        }

        // Insert new version
        const result = db.prepare(`
            INSERT INTO description_edits (target_type, target_id, content, version)
            VALUES (?, ?, ?, ?)
        `).run(targetType, targetId, content, newVersion);

        // Audit log
        db.prepare(`
            INSERT INTO workbench_audit (action, target_type, target_id, details)
            VALUES (?, ?, ?, ?)
        `).run(
            "description_edit",
            targetType,
            targetId,
            JSON.stringify({
                version: newVersion,
                previousContentLength: previousContent?.length || 0,
                newContentLength: content.length,
            })
        );

        return NextResponse.json({
            success: true,
            editId: result.lastInsertRowid,
            version: newVersion,
        });
    } catch (error) {
        console.error("Save description error:", error);
        return NextResponse.json(
            { error: "Failed to save description" },
            { status: 500 }
        );
    }
}
