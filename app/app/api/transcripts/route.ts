import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TRANSCRIPTS_ROOT =
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/TRANSCRIPTS_LOCKER";

interface TranscriptMeta {
    slug: string;
    category: string;
    date: string;
    title: string;
    hasTxt: boolean;
    hasCsv: boolean;
    hasAudio: boolean;
    txtLines: number | null;
    speakers: string[];
    audioFile: string | null;
}

/** Recursively scan category dirs → transcript dirs */
function scanAllTranscripts(): TranscriptMeta[] {
    const results: TranscriptMeta[] = [];
    if (!fs.existsSync(TRANSCRIPTS_ROOT)) return results;

    for (const cat of fs.readdirSync(TRANSCRIPTS_ROOT, { withFileTypes: true })) {
        if (!cat.isDirectory() || cat.name.startsWith(".")) continue;
        const catPath = path.join(TRANSCRIPTS_ROOT, cat.name);

        for (const entry of fs.readdirSync(catPath, { withFileTypes: true })) {
            if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
            const slug = entry.name;
            const slugPath = path.join(catPath, slug);

            const hasTxt = fs.existsSync(path.join(slugPath, "txt"));
            const hasCsv = fs.existsSync(path.join(slugPath, "csv"));
            const audioDir = path.join(slugPath, "audio");
            const hasAudio = fs.existsSync(audioDir) &&
                fs.readdirSync(audioDir).filter(f => !f.startsWith(".")).length > 0;

            let audioFile: string | null = null;
            if (hasAudio) {
                const af = fs.readdirSync(audioDir).filter(f => !f.startsWith("."))[0];
                audioFile = af || null;
            }

            const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
            const date = dateMatch ? dateMatch[1] : "";

            const title = slug
                .replace(/^\d{4}-\d{2}-\d{2}-trs-/, "")
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());

            let txtLines: number | null = null;
            const speakers: string[] = [];

            if (hasTxt) {
                const txtDir = path.join(slugPath, "txt");
                const txtFiles = fs.readdirSync(txtDir).filter(f => f.endsWith(".txt"));
                if (txtFiles.length > 0) {
                    const content = fs.readFileSync(path.join(txtDir, txtFiles[0]), "utf-8");
                    const lines = content.split("\n").filter(l => l.trim().length > 0);
                    txtLines = lines.length;

                    // Extract speakers
                    const speakerSet = new Set<string>();
                    const speakerRe = /\]\s+([A-Z][A-Z0-9_/() ]+?):/g;
                    for (const line of lines) {
                        let m: RegExpExecArray | null;
                        while ((m = speakerRe.exec(line)) !== null) {
                            const sp = m[1].trim();
                            if (sp !== "NOTES" && sp !== "TRANSCRIPT") speakerSet.add(sp);
                        }
                    }
                    speakers.push(...Array.from(speakerSet));
                }
            }

            results.push({ slug, category: cat.name, date, title, hasTxt, hasCsv, hasAudio, txtLines, speakers, audioFile });
        }
    }

    return results.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") || "").toLowerCase();
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
        const speakerFilter = (url.searchParams.get("speaker") || "").toUpperCase();
        const dateFilter = url.searchParams.get("date") || "";

        let all = scanAllTranscripts();

        const qNorm = q.replace(/\s+/g, ""); // normalize: remove spaces so "fifth third" matches "fifth-third"
        if (q) all = all.filter(t => {
            const slugNorm = t.slug.toLowerCase().replace(/-/g, "");
            const titleNorm = t.title.toLowerCase().replace(/\s+/g, "");
            const catNorm = t.category.toLowerCase().replace(/-/g, "");
            return slugNorm.includes(qNorm) || titleNorm.includes(qNorm) || catNorm.includes(qNorm);
        });
        if (dateFilter) all = all.filter(t => t.date.startsWith(dateFilter));
        if (speakerFilter) all = all.filter(t => t.speakers.some(s => s.toUpperCase().includes(speakerFilter)));

        const total = all.length;
        const offset = (page - 1) * limit;
        const paged = all.slice(offset, offset + limit);

        return NextResponse.json({
            transcripts: paged,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Transcripts API error:", error);
        return NextResponse.json({ error: "Failed to fetch transcripts" }, { status: 500 });
    }
}
