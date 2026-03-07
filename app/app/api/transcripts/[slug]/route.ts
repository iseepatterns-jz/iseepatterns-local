import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TRANSCRIPTS_ROOT =
    "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TRANSCRIPTS_LOCKER";

interface Segment {
    timestamp: string;
    startMs: number;
    speaker: string;
    text: string;
}

/**
 * Parse transcript .txt into structured segments.
 * Format: [HH:MM:SS.ss] SPEAKER: text
 */
function parseTranscriptTxt(filePath: string): Segment[] {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const segments: Segment[] = [];

    // Match lines like: [00:00:04.00] ZANGRILLI: Joseph Zangrilli.
    const lineRe = /^\[(\d{2}:\d{2}:\d{2}\.\d{2})\]\s+([A-Z][A-Z0-9_/() ]+?):\s*(.*)$/;

    for (const line of lines) {
        const m = line.trim().match(lineRe);
        if (!m) continue;

        const timestamp = m[1];
        const speaker = m[2].trim();
        const text = m[3].trim();

        // Skip metadata headers
        if (speaker === "NOTES" || speaker === "TRANSCRIPT") continue;

        // Convert timestamp to ms
        const parts = timestamp.split(":");
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const secParts = parts[2].split(".");
        const seconds = parseInt(secParts[0], 10);
        const centiseconds = parseInt(secParts[1], 10);
        const startMs = (hours * 3600 + minutes * 60 + seconds) * 1000 + centiseconds * 10;

        segments.push({ timestamp, startMs, speaker, text });
    }

    return segments;
}

/**
 * GET /api/transcripts/[slug]
 *
 * Returns the full parsed transcript for a given slug.
 * Query params:
 *   format  – "segments" (default) | "raw"
 *   speaker – filter segments to a specific speaker
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const dirPath = path.join(TRANSCRIPTS_ROOT, slug);

        if (!fs.existsSync(dirPath)) {
            return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
        }

        const url = new URL(request.url);
        const format = url.searchParams.get("format") || "segments";
        const speakerFilter = (url.searchParams.get("speaker") || "").toUpperCase();

        // Extract date & title
        const dateMatch = slug.match(/^(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : "";
        const title = slug
            .replace(/^\d{4}-\d{2}-\d{2}-trs-/, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

        // Find txt file
        const txtDir = path.join(dirPath, "txt");
        const csvDir = path.join(dirPath, "csv");
        const audioDir = path.join(dirPath, "audio");

        // Raw text
        if (format === "raw") {
            if (!fs.existsSync(txtDir)) {
                return NextResponse.json({ error: "No text transcript available" }, { status: 404 });
            }
            const txtFiles = fs.readdirSync(txtDir).filter((f) => f.endsWith(".txt"));
            if (txtFiles.length === 0) {
                return NextResponse.json({ error: "No text file found" }, { status: 404 });
            }
            const raw = fs.readFileSync(path.join(txtDir, txtFiles[0]), "utf-8");
            return NextResponse.json({ slug, date, title, format: "raw", content: raw });
        }

        // Parse segments
        let segments: Segment[] = [];
        if (fs.existsSync(txtDir)) {
            const txtFiles = fs.readdirSync(txtDir).filter((f) => f.endsWith(".txt"));
            if (txtFiles.length > 0) {
                segments = parseTranscriptTxt(path.join(txtDir, txtFiles[0]));
            }
        }

        // Filter by speaker
        if (speakerFilter) {
            segments = segments.filter((s) => s.speaker.toUpperCase().includes(speakerFilter));
        }

        // Collect unique speakers
        const speakers = [...new Set(segments.map((s) => s.speaker))];

        // Check for audio files
        let audioFile: string | null = null;
        if (fs.existsSync(audioDir)) {
            const audioFiles = fs.readdirSync(audioDir).filter((f) =>
                /\.(mp3|m4a|wav|ogg|aac)$/i.test(f)
            );
            if (audioFiles.length > 0) {
                audioFile = audioFiles[0];
            }
        }

        // Check for CSV
        let csvFile: string | null = null;
        if (fs.existsSync(csvDir)) {
            const csvFiles = fs.readdirSync(csvDir).filter((f) => f.endsWith(".csv"));
            if (csvFiles.length > 0) {
                csvFile = csvFiles[0];
            }
        }

        // Duration estimate from last segment
        const durationMs = segments.length > 0 ? segments[segments.length - 1].startMs : 0;

        return NextResponse.json({
            slug,
            date,
            title,
            format: "segments",
            segments,
            speakers,
            segmentCount: segments.length,
            durationMs,
            audioFile,
            csvFile,
            hasAudio: !!audioFile,
            hasCsv: !!csvFile,
        });
    } catch (error) {
        console.error("Transcript detail error:", error);
        return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 500 });
    }
}
