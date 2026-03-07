import { NextRequest, NextResponse } from "next/server";
import { getCommDb, getCaseCornerDb } from "@/lib/db";
import { analyzeEvidence } from "@/lib/bedrock";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/analyze
 * Analyze a piece of evidence against a specific claim using Claude via Bedrock.
 *
 * Body: { evidenceId: string, evidenceType: string, claimSlug: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { evidenceId, evidenceType, claimSlug } = body;

        if (!evidenceId || !evidenceType || !claimSlug) {
            return NextResponse.json(
                { error: "Missing required fields: evidenceId, evidenceType, claimSlug" },
                { status: 400 }
            );
        }

        // 1. Fetch the claim
        const ccDb = getCaseCornerDb();
        const claim = ccDb
            .prepare("SELECT id, title, description, legal_elements FROM claims WHERE slug = ?")
            .get(claimSlug) as { id: number; title: string; description: string; legal_elements: string } | undefined;

        if (!claim) {
            return NextResponse.json({ error: `Claim '${claimSlug}' not found` }, { status: 404 });
        }

        // 2. Fetch the evidence body
        let evidenceBody = "";
        let evidenceTitle = "";

        if (evidenceType === "email") {
            const commDb = getCommDb();
            const email = commDb
                .prepare("SELECT subject, sender, date, body FROM messages WHERE msg_id = ?")
                .get(evidenceId) as { subject: string; sender: string; date: string; body: string } | undefined;

            if (!email) {
                return NextResponse.json({ error: "Email not found" }, { status: 404 });
            }
            evidenceTitle = email.subject || "(no subject)";
            evidenceBody = `From: ${email.sender}\nDate: ${email.date}\nSubject: ${email.subject}\n\n${email.body || ""}`;
        } else if (evidenceType === "transcript") {
            // Transcript segments are text-based
            evidenceBody = `[Transcript evidence - ID: ${evidenceId}]`;
            evidenceTitle = evidenceId;
        } else {
            evidenceBody = `[Evidence type: ${evidenceType} - ID: ${evidenceId}]`;
            evidenceTitle = evidenceId;
        }

        // 3. Call Bedrock
        const legalElements = claim.legal_elements
            ? JSON.parse(claim.legal_elements)
            : [];

        const analysis = await analyzeEvidence(
            evidenceBody,
            claim.title,
            claim.description,
            legalElements
        );

        // 4. Save as AI note on the claim
        ccDb
            .prepare(
                `INSERT INTO claim_notes (claim_id, role, content, created_at)
                 VALUES (?, 'ai', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
            )
            .run(claim.id, `## AI Analysis: ${evidenceTitle}\n\n${analysis}`);

        return NextResponse.json({
            success: true,
            analysis,
            claimSlug,
            evidenceId,
        });
    } catch (error) {
        console.error("AI Analyze error:", error);
        return NextResponse.json(
            { error: "AI analysis failed. Check Bedrock credentials and model access." },
            { status: 500 }
        );
    }
}
