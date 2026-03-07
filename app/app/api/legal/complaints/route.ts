import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

export const dynamic = "force-dynamic";

const CSV_PATH =
    "/Volumes/2026-iseepatterns-tb3/COURT_LOCKER/zDataStorage - Complaints.csv";

interface ComplaintParagraph {
    id: string;
    name: string;
    slug: string;
    complaint: string;
    response: string;
    group: string;
    category: string;
    subCategory: string;
    paragraphNum: string;
    pageNum: string;
    notes: string;
}

// Simple CSV parser that handles quoted fields with commas and newlines
function parseCSV(content: string): Record<string, string>[] {
    const rows: Record<string, string>[] = [];
    let headers: string[] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let headersParsed = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        const next = content[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                currentField += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                currentField += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                currentRow.push(currentField);
                currentField = "";
            } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
                currentRow.push(currentField);
                currentField = "";
                if (ch === "\r") i++;

                if (!headersParsed) {
                    headers = currentRow.map((h) => h.trim());
                    headersParsed = true;
                } else if (currentRow.some((f) => f.trim())) {
                    const row: Record<string, string> = {};
                    headers.forEach((h, idx) => {
                        row[h] = (currentRow[idx] || "").trim();
                    });
                    rows.push(row);
                }
                currentRow = [];
            } else {
                currentField += ch;
            }
        }
    }
    // Handle last row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (headersParsed && currentRow.some((f) => f.trim())) {
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
                row[h] = (currentRow[idx] || "").trim();
            });
            rows.push(row);
        }
    }

    return rows;
}

function stripHTML(html: string): string {
    return html
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q")?.toLowerCase() || "";
        const groupFilter = searchParams.get("group") || "";
        const categoryFilter = searchParams.get("category") || "";

        if (!fs.existsSync(CSV_PATH)) {
            return NextResponse.json({ error: "Complaints CSV not found" }, { status: 404 });
        }

        const content = fs.readFileSync(CSV_PATH, "utf-8");
        const rows = parseCSV(content);

        let paragraphs: ComplaintParagraph[] = rows.map((row) => ({
            id: row["Item ID"] || row["Slug"] || "",
            name: row["Name"] || "",
            slug: row["Slug"] || "",
            complaint: stripHTML(row["Complaint"] || ""),
            response: stripHTML(row["Response"] || ""),
            group: row["Group"] || "",
            category: row["Category"] || "",
            subCategory: row["Sub category"] || "",
            paragraphNum: row["Paragraph num"] || row["Paragraph num disp"] || "",
            pageNum: row["Page num"] || "",
            notes: row["Notes"] || "",
        }));

        // Filter
        if (q) {
            paragraphs = paragraphs.filter(
                (p) =>
                    p.complaint.toLowerCase().includes(q) ||
                    p.response.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    p.subCategory.toLowerCase().includes(q)
            );
        }
        if (groupFilter) {
            paragraphs = paragraphs.filter(
                (p) => p.group.toLowerCase() === groupFilter.toLowerCase()
            );
        }
        if (categoryFilter) {
            paragraphs = paragraphs.filter(
                (p) => p.category.toLowerCase() === categoryFilter.toLowerCase()
            );
        }

        // Sort by page number then paragraph number
        paragraphs.sort((a, b) => {
            const pa = parseInt(a.pageNum) || 0;
            const pb = parseInt(b.pageNum) || 0;
            if (pa !== pb) return pa - pb;
            const na = parseInt(a.paragraphNum) || 0;
            const nb = parseInt(b.paragraphNum) || 0;
            return na - nb;
        });

        // Collect unique groups and categories
        const groups = [...new Set(paragraphs.map((p) => p.group).filter(Boolean))];
        const categoriesList = [...new Set(paragraphs.map((p) => p.category).filter(Boolean))];

        return NextResponse.json({
            paragraphs,
            total: paragraphs.length,
            groups,
            categories: categoriesList,
        });
    } catch (error) {
        console.error("Complaints API error:", error);
        return NextResponse.json(
            { error: "Failed to parse complaints" },
            { status: 500 }
        );
    }
}
