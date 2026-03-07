import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/rag/debug
 * Diagnose why indexing might fail — checks paths, fs access, pdf loading.
 */
export async function GET() {
    const diag: Record<string, unknown> = {};

    const LEGAL_DOCS_DIR = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1";

    // 1. Check base dir
    diag.baseDirExists = fs.existsSync(LEGAL_DOCS_DIR);

    // 2. Check subdirs
    const businessDir = path.join(LEGAL_DOCS_DIR, "legal_docs_business");
    const criminalDir = path.join(LEGAL_DOCS_DIR, "legal_docs_criminal");
    diag.businessDirExists = fs.existsSync(businessDir);
    diag.criminalDirExists = fs.existsSync(criminalDir);

    // 3. List business subdirs
    if (diag.businessDirExists) {
        try {
            diag.businessContents = fs.readdirSync(businessDir as string);
        } catch (e) {
            diag.businessReadError = String(e);
        }
    }

    // 4. Walk and count files
    if (diag.businessDirExists) {
        try {
            let count = 0;
            const walk = (dir: string) => {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    if (entry.name.startsWith(".")) continue;
                    const full = path.join(dir, entry.name);
                    if (entry.isDirectory()) walk(full);
                    else if (entry.name.endsWith(".pdf") || entry.name.endsWith(".txt")) count++;
                }
            };
            walk(businessDir);
            diag.businessFileCount = count;
        } catch (e) {
            diag.businessWalkError = String(e);
        }
    }

    // 5. Try to read first PDF
    try {
        const firstPdf = path.join(businessDir, "01_complaints_and_exhibits");
        if (fs.existsSync(firstPdf)) {
            const files = fs.readdirSync(firstPdf).filter(f => f.endsWith(".pdf"));
            diag.firstCategoryFiles = files.length;
            if (files.length > 0) {
                const filePath = path.join(firstPdf, files[0]);
                const buf = fs.readFileSync(filePath);
                diag.firstPdfName = files[0];
                diag.firstPdfSize = buf.length;

                // Try pdfjs-dist
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
                    diag.pdfjsLoaded = true;
                    diag.pdfjsGetDocument = typeof pdfjsLib.getDocument;

                    // Point to actual worker file
                    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                        const workerPath = path.resolve(
                            process.cwd(),
                            "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
                        );
                        pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
                        diag.workerPath = workerPath;
                    }

                    const uint8 = new Uint8Array(buf);
                    const task = pdfjsLib.getDocument({
                        data: uint8,
                        verbosity: 0,
                        isEvalSupported: false,
                    });
                    const doc = await task.promise;
                    diag.pdfPages = doc.numPages;

                    const page = await doc.getPage(1);
                    const content = await page.getTextContent();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const text = content.items.map((i: any) => i.str).join(" ");
                    diag.firstPageTextLength = text.length;
                    diag.firstPagePreview = text.slice(0, 200);
                } catch (e) {
                    diag.pdfjsError = String(e);
                }
            }
        }
    } catch (e) {
        diag.pdfTestError = String(e);
    }

    // 6. Check BM25 index file
    const bm25Path = path.join(LEGAL_DOCS_DIR, "bm25_index_ts.json");
    diag.bm25IndexExists = fs.existsSync(bm25Path);

    return NextResponse.json(diag, { status: 200 });
}
