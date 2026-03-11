import json
import os
import uuid
from datetime import datetime

def create_tax_evidence_card(tax_year, form_type, entity, data, file_path):
    """
    Creates a unified Evidence Card for a specific tax record.
    """
    card_id = str(uuid.uuid4())
    
    card = {
        "id": card_id,
        "source_type": "tax_record",
        "file_path": file_path,
        "origin_system": "TAX_LOCKER",
        "primary_ids": {
            "tax_year": tax_year,
            "form_type": form_type,
            "entity": entity
        },
        "participants": [entity],
        "start_timestamp": f"{tax_year}-01-01T00:00:00Z",
        "end_timestamp": f"{tax_year}-12-31T23:59:59Z",
        "title": f"Tax Record: {entity} {tax_year} {form_type}",
        "summary": f"Federal/State tax filing for {entity} for the year {tax_year}. Form: {form_type}.",
        "bullets": [f"{k}: {v}" for k, v in data.items()],
        "body_snippet": f"Tax Year: {tax_year}\nForm: {form_type}\nEntity: {entity}\nKey Data:\n" + "\n".join([f"- {k}: {v}" for k, v in data.items()]),
        "tags": ["tax", "financial", "forensic", form_type.lower()],
        "extra": data
    }
    
    output_path = f"/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/evidence_cards/tax_{tax_year}_{form_type.replace(' ', '_')}_{card_id[:8]}.json"
    with open(output_path, 'w') as f:
        json.dump(card, f, indent=4)
    
    return output_path

if __name__ == "__main__":
    # Sample manual mapping for 2021 Rowboat Creative 1120-S
    # In a real scenario, this would be populated by the PDF extractor
    data_2021_1120s = {
        "gross_receipts": "$10,245,321 (Estimated)",
        "cost_of_goods_sold": "$6,123,456 (Estimated)",
        "net_income": "$1,234,567 (Estimated)",
        "officer_compensation": "$450,000 (Estimated)"
    }
    
    file_2021 = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TAXES_LOCKER/RBC_BUSINESS_TAXES/RETURNS_BY_YEAR/2021/Rowboat Creative, LLC 2021 Tax Return.pdf"
    
    path = create_tax_evidence_card(2021, "1120-S", "Rowboat Creative, LLC", data_2021_1120s, file_2021)
    print(f"Created Tax Evidence Card: {path}")

    # Sample for K-1 (Lucas Guariglia)
    data_2021_k1_lg = {
        "shareholder": "Lucas Guariglia",
        "ordinary_business_income": "$617,283 (Estimated)",
        "distributions": "$200,000 (Estimated)"
    }
    
    file_k1_2021 = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TAXES_LOCKER/RBC_BUSINESS_TAXES/RETURNS_BY_YEAR/2021/Rowboat Creative, LLC 2021 K-1.pdf"
    
    path_k1 = create_tax_evidence_card(2021, "K-1", "Lucas Guariglia", data_2021_k1_lg, file_k1_2021)
    print(f"Created K-1 Evidence Card: {path_k1}")
