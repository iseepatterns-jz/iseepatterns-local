import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb, getCommDb, EVIDENCE_DIR } from "@/lib/db";
import { spawnSync } from "child_process";
import path from "path";

/**
 * POST /api/workbench/assign
 * Assigns an evidence item to an exhibit section.
 *
 * Body: { evidenceId, evidenceType, targetSection, notes? }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { evidenceId, evidenceType, targetSection, notes } = body;

        if (!evidenceId || !evidenceType || !targetSection) {
            return NextResponse.json(
                { error: "Missing required fields: evidenceId, evidenceType, targetSection" },
                { status: 400 }
            );
        }

        const db = getWorkbenchDb();

        // 1. If it's an email, extract the physical .eml file
        if (evidenceType === "email") {
            const commDb = getCommDb();
            const emailRow = commDb.prepare(`
                SELECT zip_path, source_file FROM messages WHERE msg_id = ?
            `).get(evidenceId) as { zip_path: string, source_file: string } | undefined;

            if (emailRow && emailRow.zip_path && emailRow.source_file) {
                const targetPath = path.join(EVIDENCE_DIR, targetSection, "RAW_EML", `${evidenceId.replace(/[^a-zA-Z0-9.\-_@]/g, "_")}.eml`);

                // Spawn the extraction script
                const extractionCommand = JSON.stringify([{
                    msg_id: evidenceId,
                    zip_path: emailRow.zip_path,
                    mbox_name: emailRow.source_file,
                    target_path: targetPath
                }]);

                const result = spawnSync("python3", [
                    path.join(process.cwd(), "..", "extract_emls.py")
                ], {
                    input: extractionCommand,
                    encoding: "utf-8"
                });

                if (result.error || (result.status !== 0 && result.status !== null)) {
                    console.error("Extraction failed:", result.stderr || result.error);
                } else {
                    try {
                        const parsedResult = JSON.parse(result.stdout);
                        console.log("Extraction result:", parsedResult);
                    } catch (e) { /* ignore */ }
                }
            } else {
                console.warn(`Could not find zip_path or source_file for email ${evidenceId}`);
            }
        }

        // Insert or update assignment
        const stmt = db.prepare(`
            INSERT INTO evidence_assignments (evidence_id, evidence_type, target_section, notes)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(evidence_id, evidence_type, target_section)
            DO UPDATE SET notes = excluded.notes, assigned_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        `);
        const result = stmt.run(evidenceId, evidenceType, targetSection, notes || null);

        // Audit log
        db.prepare(`
            INSERT INTO workbench_audit (action, target_type, target_id, details)
            VALUES (?, ?, ?, ?)
        `).run(
            "assign",
            evidenceType,
            evidenceId,
            JSON.stringify({ targetSection, notes })
        );

        return NextResponse.json({
            success: true,
            assignmentId: result.lastInsertRowid,
            message: `Assigned ${evidenceType} to ${targetSection}`,
        });
    } catch (error) {
        console.error("Assignment error:", error);
        return NextResponse.json(
            { error: "Failed to assign evidence" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/workbench/assign?section=17_RECEIVERSHIP_FRAUD
 * Returns all assignments for a section.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    try {
        const db = getWorkbenchDb();

        let rows;
        if (section) {
            rows = db.prepare(
                `SELECT * FROM evidence_assignments WHERE target_section = ? ORDER BY assigned_at DESC`
            ).all(section);
        } else {
            rows = db.prepare(
                `SELECT * FROM evidence_assignments ORDER BY assigned_at DESC LIMIT 200`
            ).all();
        }

        return NextResponse.json({ assignments: rows });
    } catch (error) {
        console.error("Get assignments error:", error);
        return NextResponse.json(
            { error: "Failed to get assignments" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/workbench/assign
 * Remove an evidence assignment.
 *
 * Body: { evidenceId, evidenceType, targetSection }
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { evidenceId, evidenceType, targetSection } = body;

        const db = getWorkbenchDb();

        db.prepare(
            `DELETE FROM evidence_assignments WHERE evidence_id = ? AND evidence_type = ? AND target_section = ?`
        ).run(evidenceId, evidenceType, targetSection);

        db.prepare(`
            INSERT INTO workbench_audit (action, target_type, target_id, details)
            VALUES (?, ?, ?, ?)
        `).run(
            "unassign",
            evidenceType,
            evidenceId,
            JSON.stringify({ targetSection })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete assignment error:", error);
        return NextResponse.json(
            { error: "Failed to delete assignment" },
            { status: 500 }
        );
    }
}
