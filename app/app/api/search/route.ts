import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=...
 *
 * Fan-out search across all pods. Returns grouped results.
 */
export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    if (!q) {
        return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
    }

    const base = req.nextUrl.origin;

    const [emailRes, imsgRes, trsRes, legalRes, playerRes] = await Promise.all([
        fetch(`${base}/api/communications?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`${base}/api/imessages?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`${base}/api/transcripts?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json()).catch(() => ({ transcripts: [] })),
        fetch(`${base}/api/legal?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ documents: [] })),
        fetch(`${base}/api/players?q=${encodeURIComponent(q)}&limit=5`).then(r => r.json()).catch(() => ({ players: [] })),
    ]);

    return NextResponse.json({
        emails: (emailRes.results || []).slice(0, 5).map((e: Record<string, unknown>) => ({
            id: e.msg_id,
            title: e.subject || "(no subject)",
            subtitle: e.sender || e.account,
            date: e.date,
            link: "/correlator",
        })),
        messages: (imsgRes.results || []).slice(0, 5).map((m: Record<string, unknown>) => ({
            id: m.id || m.guid,
            title: typeof m.body === "string" ? m.body.slice(0, 120) : "",
            subtitle: m.handle_id,
            date: m.date_utc,
            link: "/correlator",
        })),
        transcripts: (trsRes.transcripts || []).slice(0, 5).map((t: Record<string, unknown>) => ({
            id: t.slug,
            title: t.title,
            subtitle: Array.isArray(t.speakers) ? (t.speakers as string[]).join(", ") : "",
            date: t.date,
            link: `/transcripts?open=${encodeURIComponent(String(t.slug))}`,
        })),
        legal: (legalRes.documents || []).slice(0, 5).map((d: Record<string, unknown>) => ({
            id: d.id,
            title: d.title,
            subtitle: d.category,
            date: d.date,
            link: "/legal",
        })),
        players: (playerRes.players || []).slice(0, 5).map((p: Record<string, unknown>) => ({
            id: p.id || p.slug,
            title: p.display_name,
            subtitle: [p.title, p.company].filter(Boolean).join(" · "),
            date: null,
            link: "/players",
        })),
    });
}
