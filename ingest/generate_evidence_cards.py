import os
import json
import uuid
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import shutil
from .evidence_card import EvidenceCard
from .imessage_ingest import generate_imessage_cards_for_db


DATA_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
CARDS_OUT = DATA_DIR / "evidence_cards"
FINANCIAL_HUB_DB = DATA_DIR / "financial" / "financial_hub.db"
QUICKBOOKS_HUB_DB = DATA_DIR / "financial" / "quickbooks_hub.db"

os.makedirs(CARDS_OUT, exist_ok=True)

M1STUDIO_DB = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db")
IMAC_DB = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_original_file_from_imac/chat.db")

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

THREADS_DIR = DATA_DIR / "EMAIL_THREAD_PUBLISH_LOCKER" / "processed" / "json"

def generate_email_thread_cards():
    print("📧 Generating EvidenceCards from email threads...")

    if not THREADS_DIR.exists():
        print(f"   No threads dir at {THREADS_DIR}, skipping.")
        return

    for json_path in THREADS_DIR.glob("thread_*.json"):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                thread = json.load(f)
        except Exception as e:
            print(f"   Error reading {json_path}: {e}")
            continue

        thread_subject = thread.get("thread_subject") or "(no subject)"
        messages = thread.get("messages", [])
        if not messages:
            continue

        # Build a compact but rich body_snippet from cleaned bodies
        snippets = []
        participants_set = set()

        for m in messages:
            from_ = m.get("from") or ""
            to_list = m.get("to") or []
            subject = m.get("subject") or ""
            body = (m.get("body_clean") or "").strip()

            header = f"From: {from_}\nTo: {', '.join(to_list)}\nSubject: {subject}"
            block = f"{header}\n\n{body}".strip()
            snippets.append(block)

            # Participants for cross-system linking
            if from_:
                participants_set.add(from_)
            for addr in to_list:
                if addr:
                    participants_set.add(addr)

        # Truncate snippet to keep cards compact
        body_snippet = ("\n\n---\n\n".join(snippets))[:4000]

        # Use headers from first message as anchors
        first = messages[0]
        msg_id = first.get("message_id") or first.get("message_id".upper()) or ""
        in_reply_to = first.get("in_reply_to") or ""
        references = first.get("references") or []

        primary_ids = {}
        if msg_id:
            primary_ids["message_id"] = msg_id

        # Store thread-level ids in extra
        extra = {
            "thread_subject": thread_subject,
            "message_count": len(messages),
        }
        if in_reply_to:
            extra["in_reply_to"] = in_reply_to
        if references:
            extra["references"] = references

        # Rough timestamps if present
        start_ts = first.get("date") or None
        end_ts = messages[-1].get("date") or start_ts

        card = EvidenceCard(
            id=str(uuid.uuid4()),
            source_type="email",
            file_path=str(json_path),
            origin_system="EMAIL_THREAD_PUBLISH_LOCKER",
            primary_ids=primary_ids,
            participants=sorted(p for p in participants_set if p),
            start_timestamp=start_ts,
            end_timestamp=end_ts,
            title=f"Email thread: {thread_subject[:80]}",
            summary=f"Email thread with {len(messages)} messages about \"{thread_subject}\".",
            bullets=[
                f"Messages: {len(messages)}",
                f"Participants: {', '.join(list(participants_set)[:5])}",
            ],
            body_snippet=body_snippet,
            tags=["email", "thread"],
            extra=extra,
        )

        out_name = f"email_thread_{json_path.stem}.json"
        out_path = CARDS_OUT / out_name
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(card.to_json())

        print(f"   Wrote email EvidenceCard: {out_path.name}")

def generate_email_message_cards():
    print("📧 Generating EvidenceCards for individual email messages...")

    if not THREADS_DIR.exists():
        print(f"   No threads dir at {THREADS_DIR}, skipping.")
        return

    for json_path in THREADS_DIR.glob("thread_*.json"):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                thread = json.load(f)
        except Exception as e:
            print(f"   Error reading {json_path}: {e}")
            continue

        thread_subject = thread.get("thread_subject") or "(no subject)"
        messages = thread.get("messages", [])
        if not messages:
            continue

        for idx, m in enumerate(messages):
            from_ = m.get("from") or ""
            to_list = m.get("to") or []
            cc_list = m.get("cc") or []
            bcc_list = m.get("bcc") or []
            subject = m.get("subject") or thread_subject
            body = (m.get("body_clean") or "").strip()

            # Raw + cleaned Message-ID
            raw_msg_id = m.get("message_id") or ""
            raw_msg_id = str(raw_msg_id).strip()
            clean_msg_id = raw_msg_id.strip("<>") if raw_msg_id else ""

            in_reply_to = (m.get("in_reply_to") or "").strip()
            references = m.get("references") or []
            date_str = m.get("date") or None

            # Primary forensic IDs
            primary_ids = {}
            if clean_msg_id:
                primary_ids["message_id"] = clean_msg_id
            # You can also store thread “root” id here if you compute it later

            participants = set()
            if from_:
                participants.add(from_)
            for addr in to_list + cc_list + bcc_list:
                if addr:
                    participants.add(addr)

            header = [
                f"From: {from_}",
                f"To: {', '.join(to_list)}",
            ]
            if cc_list:
                header.append(f"CC: {', '.join(cc_list)}")
            header.append(f"Subject: {subject}")
            if date_str:
                header.append(f"Date: {date_str}")
            if raw_msg_id:
                header.append(f"Message-ID: {raw_msg_id}")

            header_text = "\n".join(header)
            body_snippet = f"{header_text}\n\n{body}"
            body_snippet = body_snippet[:4000]

            extra = {
                "thread_subject": thread_subject,
                "thread_file": json_path.name,
                "thread_message_index": idx,
            }
            if raw_msg_id:
                extra["message_id_raw"] = raw_msg_id
            if in_reply_to:
                extra["in_reply_to"] = in_reply_to
            if references:
                extra["references"] = references

            card = EvidenceCard(
                id=str(uuid.uuid4()),
                source_type="email",
                file_path=str(json_path),
                origin_system="EMAIL_THREAD_PUBLISH_LOCKER",
                primary_ids=primary_ids,
                participants=sorted(participants),
                start_timestamp=date_str,
                end_timestamp=date_str,
                title=f"Email: {subject[:80]}",
                summary=f"Email in thread \"{thread_subject}\" from {from_} to {', '.join(to_list)}.",
                bullets=[
                    f"From: {from_}",
                    f"To: {', '.join(to_list)}",
                    f"Thread: {thread_subject[:60]}",
                ],
                body_snippet=body_snippet,
                tags=["email", "message"],
                extra=extra,
            )

            safe_idx = str(idx).zfill(3)
            base_name = json_path.stem  # thread_...
            out_name = f"email_msg_{base_name}_{safe_idx}.json"
            out_path = CARDS_OUT / out_name
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(card.to_json())

            print(f"   Wrote message EvidenceCard: {out_path.name}")


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
    generate_email_thread_cards()
    generate_email_message_cards()
    generate_imessage_cards_for_db(M1STUDIO_DB, origin_system="CHAT_DB_M1STUDIO")
    generate_imessage_cards_for_db(IMAC_DB, origin_system="CHAT_DB_IMAC")
    print(f"✅ Evidence Card generation complete. Files in {CARDS_OUT}")

if __name__ == "__main__":
    run_generation()
