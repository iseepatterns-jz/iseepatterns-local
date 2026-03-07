import os
import json
import uuid
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import shutil
from .evidence_card import EvidenceCard

DATA_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
CARDS_OUT = DATA_DIR / "evidence_cards"
FINANCIAL_HUB_DB = DATA_DIR / "financial" / "financial_hub.db"
QUICKBOOKS_HUB_DB = DATA_DIR / "financial" / "quickbooks_hub.db"

os.makedirs(CARDS_OUT, exist_ok=True)

def _get_db_rows(db_path: Path, table_name: str) -> List[Dict]:
    if not db_path.exists():
        return []
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        c.execute(f"SELECT * FROM {table_name}")
        rows = [dict(r) for r in c.fetchall()]
        return rows
    except Exception as e:
        print(f"Error reading {table_name} from {db_path}: {e}")
        return []
    finally:
        conn.close()

def generate_financial_cards():
    print("💳 Generating EvidenceCards from financial data...")
    
    # 1. Master Transactions
    master_rows = _get_db_rows(FINANCIAL_HUB_DB, "master_transactions")
    print(f"   Processing {len(master_rows)} master transactions...")
    for idx, row in enumerate(master_rows):
        card_id = str(uuid.uuid4())
        # Try to find a timestamp
        date_str = row.get("date") or row.get("year")
        
        primary_ids = {
            "master_row_id": str(idx),
            "description": str(row.get("description", "")),
            "amount": str(row.get("amount", ""))
        }
        if row.get("invoice_num"): primary_ids["invoice_number"] = str(row.get("invoice_num"))
        if row.get("po_number"): primary_ids["po_number"] = str(row.get("po_number"))
        if row.get("payment_identifier"): primary_ids["payment_txn_id"] = str(row.get("payment_identifier"))

        summary = f"Financial transaction: {row.get('description', 'Unknown')}. Amount: {row.get('amount', '0')}."
        bullets = [
            f"Account: {row.get('account', 'Unknown')}",
            f"Category: {row.get('category', 'Unknown')}",
            f"Responsible: {row.get('responsible', 'Unknown')}",
            f"Industry: {row.get('industry', 'Unknown')}"
        ]
        
        description = row.get("description") or ""
        card = EvidenceCard(
            id=card_id,
            source_type="financial",
            file_path=str(FINANCIAL_HUB_DB),
            origin_system="FINANCIAL_HUB",
            primary_ids=primary_ids,
            participants=[str(row.get("responsible", "")), str(row.get("user", ""))],
            start_timestamp=date_str,
            end_timestamp=date_str,
            title=f"Transaction: {description[:50]}",
            summary=summary,
            bullets=bullets,
            body_snippet=row.get("raw_json", ""),
            tags=["financial", "master_sheet", "transaction"],
            extra={"table": "master_transactions", "original_row_idx": idx}
        )
        
        with open(CARDS_OUT / f"fin_master_{idx}.json", "w") as f:
            f.write(card.to_json())

    # 2. QuickBooks Invoices
    qb_invoices = _get_db_rows(QUICKBOOKS_HUB_DB, "invoices")
    print(f"   Processing {len(qb_invoices)} QuickBooks invoices...")
    for idx, row in enumerate(qb_invoices):
        card_id = str(uuid.uuid4())
        doc_num = row.get("doc_number")
        primary_ids = {
            "qb_invoice_id": str(row.get("invoice_id")),
            "invoice_number": str(doc_num),
            "customer_id": str(row.get("customer_id"))
        }
        card = EvidenceCard(
            id=card_id,
            source_type="financial",
            file_path=str(QUICKBOOKS_HUB_DB),
            origin_system="QUICKBOOKS",
            primary_ids=primary_ids,
            participants=[str(row.get("customer_id", ""))],
            start_timestamp=row.get("date"),
            end_timestamp=row.get("date"),
            title=f"QB Invoice #{doc_num}",
            summary=f"QuickBooks Invoice for customer {row.get('customer_id')}. Amount: {row.get('amount')}.",
            bullets=[f"Due: {row.get('due_date')}", f"Desc: {row.get('description')}"],
            body_snippet=row.get("raw_json", ""),
            tags=["financial", "quickbooks", "invoice"],
            extra={"table": "invoices"}
        )
        with open(CARDS_OUT / f"qb_inv_{row.get('invoice_id')}.json", "w") as f:
            f.write(card.to_json())

    # 3. QuickBooks Bills
    qb_bills = _get_db_rows(QUICKBOOKS_HUB_DB, "bills")
    print(f"   Processing {len(qb_bills)} QuickBooks bills...")
    for idx, row in enumerate(qb_bills):
        card_id = str(uuid.uuid4())
        primary_ids = {"qb_bill_id": str(row.get("bill_id")), "vendor_id": str(row.get("vendor_id"))}
        card = EvidenceCard(
            id=card_id, source_type="financial", file_path=str(QUICKBOOKS_HUB_DB), origin_system="QUICKBOOKS",
            primary_ids=primary_ids, participants=[str(row.get("vendor_id", ""))],
            start_timestamp=row.get("date"), end_timestamp=row.get("date"),
            title=f"QB Bill: {row.get('vendor_id')}",
            summary=f"QuickBooks Bill from vendor {row.get('vendor_id')}. Amount: {row.get('amount')}.",
            bullets=[f"Due: {row.get('due_date')}", f"Desc: {row.get('description')}"],
            body_snippet=row.get("raw_json", ""), tags=["financial", "quickbooks", "bill"], extra={"table": "bills"}
        )
        with open(CARDS_OUT / f"qb_bill_{row.get('bill_id')}.json", "w") as f:
            f.write(card.to_json())

    # 4. Printavo Orders
    printavo_orders = _get_db_rows(FINANCIAL_HUB_DB, "printavo_orders")
    print(f"   Processing {len(printavo_orders)} Printavo orders...")
    for idx, row in enumerate(printavo_orders):
        card_id = str(uuid.uuid4())
        inv_num = row.get("invoice_num")
        primary_ids = {"invoice_number": str(inv_num), "customer_id": str(row.get("customer_id")), "po_number": str(row.get("po_num"))}
        card = EvidenceCard(
            id=card_id, source_type="financial", file_path=str(FINANCIAL_HUB_DB), origin_system="PRINTAVO",
            primary_ids=primary_ids, participants=[str(row.get("customer_full_name", ""))],
            start_timestamp=row.get("invoice_date"), end_timestamp=row.get("invoice_date"),
            title=f"Printavo Order #{inv_num}",
            summary=f"Printavo Order for {row.get('customer_full_name')}. Total: {row.get('total')}.",
            bullets=[f"Status: {row.get('invoice_status')}", f"PO: {row.get('po_num')}"],
            body_snippet=row.get("raw_json", ""), tags=["financial", "printavo", "order"], extra={"table": "printavo_orders"}
        )
        with open(CARDS_OUT / f"printavo_ord_{inv_num}.json", "w") as f:
            f.write(card.to_json())

    # 5. Printavo Payments
    printavo_payments = _get_db_rows(FINANCIAL_HUB_DB, "printavo_payments")
    print(f"   Processing {len(printavo_payments)} Printavo payments...")
    for idx, row in enumerate(printavo_payments):
        card_id = str(uuid.uuid4())
        txn_id = row.get("payment_transaction_id")
        primary_ids = {"payment_txn_id": str(txn_id), "invoice_number": str(row.get("invoice_num")), "customer_id": str(row.get("customer_id"))}
        card = EvidenceCard(
            id=card_id, source_type="financial", file_path=str(FINANCIAL_HUB_DB), origin_system="PRINTAVO",
            primary_ids=primary_ids, participants=[str(row.get("name", ""))],
            start_timestamp=row.get("transaction_date"), end_timestamp=row.get("transaction_date"),
            title=f"Printavo Payment: {txn_id}",
            summary=f"Printavo Payment for order #{row.get('invoice_num')}. Amount: {row.get('amount')}.",
            bullets=[f"Processor: {row.get('payment_processor')}", f"Category: {row.get('category')}"],
            body_snippet=row.get("raw_json", ""), tags=["financial", "printavo", "payment"], extra={"table": "printavo_payments"}
        )
        with open(CARDS_OUT / f"printavo_pay_{txn_id}.json", "w") as f:
            f.write(card.to_json())

    # 6. QuickBooks Purchases
    qb_purchases = _get_db_rows(QUICKBOOKS_HUB_DB, "purchases")
    print(f"   Processing {len(qb_purchases)} QuickBooks purchases...")
    for idx, row in enumerate(qb_purchases):
        card_id = str(uuid.uuid4())
        primary_ids = {"qb_purchase_id": str(row.get("purchase_id")), "account_id": str(row.get("account_id"))}
        card = EvidenceCard(
            id=card_id, source_type="financial", file_path=str(QUICKBOOKS_HUB_DB), origin_system="QUICKBOOKS",
            primary_ids=primary_ids, participants=[str(row.get("entity_id", ""))],
            start_timestamp=row.get("date"), end_timestamp=row.get("date"),
            title=f"QB Purchase: {row.get('entity_id')}",
            summary=f"QuickBooks Purchase. Amount: {row.get('amount')}.",
            bullets=[f"Account: {row.get('account_id')}", f"Payment Method: {row.get('payment_method_id')}"],
            body_snippet=row.get("raw_json", ""), tags=["financial", "quickbooks", "purchase"], extra={"table": "purchases"}
        )
        with open(CARDS_OUT / f"qb_purch_{row.get('purchase_id')}_{idx}.json", "w") as f:
            f.write(card.to_json())

    # 7. Printavo Purchase Orders
    printavo_pos = _get_db_rows(FINANCIAL_HUB_DB, "printavo_purchase_orders")
    print(f"   Processing {len(printavo_pos)} Printavo purchase orders...")
    for idx, row in enumerate(printavo_pos):
        card_id = str(uuid.uuid4())
        po_num = row.get("po")
        primary_ids = {"po_number": str(po_num), "invoice_number": str(row.get("inv"))}
        card = EvidenceCard(
            id=card_id, source_type="financial", file_path=str(FINANCIAL_HUB_DB), origin_system="PRINTAVO",
            primary_ids=primary_ids, participants=[],
            start_timestamp=None, end_timestamp=None,
            title=f"Printavo PO #{po_num}",
            summary=f"Printavo Purchase Order #{po_num} referencing Inv #{row.get('inv')}.",
            bullets=[f"Notes: {row.get('notes')}", f"Nickname: {row.get('nickname')}"],
            body_snippet=row.get("raw_json", ""), tags=["financial", "printavo", "purchase_order"], extra={"table": "printavo_purchase_orders"}
        )
        with open(CARDS_OUT / f"printavo_po_{po_num}_{idx}.json", "w") as f:
            f.write(card.to_json())

    # 8. QuickBooks Deposits
    qb_deposits = _get_db_rows(QUICKBOOKS_HUB_DB, "deposits")
    print(f"   Processing {len(qb_deposits)} QuickBooks deposits...")
    for idx, row in enumerate(qb_deposits):
        card_id = str(uuid.uuid4())
        primary_ids = {"qb_deposit_id": str(row.get("deposit_id")), "account_id": str(row.get("deposit_to_account_id"))}
        card = EvidenceCard(
            id=card_id, source_type="financial", file_path=str(QUICKBOOKS_HUB_DB), origin_system="QUICKBOOKS",
            primary_ids=primary_ids, participants=[],
            start_timestamp=row.get("date"), end_timestamp=row.get("date"),
            title=f"QB Deposit: {row.get('deposit_id')}",
            summary=f"QuickBooks Deposit. Amount: {row.get('amount')}.",
            bullets=[f"Account: {row.get('deposit_to_account_id')}", f"Total: {row.get('amount')}"],
            body_snippet=row.get("raw_json", ""), tags=["financial", "quickbooks", "deposit"], extra={"table": "deposits"}
        )
        with open(CARDS_OUT / f"qb_dep_{row.get('deposit_id')}_{idx}.json", "w") as f:
            f.write(card.to_json())

