import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_ROOT = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data";
const MBOX_LOCKER = path.join(DATA_ROOT, "MBOX_LOCKER");

// All known attachment directories (pre-extracted Google Drive exports)
const ATTACHMENT_DIRS = [
    path.join(MBOX_LOCKER, "2024-06-22_GMAIL_MBOX_ALL_LOCKER", "attachments"),
    path.join(MBOX_LOCKER, "2024-06-30_GMAIL_MBOX_LG_MBOX_LOCKER", "attachments"),
    path.join(MBOX_LOCKER, "2023-06-08_GMAIL_MBOX_LEGAL_LOCKER", "attachments"),
    path.join(MBOX_LOCKER, "2023-06-08_GMAIL_MBOX_SG_LOCKER", "attachments"),
    path.join(MBOX_LOCKER, "2025-04-25_GOT_YOUR_BACK_LOCKER", "attachments"),
];

const MIME_TYPES: Record<string, string> = {
    ".png": "image/png",    ".jpg": "image/jpeg",  ".jpeg": "image/jpeg",
    ".gif": "image/gif",     ".webp": "image/webp", ".bmp": "image/bmp",
    ".svg": "image/svg+xml", ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv",      ".txt": "text/plain",
    ".mp3": "audio/mpeg",    ".mp4": "video/mp4",
    ".ai": "application/postscript",
    ".psd": "image/vnd.adobe.photoshop",
    ".zip": "application/zip",
};

// Cache directory listings for perf (1,765+ files per directory)
const dirCache = new Map<string, { files: string[]; at: number }>();
const CACHE_TTL = 60_000; // 1 minute

function listDir(dir: string): string[] {
    const cached = dirCache.get(dir);
    if (cached && Date.now() - cached.at < CACHE_TTL) return cached.files;

    try {
        if (!fs.existsSync(dir)) return [];
        const files = fs.readdirSync(dir);
        dirCache.set(dir, { files, at: Date.now() });
        return files;
    } catch { return []; }
}

/**
 * Search pre-extracted attachment directories for a file.
 * Supports fuzzy matching: "Screen Shot 2023.png" → "Screen Shot 2023_abc123.png"
 */
function findAttachment(query: string): string | null {
    const ext = path.extname(query).toLowerCase();
    const baseName = path.basename(query, ext).toLowerCase();

    for (const dir of ATTACHMENT_DIRS) {
        const files = listDir(dir);
        if (!files.length) continue;

        // Exact match first
        const exact = files.find(f => f === query);
        if (exact) return path.join(dir, exact);

        // Fuzzy: starts with baseName (case-insensitive)
        const fuzzy = files.find(f => {
            const fLower = f.toLowerCase();
            return fLower.startsWith(baseName) && fLower.endsWith(ext);
        });
        if (fuzzy) return path.join(dir, fuzzy);
    }

    return null;
}

/**
 * GET /api/workbench/attachment?name=Screen+Shot+2023-05-10+at+8.47.43+AM.png
 * Serves the attachment file with correct MIME type.
 * Searches pre-extracted attachment directories with fuzzy filename matching.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") || "";

    if (!name) {
        return NextResponse.json({ error: "Missing 'name' parameter" }, { status: 400 });
    }

    const filePath = findAttachment(name);

    if (!filePath) {
        return NextResponse.json({
            error: "Attachment not found",
            query: name,
            hint: "File may not have been pre-extracted. Run scripts/extract_mbox_attachments.py to batch-extract inline images.",
        }, { status: 404 });
    }

    try {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch (error) {
        console.error("Attachment serve error:", error);
        return NextResponse.json({ error: "Failed to serve attachment" }, { status: 500 });
    }
}
