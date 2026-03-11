#!/usr/bin/env python3
import sys
import objc
from Foundation import NSURL
from Quartz import PDFDocument

def extract_text(pdf_path):
    url = NSURL.fileURLWithPath_(pdf_path)
    doc = PDFDocument.alloc().initWithURL_(url)
    if not doc:
        return None
    
    full_text = []
    for i in range(doc.pageCount()):
        page = doc.pageAtIndex_(i)
        text = page.string()
        if text:
            full_text.append(str(text))
    
    return "\n\n".join(full_text)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 extract_pdf.py <file.pdf>")
        sys.exit(1)
    
    content = extract_text(sys.argv[1])
    if content:
        print(content)
    else:
        print(f"Error: Could not extract text from {sys.argv[1]}")
        sys.exit(1)
