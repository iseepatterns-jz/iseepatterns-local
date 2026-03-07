#!/usr/bin/env node
/**
 * extract-pdf-text.mjs
 * Standalone PDF text extractor using pdfjs-dist.
 * Designed to be called via child_process from Next.js API routes,
 * bypassing Next.js module bundling issues with pdfjs-dist workers.
 *
 * Usage: node scripts/extract-pdf-text.mjs <path-to-pdf>
 * Output: extracted text to stdout
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const pdfPath = process.argv[2];
    if (!pdfPath) {
        process.stderr.write("Usage: node extract-pdf-text.mjs <pdf-path>\n");
        process.exit(1);
    }

    // Import pdfjs-dist legacy build
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // Set worker source
    const workerPath = resolve(
        __dirname,
        "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

    // Read PDF
    const buffer = readFileSync(pdfPath);
    const uint8 = new Uint8Array(buffer);

    const task = pdfjsLib.getDocument({
        data: uint8,
        useSystemFonts: true,
        isEvalSupported: false,
        verbosity: 0,
    });
    const doc = await task.promise;

    // Extract text from all pages
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str || "").join(" ");
        pages.push(pageText);
    }

    process.stdout.write(pages.join("\n\n"));
}

main().catch((e) => {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
});
