import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

/**
 * GET /api/files/download?path=...
 * Serves files from the LINKED_IN_PROFILE_LOCKER
 */
export async function GET(req: NextRequest) {
    try {
        const filePath = req.nextUrl.searchParams.get("path");
        if (!filePath) {
            return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
        }

        // Safety: Ensure path stays within allowed directory
        const PROJECT_ROOT = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1";
        const absolutePath = path.resolve(PROJECT_ROOT, filePath);
        
        if (!absolutePath.startsWith(path.join(PROJECT_ROOT, "data", "LINKED_IN_PROFILE_LOCKER"))) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (!fs.existsSync(absolutePath)) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(absolutePath);
        const fileName = path.basename(absolutePath);
        
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("File download error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
