import json
import os
import sqlite3
from pathlib import Path

# Paths
BASE_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DB_PATH = BASE_DIR / "data/rowboat-creative/RC-2026/db/workbench.db"
CARDS_DIR = BASE_DIR / "data/evidence_cards"

def link_tax_to_ledger():
    """
    Scans Evidence Cards for tax records and links them to matching bank transactions.
    """
    if not DB_PATH.exists():
        print(f"[!] Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Find tax cards
    tax_cards = list(CARDS_DIR.glob("tax_*.json"))
    print(f"[*] Found {len(tax_cards)} tax records to process.")

    for card_path in tax_cards:
        with open(card_path, 'r') as f:
            card_data = json.load(f)

        if card_data.get("source_type") != "tax_record":
            continue

        tax_year = card_data["primary_ids"].get("tax_year")
        entity = card_data["primary_ids"].get("entity")
        form_type = card_data["primary_ids"].get("form_type")

        print(f"[*] Processing {entity} {tax_year} {form_type}...")

        # Build query based on form type and entity
        # For K-1, search for the individual
        search_term = ""
        if "Lucas" in entity or "LG" in entity:
            search_term = "LUCAS"
        elif "Joseph" in entity or "JZ" in entity:
            search_term = "ZANGRILLI"
        elif "Rowboat" in entity:
            search_term = "ROWBOAT"

        query = """
            SELECT ROWID, date, description, amount, category
            FROM master_transactions
            WHERE year = ?
            AND (description LIKE ? OR category LIKE ?)
        """
        
        # We broaden search for company returns to find major salary/equity events
        params = [tax_year, f"%{search_term}%", "%Equity%"]
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        linked_ids = []
        total_linked_value = 0.0
        
        for row in rows:
            # Basic amount conversion
            try:
                amt_str = str(row["amount"]).replace("$", "").replace(",", "").replace("(", "-").replace(")", "")
                amt = float(amt_str)
            except:
                amt = 0.0
                
            linked_ids.append({
                "transaction_id": row["ROWID"],
                "date": row["date"],
                "description": row["description"],
                "amount": row["amount"],
                "category": row["category"]
            })
            total_linked_value += amt

        # Update card data
        if "extra" not in card_data:
            card_data["extra"] = {}
            
        card_data["extra"]["linked_ledger_transactions"] = linked_ids
        card_data["extra"]["reconciled_transaction_total"] = f"${total_linked_value:,.2f}"
        
        # Add a bullet point for reconciliation
        recon_bullet = f"Reconciled Ledger Total: ${total_linked_value:,.2f} over {len(linked_ids)} transactions."
        if recon_bullet not in card_data["bullets"]:
            card_data["bullets"].append(recon_bullet)

        # Write back
        with open(card_path, 'w') as f:
            json.dump(card_data, f, indent=4)
        
        print(f"  + Linked {len(linked_ids)} transactions to card.")

    conn.close()
    print("[*] Linking process complete.")

if __name__ == "__main__":
    link_tax_to_ledger()