def generate_inbox_cards():
    print("📥 Generating EvidenceCards from inbox data...")
    INBOX_DIR = DATA_DIR / "inbox"
    if not INBOX_DIR.exists():
        return
    
    for memo_file in INBOX_DIR.glob("*.md"):
        print(f"   Processing memo: {memo_file.name}...")
        try:
            with open(memo_file, "r") as f:
                content = f.read()
            
            # Simple parser for basic headers
            lines = content.split("\n")
            title = memo_file.name
            priority = "Medium"
            tags = ["inbox", "memo"]
            date_str = None
            
            for line in lines:
                if line.startswith("Title: "): title = line[7:]
                if line.startswith("Priority: "): priority = line[10:]
                if line.startswith("Tags: "): tags.extend([t.strip() for t in line[6:].split(",")])
                if line.startswith("Date: "): date_str = line[6:]
            
            card_id = str(uuid.uuid4())
            card = EvidenceCard(
                id=card_id,
                source_type="memo",
                file_path=str(memo_file),
                origin_system="INBOX",
                primary_ids={"filename": memo_file.name},
                participants=[],
                start_timestamp=date_str,
                end_timestamp=date_str,
                title=title,
                summary=f"Memo: {title}",
                bullets=[f"Priority: {priority}"],
                body_snippet=content[:500],
                tags=tags,
                extra={"priority": priority}
            )
            
            with open(CARDS_OUT / f"memo_{memo_file.stem}.json", "w") as f:
                f.write(card.to_json())
            
            # Optionally move to processed folder
            processed_dir = INBOX_DIR / "processed"
            processed_dir.mkdir(exist_ok=True)
            shutil.move(str(memo_file), str(processed_dir / memo_file.name))
            
        except Exception as e:
            print(f"Error processing {memo_file}: {e}")

def run_generation():
    generate_financial_cards()
    generate_inbox_cards()
    # integrate imessage_ingest and others here
    print(f"✅ Evidence Card generation complete. Files in {CARDS_OUT}")

if __name__ == "__main__":
    run_generation()
