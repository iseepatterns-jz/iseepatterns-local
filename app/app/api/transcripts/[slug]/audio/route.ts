import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const TRANSCRIPTS_ROOT =
    "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/TRANSCRIPTS_LOCKER";

function findTranscriptDir(slug: string): string | null {
    if (!fs.existsSync(TRANSCRIPTS_ROOT)) return null;
    for (const cat of fs.readdirSync(TRANSCRIPTS_ROOT, { withFileTypes: true })) {
        if (!cat.isDirectory() || cat.name.startsWith(".")) continue;
        const candidate = path.join(TRANSCRIPTS_ROOT, cat.name, slug);
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const dirPath = findTranscriptDir(slug);
        if (!dirPath) {
            return NextResponse.json({ error: "No transcript directory" }, { status: 404 });
        }

        const audioDir = path.join(dirPath, "audio");
        if (!fs.existsSync(audioDir)) {
            return NextResponse.json({ error: "No audio directory" }, { status: 404 });
        }

        const audioFiles = fs
            .readdirSync(audioDir)
            .filter(f => /\.(mp3|m4a|wav|ogg|aac)$/i.test(f));
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

        const rangeHeader = request.headers.get("range");

        if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (match) {
                const start = parseInt(match[1], 10);
                const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1;
                const chunkSize = end - start + 1;

                const fd = fs.openSync(filePath, "r");
                const buf = Buffer.alloc(chunkSize);
                fs.readSync(fd, buf, 0, chunkSize, start);
                fs.closeSync(fd);

                return new Response(buf, {
                    status: 206,
                    headers: {
                        "Content-Type": contentType,
                        "Content-Length": chunkSize.toString(),
                        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                        "Accept-Ranges": "bytes",
                        "Cache-Control": "no-cache",
                    },
                });
            }
        }

        // Full file — read synchronously, simplest possible approach
        const fullBuf = fs.readFileSync(filePath);
        return new Response(fullBuf, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Length": fileSize.toString(),
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        console.error("Audio stream error:", error);
        return NextResponse.json({ error: "Failed to stream audio" }, { status: 500 });
    }
}
