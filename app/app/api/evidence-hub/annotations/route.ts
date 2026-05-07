import { NextRequest, NextResponse } from "next/server";
import { getWorkbenchDb, getEvidenceHubDb } from "@/lib/db";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/**
 * Evidence Annotations API
 * POST — create annotation (highlight, flag, note, tag)
 * GET  — list annotations for an evidence_id, or get provenance chain
 * DELETE — remove annotation by id
 */

// ── Initialize annotations schema ──
function ensureSchema(db: ReturnType<typeof getWorkbenchDb>) {
    const schemaPath = path.join(
        "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1",
        "schemas",
        "evidence_annotations.sql"
    );
    try {
        const sql = fs.readFileSync(schemaPath, "utf-8");
        db.exec(sql);
    } catch {
        // Schema already applied or file not found — safe to continue
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") || "annotations";
        const evidenceId = url.searchParams.get("evidence_id");

        // ── Provenance / chain-of-custody mode ──
        if (mode === "provenance" && evidenceId) {
            const ehDb = getEvidenceHubDb();

            // Get all origins for this evidence record
            const origins = ehDb.prepare(`
                SELECT eo.origin_system, eo.source_file, eo.source_rowid, eo.card_file, eo.imported_at,
                       e.source_type, e.canonical_id, e.start_timestamp, e.created_at as record_created
                FROM evidence_origins eo
                JOIN evidence e ON e.id = eo.evidence_id
                WHERE eo.evidence_id = ?
                ORDER BY eo.imported_at ASC
            `).all(parseInt(evidenceId, 10));

            // Get all participants
            const participants = ehDb.prepare(`
                SELECT p.identifier, p.normalized_identifier, p.display_name, ep.role
                FROM evidence_participants ep
                JOIN participants p ON p.id = ep.participant_id
                WHERE ep.evidence_id = ?
                ORDER BY ep.role, p.normalized_identifier
            `).all(parseInt(evidenceId, 10));

            // Build the chain: source file → zip archive → account → evidence hub
            const chain = origins.map((o: Record<string, unknown>) => {
                const sourceFile = o.source_file as string || "";
                const originSystem = o.origin_system as string || "";
                const steps: { label: string; detail: string; icon: string; timestamp?: string }[] = [];

                // Step 1: Raw source
                if (sourceFile.includes(".zip")) {
                    const zipName = sourceFile.split("/").pop() || sourceFile;
                    steps.push({
                        label: "ZIP Archive",
                        detail: zipName,
                        icon: "archive",
                    });
                } else if (sourceFile.includes("chat.db")) {
                    steps.push({
                        label: "Chat Database",
                        detail: sourceFile.split("/").pop() || sourceFile,
                        icon: "database",
                    });
                } else {
                    steps.push({
                        label: "Source File",
                        detail: sourceFile.split("/").pop() || sourceFile,
                        icon: "file",
                    });
                }

                // Step 2: Origin system (locker/device)
                steps.push({
                    label: "Origin System",
                    detail: originSystem,
                    icon: "server",
                });

                // Step 3: Ingestion
                steps.push({
                    label: "Ingested to Evidence Hub",
                    detail: `Record #${evidenceId}`,
                    icon: "shield",
                    timestamp: o.imported_at as string,
                });

                return {
                    origin_system: originSystem,
                    source_file: sourceFile,
                    source_rowid: o.source_rowid,
                    steps,
                };
            });

            return NextResponse.json({
                evidence_id: parseInt(evidenceId, 10),
                chain,
                participants,
                origin_count: origins.length,
            });
        }

        // ── List annotations for an evidence record ──
        if (mode === "annotations" && evidenceId) {
            const wbDb = getWorkbenchDb();
            ensureSchema(wbDb);

            const annotations = wbDb.prepare(`
                SELECT * FROM evidence_annotations
                WHERE evidence_id = ?
                ORDER BY created_at DESC
            `).all(parseInt(evidenceId, 10));

            return NextResponse.json({ annotations });
        }

        // ── List all flagged evidence ──
        if (mode === "flagged") {
            const wbDb = getWorkbenchDb();
            ensureSchema(wbDb);

            const flagged = wbDb.prepare(`
                SELECT ea.*, 
                       (SELECT e.title FROM evidence e WHERE e.id = ea.evidence_id) as evidence_title
                FROM evidence_annotations ea
                WHERE ea.annotation_type = 'flag' OR ea.flag_level IS NOT NULL
                ORDER BY ea.created_at DESC
                LIMIT 100
            `).all();

            // Note: cross-db query won't work directly. We'll fetch from evidence_hub separately.
            const ehDb = getEvidenceHubDb();
            const enriched = (flagged as Record<string, unknown>[]).map((f) => {
                const ev = ehDb.prepare("SELECT title, source_type, start_timestamp FROM evidence WHERE id = ?")
                    .get(f.evidence_id as number) as Record<string, unknown> | undefined;
                return { ...f, evidence_title: ev?.title, evidence_type: ev?.source_type, evidence_date: ev?.start_timestamp };
            });

            return NextResponse.json({ flagged: enriched });
        }

        return NextResponse.json({ error: "Missing evidence_id or mode" }, { status: 400 });

    } catch (error) {
        console.error("Annotations API GET error:", error);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { evidence_id, annotation_type, selected_text, note, color, flag_level, tags } = body;

        if (!evidence_id) {
            return NextResponse.json({ error: "evidence_id required" }, { status: 400 });
        }

        const wbDb = getWorkbenchDb();
        ensureSchema(wbDb);

        const result = wbDb.prepare(`
            INSERT INTO evidence_annotations (evidence_id, annotation_type, selected_text, note, color, flag_level, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            evidence_id,
            annotation_type || "highlight",
            selected_text || null,
            note || null,
            color || "#fbbf24",
            flag_level || null,
            tags ? JSON.stringify(tags) : null
        );

        return NextResponse.json({
            id: result.lastInsertRowid,
            message: "Annotation saved",
        });

    } catch (error) {
        console.error("Annotations API POST error:", error);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        const wbDb = getWorkbenchDb();
        ensureSchema(wbDb);

        wbDb.prepare("DELETE FROM evidence_annotations WHERE id = ?").run(parseInt(id, 10));

        return NextResponse.json({ message: "Annotation deleted" });

    } catch (error) {
        console.error("Annotations API DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
