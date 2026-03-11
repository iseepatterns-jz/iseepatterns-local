import sqlite3
import json
import uuid
from pathlib import Path

DATA_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data")
WORKBENCH_DB = DATA_DIR / "rowboat-creative" / "RC-2026" / "db" / "workbench.db"
EVIDENCE_HUB_DB = DATA_DIR / "evidence_hub.db"

def cross_link_financial_evidence():
    print(f"🔗 Cross-linking Significant Financial Events to Evidence Hub...")
    
    wb_conn = sqlite3.connect(WORKBENCH_DB)
    ev_conn = sqlite3.connect(EVIDENCE_HUB_DB)
    
    # Significant Transaction Criteria:
    # 1. Amount > $5,000 (absolute value)
    # 2. Keywords: Amazon, M1, M4, Suspicious, Misappropriation, Collusion
    query = """
    SELECT * FROM transactions 
    WHERE ABS(amount) >= 5000 
       OR description LIKE '%Amazon%' 
       OR description LIKE '%Collusion%'
       OR description LIKE '%Misappropriation%'
       OR counterparty LIKE '%Amazon%'
    """
    
    txns = wb_conn.execute(query).fetchall()
    cols = [d[0] for d in wb_conn.execute("SELECT * FROM transactions LIMIT 0").description]
    
    count = 0
    for row_data in txns:
        txn = dict(zip(cols, row_data))
        
        canonical_id = f"FIN_TXN_{txn['transaction_id']}"
        title = f"Financial Transaction: {txn['counterparty'] or txn['description']} ({txn['amount']})"
        snippet = f"Date: {txn['date']}\nAmount: {txn['amount']}\nCounterparty: {txn['counterparty']}\nDescription: {txn['description']}\nSource: {txn['source']}"
        
        # INSERT into Evidence Hub
        try:
            res = ev_conn.execute("""
                INSERT OR IGNORE INTO evidence (
                    canonical_id, source_type, title, body_snippet, start_timestamp, extra
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                canonical_id,
                'financial',
                title,
                snippet,
                txn['date'],
                json.dumps({'transaction_id': txn['transaction_id'], 'source': txn['source']})
            ))
            
            if res.rowcount > 0:
                # Get the newly inserted ID
                evidence_id = ev_conn.execute("SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,)).fetchone()[0]
                
                # Update workbench.db to link back
                wb_conn.execute("UPDATE transactions SET evidence_id = ? WHERE transaction_id = ?", (evidence_id, txn['transaction_id']))
                count += 1
        except Exception as e:
            print(f"   ❌ Error linking txn {txn['transaction_id']}: {e}")

    ev_conn.commit()
    wb_conn.commit()
    ev_conn.close()
    wb_conn.close()
    
    print(f"   ✅ Successfully cross-linked {count} significant financial events.")

if __name__ == "__main__":
    cross_link_financial_evidence()
