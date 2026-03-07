import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TRANSCRIPTS_ROOT =
    "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TRANSCRIPTS_LOCKER";

interface TranscriptMeta {
    slug: string;
    date: string;
    title: string;
    hasTxt: boolean;
    hasCsv: boolean;
    hasAudio: boolean;
    txtLines: number | null;
    speakers: string[];
}

/**
 * Parse a transcript .txt to extract speakers and line count.
 */
function parseTranscriptMeta(txtPath: string): { lines: number; speakers: string[] } {
    const content = fs.readFileSync(txtPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const speakerSet = new Set<string>();
    // Pattern: [HH:MM:SS.ss] SPEAKER: text
    const speakerRe = /\]\s+([A-Z][A-Z0-9_/() ]+?):/g;
    for (const line of lines) {
        let m: RegExpExecArray | null;
        while ((m = speakerRe.exec(line)) !== null) {
            const speaker = m[1].trim();
            if (speaker !== "NOTES" && speaker !== "TRANSCRIPT") {
                speakerSet.add(speaker);
            }
        }
    }
    return { lines: lines.length, speakers: Array.from(speakerSet) };
}

/**
 * GET /api/transcripts
 *
 * Query params:
 *   q       – search transcript folder names
 *   page    – page (default 1)
 *   limit   – results per page (default 50)
 *   speaker – filter to transcripts containing this speaker
 */
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") || "").toLowerCase();
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
        const speakerFilter = (url.searchParams.get("speaker") || "").toUpperCase();
        const dateFilter = url.searchParams.get("date") || ""; // YYYY-MM-DD

        if (!fs.existsSync(TRANSCRIPTS_ROOT)) {
            return NextResponse.json({ error: "Transcripts directory not found" }, { status: 404 });
        }

        const dirs = fs
            .readdirSync(TRANSCRIPTS_ROOT, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith("."))
            .map((d) => d.name)
            .sort();

        const results: TranscriptMeta[] = [];

        for (const dirName of dirs) {
            // Quick filter by search query on folder name
            if (q && !dirName.toLowerCase().includes(q)) continue;
            // Quick filter by date prefix
            if (dateFilter && !dirName.startsWith(dateFilter)) continue;

            const dirPath = path.join(TRANSCRIPTS_ROOT, dirName);
            const txtDir = path.join(dirPath, "txt");
            const csvDir = path.join(dirPath, "csv");
            const audioDir = path.join(dirPath, "audio");

            const hasTxt = fs.existsSync(txtDir);
            const hasCsv = fs.existsSync(csvDir);
            const hasAudio = fs.existsSync(audioDir);

            // Extract date from folder name (YYYY-MM-DD prefix)
            const dateMatch = dirName.match(/^(\d{4}-\d{2}-\d{2})/);
            const date = dateMatch ? dateMatch[1] : "";

            // Human-readable title from slug
            const title = dirName
                .replace(/^\d{4}-\d{2}-\d{2}-trs-/, "")
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());

            let txtLines: number | null = null;
            let speakers: string[] = [];

            if (hasTxt) {
                const txtFiles = fs.readdirSync(txtDir).filter((f) => f.endsWith(".txt"));
                if (txtFiles.length > 0) {
                    const meta = parseTranscriptMeta(path.join(txtDir, txtFiles[0]));
                    txtLines = meta.lines;
                    speakers = meta.speakers;
                }
            }

            // Filter by speaker if requested
            if (speakerFilter && !speakers.some((s) => s.toUpperCase().includes(speakerFilter))) {
                continue;
            }

            results.push({
                slug: dirName,
                date,
                title,
                hasTxt,
                hasCsv,
                hasAudio,
                txtLines,
                speakers,
            });
        }

        // Paginate
        const total = results.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const paged = results.slice(offset, offset + limit);

        return NextResponse.json({
            transcripts: paged,
            total,
            page,
            limit,
            totalPages,
        });
    } catch (error) {
        console.error("Transcripts API error:", error);
        return NextResponse.json({ error: "Failed to fetch transcripts" }, { status: 500 });
    }
}
