import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getWorkbenchDb, getCaseCornerDb, getCommDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/export/pdf
 * Generate a PDF export of case data.
 *
 * Body: { type: 'section' | 'claim' | 'timeline', id?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, id } = body;

        if (!type) {
            return NextResponse.json(
                { error: "Missing required field: type (section, claim, or timeline)" },
                { status: 400 }
            );
        }

        const pdf = await PDFDocument.create();
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
        const monoFont = await pdf.embedFont(StandardFonts.Courier);

        const PAGE_WIDTH = 612;
        const PAGE_HEIGHT = 792;
        const MARGIN = 50;
        const LINE_HEIGHT = 14;
        const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

        let currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        let y = PAGE_HEIGHT - MARGIN;

        function addPage() {
            currentPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            y = PAGE_HEIGHT - MARGIN;
        }

        function ensureSpace(needed: number) {
            if (y - needed < MARGIN) addPage();
        }

        function drawTitle(text: string) {
            ensureSpace(40);
            currentPage.drawText(text, {
                x: MARGIN, y,
                size: 18, font: boldFont,
                color: rgb(0.1, 0.1, 0.1),
            });
            y -= 28;
        }

        function drawSubtitle(text: string) {
            ensureSpace(25);
            currentPage.drawText(text, {
                x: MARGIN, y,
                size: 12, font: boldFont,
                color: rgb(0.2, 0.2, 0.3),
            });
            y -= 20;
        }

        function drawText(text: string, size = 10, indent = 0) {
            const maxWidth = CONTENT_WIDTH - indent;
            const words = text.split(" ");
            let line = "";

            for (const word of words) {
                const testLine = line ? `${line} ${word}` : word;
                const width = font.widthOfTextAtSize(testLine, size);
                if (width > maxWidth && line) {
                    ensureSpace(LINE_HEIGHT);
                    currentPage.drawText(line, {
                        x: MARGIN + indent, y,
                        size, font,
                        color: rgb(0.15, 0.15, 0.15),
                    });
                    y -= LINE_HEIGHT;
                    line = word;
                } else {
                    line = testLine;
                }
            }
            if (line) {
                ensureSpace(LINE_HEIGHT);
                currentPage.drawText(line, {
                    x: MARGIN + indent, y,
                    size, font,
                    color: rgb(0.15, 0.15, 0.15),
                });
                y -= LINE_HEIGHT;
            }
        }

        function drawLabel(label: string, value: string) {
            ensureSpace(LINE_HEIGHT);
            currentPage.drawText(label, {
                x: MARGIN, y,
                size: 9, font: boldFont,
                color: rgb(0.4, 0.4, 0.4),
            });
            currentPage.drawText(value, {
                x: MARGIN + 120, y,
                size: 9, font: monoFont,
                color: rgb(0.1, 0.1, 0.1),
            });
            y -= LINE_HEIGHT;
        }

        function drawSeparator() {
            ensureSpace(15);
            currentPage.drawLine({
                start: { x: MARGIN, y },
                end: { x: PAGE_WIDTH - MARGIN, y },
                thickness: 0.5,
                color: rgb(0.8, 0.8, 0.8),
            });
            y -= 12;
        }

        // ── Header ──
        const now = new Date().toISOString().slice(0, 19).replace("T", " ");
        drawText(`ISEEPATTERNS.COM — Case RC-2026 — Generated ${now}`, 8);
        drawSeparator();

        if (type === "claim" && id) {
            // Export claim with all evidence and notes
            const ccDb = getCaseCornerDb();
            const claim = ccDb
                .prepare("SELECT * FROM claims WHERE slug = ?")
                .get(id) as Record<string, unknown> | undefined;

            if (!claim) {
                return NextResponse.json({ error: "Claim not found" }, { status: 404 });
            }

            drawTitle(`Claim: ${claim.title}`);
            y -= 5;
            drawLabel("Slug:", String(claim.slug));
            drawLabel("Category:", String(claim.category || "—"));
            drawLabel("Severity:", String(claim.severity || "—"));
            drawLabel("Status:", String(claim.status || "—"));
            y -= 5;

            if (claim.description) {
                drawSubtitle("Description");
                drawText(String(claim.description));
                y -= 10;
            }

            // Legal elements
            if (claim.legal_elements) {
                try {
                    const elements = JSON.parse(String(claim.legal_elements));
                    if (Array.isArray(elements) && elements.length > 0) {
                        drawSubtitle("Legal Elements");
                        elements.forEach((el: string, i: number) => {
                            drawText(`${i + 1}. ${el}`, 9, 10);
                        });
                        y -= 10;
                    }
                } catch { /* */ }
            }

            // Notes
            const notes = ccDb
                .prepare("SELECT * FROM claim_notes WHERE claim_id = ? ORDER BY created_at")
                .all(claim.id) as Record<string, unknown>[];

            if (notes.length > 0) {
                drawSubtitle(`Notes (${notes.length})`);
                for (const note of notes) {
                    drawSeparator();
                    drawLabel("Role:", String(note.role));
                    drawLabel("Date:", String(note.created_at || "—"));
                    drawText(String(note.content || ""), 9, 10);
                    y -= 5;
                }
            }

            // Evidence links
            const evidence = ccDb
                .prepare("SELECT * FROM claim_evidence WHERE claim_id = ?")
                .all(claim.id) as Record<string, unknown>[];

            if (evidence.length > 0) {
                drawSubtitle(`Linked Evidence (${evidence.length})`);
                for (const ev of evidence) {
                    drawText(`• [${ev.evidence_type}] ${ev.evidence_id}`, 9, 10);
                }
            }
        } else if (type === "timeline") {
            // Export full timeline
            drawTitle("Case Timeline — Rowboat Creative v. Guariglia");
            y -= 5;

            const db = getWorkbenchDb();
            let events: Record<string, unknown>[] = [];
            try {
                events = db
                    .prepare("SELECT * FROM timeline_events ORDER BY date ASC")
                    .all() as Record<string, unknown>[];
            } catch { /* table may not exist */ }

            if (events.length === 0) {
                drawText("No timeline events found.");
            } else {
                drawText(`${events.length} events documented`, 9);
                y -= 10;

                for (const event of events) {
                    drawSeparator();
                    const severity = String(event.severity || "").toUpperCase();
                    const prefix = severity === "CRITICAL" ? "🔴 " : severity === "HIGH" ? "🟡 " : "";
                    drawSubtitle(`${prefix}${event.date} — ${event.title}`);
                    drawLabel("Category:", String(event.category || "—"));
                    drawLabel("Severity:", severity);

                    const actors = [];
                    if (event.lg_involved) actors.push("LG");
                    if (event.jz_involved) actors.push("JZ");
                    if (actors.length) drawLabel("Actors:", actors.join(", "));

                    drawText(String(event.description || ""), 9, 10);

                    if (event.claims) {
                        try {
                            const claims = JSON.parse(String(event.claims));
                            if (claims.length) drawLabel("Claims:", claims.join(", "));
                        } catch { /* */ }
                    }
                    y -= 5;
                }
            }
        } else if (type === "section" && id) {
            // Export workbench section
            const db = getWorkbenchDb();
            const section = db
                .prepare("SELECT * FROM exhibit_sections WHERE id = ?")
                .get(id) as Record<string, unknown> | undefined;

            if (!section) {
                return NextResponse.json({ error: "Section not found" }, { status: 404 });
            }

            drawTitle(`Evidence Section: ${section.title}`);
            if (section.description) drawText(String(section.description));
            y -= 10;

            const assignments = db
                .prepare("SELECT * FROM evidence_assignments WHERE section_id = ? ORDER BY position")
                .all(Number(id)) as Record<string, unknown>[];

            drawSubtitle(`Assigned Evidence (${assignments.length})`);
            for (const a of assignments) {
                drawSeparator();
                drawLabel("Evidence ID:", String(a.evidence_id));
                drawLabel("Type:", String(a.evidence_type || "—"));
                if (a.notes) drawText(String(a.notes), 9, 10);
            }
        } else {
            drawText("No export type specified or ID missing.", 12);
        }

        // ── Generate PDF ──
        const pdfBytes = await pdf.save();

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="iseepatterns-export-${type}-${id || "all"}-${Date.now()}.pdf"`,
            },
        });
    } catch (error) {
        console.error("PDF Export error:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
