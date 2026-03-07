import { NextRequest, NextResponse } from "next/server";
import { getCommDb, getCaseCornerDb } from "@/lib/db";
import { summarizeClaim } from "@/lib/bedrock";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/summarize
 * Summarize all evidence linked to a claim using Claude via Bedrock.
 *
 * Body: { claimSlug: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { claimSlug } = body;

        if (!claimSlug) {
            return NextResponse.json(
                { error: "Missing required field: claimSlug" },
                { status: 400 }
            );
        }

        // 1. Fetch claim
        const ccDb = getCaseCornerDb();
        const claim = ccDb
            .prepare("SELECT id, title, description FROM claims WHERE slug = ?")
            .get(claimSlug) as { id: number; title: string; description: string } | undefined;

        if (!claim) {
            return NextResponse.json({ error: `Claim '${claimSlug}' not found` }, { status: 404 });
        }

        // 2. Fetch all linked evidence
        const evidenceLinks = ccDb
            .prepare("SELECT evidence_id, evidence_type FROM claim_evidence WHERE claim_id = ?")
            .all(claim.id) as { evidence_id: string; evidence_type: string }[];

        if (evidenceLinks.length === 0) {
            return NextResponse.json(
                { error: "No evidence linked to this claim. Link evidence first." },
                { status: 400 }
            );
        }

        // 3. Gather evidence bodies
        const commDb = getCommDb();
        const evidenceSummaries: { type: string; title: string; body: string }[] = [];

        for (const link of evidenceLinks.slice(0, 20)) {
            if (link.evidence_type === "email") {
                const email = commDb
                    .prepare("SELECT subject, sender, date, body FROM messages WHERE msg_id = ?")
                    .get(link.evidence_id) as { subject: string; sender: string; date: string; body: string } | undefined;

                if (email) {
                    evidenceSummaries.push({
                        type: "email",
                        title: `${email.subject} (from: ${email.sender}, ${email.date})`,
                        body: email.body || "",
                    });
                }
            } else {
                evidenceSummaries.push({
                    type: link.evidence_type,
                    title: link.evidence_id,
                    body: `[${link.evidence_type} evidence]`,
                });
            }
        }

        // 4. Call Bedrock
        const summary = await summarizeClaim(
            claim.title,
            claim.description,
            evidenceSummaries
        );

        // 5. Save as AI note
        ccDb
            .prepare(
                `INSERT INTO claim_notes (claim_id, role, content, created_at)
                 VALUES (?, 'ai', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
            )
            .run(
                claim.id,
                `## AI Case Summary (${evidenceSummaries.length} evidence items)\n\n${summary}`
            );

        return NextResponse.json({
            success: true,
            summary,
            claimSlug,
            evidenceCount: evidenceSummaries.length,
        });
    } catch (error) {
        console.error("AI Summarize error:", error);
        return NextResponse.json(
            { error: "AI summarization failed. Check Bedrock credentials." },
            { status: 500 }
        );
    }
}
