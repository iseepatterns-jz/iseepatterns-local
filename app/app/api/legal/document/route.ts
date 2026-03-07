import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const COURT_ROOT = "/Volumes/2026-iseepatterns-tb3/COURT_LOCKER";

/**
 * GET /api/legal/document?path=FILINGS_DOCUMENT/court/somefile.pdf
 *
 * Streams a PDF from COURT_LOCKER for inline viewing.
 * Supports HTTP Range requests for large files.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const relativePath = searchParams.get("path");

        if (!relativePath) {
            return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
        }

        // Security: prevent path traversal
        const resolved = path.resolve(COURT_ROOT, relativePath);
        if (!resolved.startsWith(COURT_ROOT)) {
            return NextResponse.json({ error: "Invalid path" }, { status: 403 });
        }

        if (!fs.existsSync(resolved)) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const stat = fs.statSync(resolved);
        const ext = path.extname(resolved).toLowerCase();

        const mimeMap: Record<string, string> = {
            ".pdf": "application/pdf",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
        const contentType = mimeMap[ext] || "application/octet-stream";

        // Handle Range requests
        const rangeHeader = request.headers.get("range");

        if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (match) {
                const start = parseInt(match[1], 10);
                const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
                const chunkSize = end - start + 1;

                const stream = fs.createReadStream(resolved, { start, end });
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
                        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                        "Accept-Ranges": "bytes",
                        "Cache-Control": "public, max-age=86400",
                    },
                });
            }
        }

        // Full file response
        const stream = fs.createReadStream(resolved);
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
                "Content-Length": stat.size.toString(),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": `inline; filename="${path.basename(resolved)}"`,
            },
        });
    } catch (error) {
        console.error("Document stream error:", error);
        return NextResponse.json({ error: "Failed to stream document" }, { status: 500 });
    }
}
