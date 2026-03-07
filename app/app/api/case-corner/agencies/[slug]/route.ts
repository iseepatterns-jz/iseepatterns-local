import { NextRequest, NextResponse } from "next/server";
import { getCaseCornerDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET — agency detail with linked claims */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getCaseCornerDb();
        const agency = db.prepare("SELECT * FROM agency_submissions WHERE slug = ?").get(slug);
        if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

        const linkedClaims = db.prepare(`
            SELECT sc.*, c.title as claim_title, c.slug as claim_slug, c.status as claim_status, c.severity
            FROM submission_claims sc
            JOIN claims c ON c.id = sc.claim_id
            WHERE sc.submission_id = ?
            ORDER BY sc.priority ASC
        `).all((agency as { id: number }).id);

        return NextResponse.json({ agency, linkedClaims });
    } catch (err) {
        console.error("Agency detail error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

/** PATCH — update agency fields */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const body = await req.json();
        const db = getCaseCornerDb();

        const fields: string[] = [];
        const vals: unknown[] = [];
        for (const key of ["title", "agency_type", "status", "submission_method", "deadline", "notes"]) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                vals.push(body[key]);
            }
        }
        if (body.contact_info !== undefined) {
            fields.push("contact_info = ?");
            vals.push(JSON.stringify(body.contact_info));
        }
        if (!fields.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

        fields.push("updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')");
        vals.push(slug);

        db.prepare(`UPDATE agency_submissions SET ${fields.join(", ")} WHERE slug = ?`).run(...vals);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Update agency error:", err);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}
