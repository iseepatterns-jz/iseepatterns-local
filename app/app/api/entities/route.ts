import { NextRequest, NextResponse } from "next/server";
import { getEvidenceHubDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") || "list";
        const id = url.searchParams.get("id");

        const db = getEvidenceHubDb();

        if (mode === "list") {
            const entities = db.prepare(`
                SELECT e.*, 
                       (SELECT count(DISTINCT ep.evidence_id) 
                        FROM participant_entities pe 
                        JOIN evidence_participants ep ON ep.participant_id = pe.participant_id 
                        WHERE pe.entity_id = e.id) as evidence_count,
                       (SELECT count(*) FROM participant_entities WHERE entity_id = e.id) as identity_count
                FROM entities e
                ORDER BY evidence_count DESC
            `).all() as any[];

            // Parse JSON tags
            const formatted = entities.map(e => ({
                ...e,
                tags: e.tags ? JSON.parse(e.tags) : []
            }));

            return NextResponse.json(formatted);
        }

        if (mode === "detail" && id) {
            const entityId = parseInt(id, 10);
            if (isNaN(entityId)) {
                return NextResponse.json({ error: "Invalid Entity ID" }, { status: 400 });
            }

            const entity = db.prepare("SELECT * FROM entities WHERE id = ?").get(entityId) as any;
            if (!entity) {
                return NextResponse.json({ error: "Entity not found" }, { status: 404 });
            }

            // Get associated participants/identities
            const identities = db.prepare(`
                SELECT p.*, pe.confidence, pe.source
                FROM participant_entities pe
                JOIN participants p ON p.id = pe.participant_id
                WHERE pe.entity_id = ?
            `).all(entityId);

            // Get latest evidence snippets for this entity (via all its participants)
            const evidence = db.prepare(`
                SELECT ev.id, ev.title, ev.summary, ev.start_timestamp, ev.source_type
                FROM evidence ev
                JOIN evidence_participants ep ON ep.evidence_id = ev.id
                JOIN participant_entities pe ON pe.participant_id = ep.participant_id
                WHERE pe.entity_id = ?
                GROUP BY ev.id
                ORDER BY ev.start_timestamp DESC
                LIMIT 20
            `).all(entityId);

            return NextResponse.json({
                ...entity,
                tags: entity.tags ? JSON.parse(entity.tags) : [],
                identities,
                recent_evidence: evidence
            });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    } catch (err: any) {
        console.error("Entity API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
