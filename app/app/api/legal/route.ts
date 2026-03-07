import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const COURT_ROOT = "/Volumes/2026-iseepatterns-tb3/COURT_LOCKER";

interface CourtDocument {
    id: string;
    filename: string;
    date: string;
    title: string;
    category: "filing" | "evidence" | "order" | "notice" | "exhibit" | "other";
    sizeBytes: number;
    relativePath: string;
}

// Extract date from filename prefix like "2024-02-05 ..."
function extractDate(filename: string): string {
    const m = filename.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
}

// Derive a human-readable title from filename
function extractTitle(filename: string): string {
    let title = filename
        .replace(/\.pdf$/i, "")
        .replace(/\.docx?$/i, "")
        .replace(/^\d{4}-\d{2}-\d{2}\s*/, "")
        .replace(/^\s*-?\s*/, "")
        .replace(/_/g, " ");
    // Trim long notification names
    if (title.includes("Notification of Service for Case")) {
        const filingMatch = title.match(/for filing (.+?) Filed/);
        title = filingMatch
            ? `Service Notification — ${filingMatch[1]}`
            : "Service Notification";
    }
    return title || filename;
}

function scanDirectory(
    dirPath: string,
    category: CourtDocument["category"],
    baseRelative: string
): CourtDocument[] {
    if (!fs.existsSync(dirPath)) return [];
    const docs: CourtDocument[] = [];
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
        if (entry.startsWith(".") || entry === "Icon\r") continue;
        const fullPath = path.join(dirPath, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isFile() && /\.(pdf|docx?)$/i.test(entry)) {
            const relativePath = path.join(baseRelative, entry);
            docs.push({
                id: Buffer.from(relativePath).toString("base64url"),
                filename: entry,
                date: extractDate(entry),
                title: extractTitle(entry),
                category,
                sizeBytes: stat.size,
                relativePath,
            });
        }
    }
    return docs;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get("q")?.toLowerCase() || "";
        const categoryFilter = searchParams.get("category") || "";

        // Scan all subdirectories
        let allDocs: CourtDocument[] = [];

        // Court filings (main)
        allDocs.push(
            ...scanDirectory(
                path.join(COURT_ROOT, "FILINGS_DOCUMENT", "court"),
                "filing",
                "FILINGS_DOCUMENT/court"
            )
        );

        // Court orders
        allDocs.push(
            ...scanDirectory(
                path.join(COURT_ROOT, "FILINGS_DOCUMENT", "court", "orders"),
                "order",
                "FILINGS_DOCUMENT/court/orders"
            )
        );

        // Court notices
        allDocs.push(
            ...scanDirectory(
                path.join(COURT_ROOT, "FILINGS_DOCUMENT", "court", "notice"),
                "notice",
                "FILINGS_DOCUMENT/court/notice"
            )
        );

        // Evidence PDFs
        allDocs.push(
            ...scanDirectory(
                path.join(COURT_ROOT, "FILINGS_DOCUMENT", "evidence-pdf"),
                "evidence",
                "FILINGS_DOCUMENT/evidence-pdf"
            )
        );

        // Root-level PDFs
        allDocs.push(
            ...scanDirectory(COURT_ROOT, "other", "")
        );

        // Verified complaint exhibits
        const vcDir = path.join(COURT_ROOT, "verified complaint");
        if (fs.existsSync(vcDir)) {
            const vcEntries = fs.readdirSync(vcDir);
            for (const vc of vcEntries) {
                if (vc.startsWith(".") || vc === "Icon\r") continue;
                const vcPath = path.join(vcDir, vc);
                if (fs.statSync(vcPath).isDirectory()) {
                    allDocs.push(
                        ...scanDirectory(vcPath, "exhibit", path.join("verified complaint", vc))
                    );
                }
            }
        }

        // Deduplicate by filename (some files appear duplicated)
        const seen = new Map<string, CourtDocument>();
        for (const doc of allDocs) {
            const key = `${doc.filename}-${doc.sizeBytes}`;
            if (!seen.has(key)) {
                seen.set(key, doc);
            }
        }
        allDocs = Array.from(seen.values());

        // Filter
        if (q) {
            allDocs = allDocs.filter(
                (d) =>
                    d.title.toLowerCase().includes(q) ||
                    d.filename.toLowerCase().includes(q)
            );
        }
        if (categoryFilter) {
            allDocs = allDocs.filter((d) => d.category === categoryFilter);
        }

        // Sort by date descending, then title
        allDocs.sort((a, b) => {
            if (b.date && a.date) return b.date.localeCompare(a.date);
            if (b.date) return 1;
            if (a.date) return -1;
            return a.title.localeCompare(b.title);
        });

        // Category counts
        const categories: Record<string, number> = {};
        for (const d of allDocs) {
            categories[d.category] = (categories[d.category] || 0) + 1;
        }

        return NextResponse.json({
            documents: allDocs,
            total: allDocs.length,
            categories,
        });
    } catch (error) {
        console.error("Legal API error:", error);
        return NextResponse.json({ error: "Failed to scan court documents" }, { status: 500 });
    }
}
