import pypdf
import sys

def extract_text(pdf_path):
    try:
        reader = pypdf.PdfReader(pdf_path)
        full_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
        return "\n\n".join(full_text)
    except Exception as e:
        print(f"Error extracting PDF {pdf_path}: {e}")
        return None

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
