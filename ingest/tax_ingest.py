import json
import os
import uuid
import re
from datetime import datetime
from ingest.extract_pdf import extract_text

def extract_key_fields(text):
    """
    Heuristic-based extraction of key financial figures from tax documents.
    """
    data = {}
    
    # regex patterns for common tax form labels
    patterns = {
        "gross_receipts": r"Gross receipts or sales\s*[\d,]*\s*([\d,]+)",
        "net_income": r"Ordinary business income \(loss\)\s*[\d,]*\s*([\d,]+)",
        "officer_compensation": r"Compensation of officers\s*([\d,]+)",
        "distributions": r"Items affecting shareholder basis.*distributions\s*([\d,]+)",
        "agi": r"Adjusted gross income\s*([\d,]+)",
        "taxable_income": r"Taxable income\s*([\d,]+)",
        "total_tax": r"Total tax\s*([\d,]+)",
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Clean up the value
            val = match.group(1).replace(",", "")
            if val.isdigit():
                data[key] = f"${int(val):,}"
            else:
                data[key] = val
            
    return data

def create_tax_evidence_card(tax_year, form_type, entity, data, file_path):
    """
    Creates a unified Evidence Card for a specific tax record.
    """
    card_id = str(uuid.uuid4())
    
    # Standardize entity names
    entity_map = {
        "JZ": "Joseph Zangrilli",
        "LG": "Lucas Guariglia",
        "Rowboat": "Rowboat Creative, LLC"
    }
    entity_display = entity_map.get(entity, entity)

    card = {
        "id": card_id,
        "source_type": "tax_record",
        "file_path": file_path,
        "origin_system": "TAX_LOCKER",
        "primary_ids": {
            "tax_year": tax_year,
            "form_type": form_type,
            "entity": entity_display
        },
        "participants": [entity_display],
        "start_timestamp": f"{tax_year}-01-01T00:00:00Z",
        "end_timestamp": f"{tax_year}-12-31T23:59:59Z",
        "title": f"Tax Record: {entity_display} {tax_year} {form_type}",
        "summary": f"Federal/State tax filing for {entity_display} for the year {tax_year}. Form: {form_type}.",
        "bullets": [f"{k}: {v}" for k, v in data.items()],
        "body_snippet": f"Tax Year: {tax_year}\nForm: {form_type}\nEntity: {entity_display}\nKey Data:\n" + "\n".join([f"- {k}: {v}" for k, v in data.items()]),
        "tags": ["tax", "financial", "forensic", form_type.lower().replace("-", "")],
        "extra": data
    }
    
    # Clean entity for filename
    safe_entity = re.sub(r'[^a-zA-Z0-9]', '_', entity_display)
    output_path = f"/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/evidence_cards/tax_{tax_year}_{safe_entity}_{card_id[:8]}.json"
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(card, f, indent=4)
    
    return output_path

def process_tax_locker():
    """
    Recursively scans the TAXES_LOCKER for tax returns and related documents.
    """
    locker_path = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TAXES_LOCKER"
    print(f"[*] Recursively scanning {locker_path}...")
    
    for root, dirs, files in os.walk(locker_path):
        for filename in files:
            if not filename.lower().endswith(".pdf"):
                continue
                
            file_path = os.path.join(root, filename)
            
            # Skip common noise or small files if needed, but for forensics we want most things
            # Detect year from filename or path
            year_match = re.search(r"(20\d{2})", file_path)
            if not year_match:
                continue
            actual_year = int(year_match.group(1))
            
            print(f"[*] Processing {file_path}...")
            
            text = extract_text(file_path)
            if not text:
                print(f"  [!] Failed to extract text from {filename}")
                continue
            
            # Identify form type
            form_type = "Tax Document"
            text_upper = text.upper()
            file_upper = filename.upper()
            
            if "1120S" in file_upper or "1120S" in text_upper:
                form_type = "Form 1120-S"
            elif "K-1" in file_upper or "K-1" in text_upper:
                form_type = "Schedule K-1"
            elif "1040" in file_upper or "1040" in text_upper:
                form_type = "Form 1040"
            elif "1065" in file_upper or "1065" in text_upper:
                form_type = "Form 1065"
            elif "VOUCHER" in file_upper or "VOUCHER" in text_upper:
                form_type = "Tax Voucher"
            elif "EXTENSION" in file_upper:
                form_type = "Extension Request"
                
            # Identify entity/person
            entity = "Unknown"
            path_upper = file_path.upper()
            
            if "/JZ/" in file_path or "ZANGRILLI" in path_upper or "ZANGRILLI" in text_upper:
                entity = "Joseph Zangrilli"
            elif "/LG/" in file_path or "GUARIGLIA" in path_upper or "GUARIGLIA" in text_upper:
                entity = "Lucas Guariglia"
            elif "ROWBOAT" in path_upper or "ROWBOAT" in text_upper:
                entity = "Rowboat Creative, LLC"
            
            extracted_data = extract_key_fields(text)
            
            # Fallback for empty data
            if not extracted_data:
                extracted_data = {"note": "Automated extraction returned no key fields. Manual review required."}
            
            card_path = create_tax_evidence_card(actual_year, form_type, entity, extracted_data, file_path)
            print(f"  [+] Created {form_type} Evidence Card: {os.path.basename(card_path)} (Year: {actual_year})")

if __name__ == "__main__":
    process_tax_locker()
