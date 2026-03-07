import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TRANSCRIPTS_ROOT =
    "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TRANSCRIPTS_LOCKER";

/**
 * GET /api/transcripts/[slug]/audio
 *
 * Streams the audio file for a given transcript.
 * Supports HTTP Range requests for seeking.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const audioDir = path.join(TRANSCRIPTS_ROOT, slug, "audio");

        if (!fs.existsSync(audioDir)) {
            return NextResponse.json({ error: "No audio directory" }, { status: 404 });
        }

        // Find first audio file
        const audioFiles = fs
            .readdirSync(audioDir)
            .filter((f) => /\.(mp3|m4a|wav|ogg|aac)$/i.test(f));

        if (audioFiles.length === 0) {
            return NextResponse.json({ error: "No audio file found" }, { status: 404 });
        }

        const filePath = path.join(audioDir, audioFiles[0]);
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const ext = path.extname(audioFiles[0]).toLowerCase();

        const mimeMap: Record<string, string> = {
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".aac": "audio/aac",
        };
        const contentType = mimeMap[ext] || "audio/mpeg";

        // Handle Range requests for seeking
        const rangeHeader = request.headers.get("range");

        if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (match) {
                const start = parseInt(match[1], 10);
                const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
                const chunkSize = end - start + 1;

                const stream = fs.createReadStream(filePath, { start, end });
                const readable = new ReadableStream({
                    start(controller) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        stream.on("data", (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
                        stream.on("end", () => controller.close());
                        stream.on("error", (err) => controller.error(err));
                    },
                });

                return new Response(readable, {
                    status: 206,
                    headers: {
                        "Content-Type": contentType,
                        "Content-Length": chunkSize.toString(),
                        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                        "Accept-Ranges": "bytes",
                        "Cache-Control": "public, max-age=86400",
                    },
                });
            }
        }

        // Full file response
        const stream = fs.createReadStream(filePath);
        const readable = new ReadableStream({
            start(controller) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                stream.on("data", (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
                stream.on("end", () => controller.close());
                stream.on("error", (err) => controller.error(err));
            },
        });

        return new Response(readable, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Length": fileSize.toString(),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch (error) {
        console.error("Audio stream error:", error);
        return NextResponse.json({ error: "Failed to stream audio" }, { status: 500 });
    }
}
