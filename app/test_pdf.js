const fs = require('fs');

async function test() {
    console.log("Starting test...");
    try {
        const pdfParseModule = await import("pdf-parse");
        console.log("Module keys:", Object.keys(pdfParseModule));
        
        const PDFParse = pdfParseModule.PDFParse || (pdfParseModule.default && pdfParseModule.default.PDFParse) || pdfParseModule.default;
        
        if (!PDFParse) {
            console.error("PDFParse NOT FOUND");
            return;
        }
        
        console.log("PDFParse found, checking if it is a constructor...");
        console.log("Type of PDFParse:", typeof PDFParse);
        
        // Mock buffer
        const buffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF");
        
        const parser = new PDFParse({ data: buffer });
        console.log("Parser instance created");
        
        const result = await parser.getText();
        console.log("Result received:", typeof result);
        console.log("Text length:", result.text?.length);
        
    } catch (e) {
        console.error("TEST FAILED:", e);
    }
}

test();
