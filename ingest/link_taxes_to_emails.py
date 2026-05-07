import sqlite3
import json
import re
from pathlib import Path

# Paths
PROJECT_ROOT = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "evidence_hub.db"

def link_taxes_to_emails():
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    
    # 1. Get all tax records
    tax_records = conn.execute("SELECT id, title, primary_ids FROM evidence WHERE source_type = 'tax'").fetchall()
    print(f"📁 Analyzing {len(tax_records)} tax records for email links...")

    links_created = 0
    
    for tax in tax_records:
        tax_id = tax['id']
        tax_title = tax['title']
        
        # Extract year from title or primary_ids
        year_match = re.search(r"(20\d{2})", tax_title)
        if not year_match:
            continue
        year = year_match.group(1)
        
        # 2. Find emails that mention this year and tax/return
        # We'll search in title and summary
        search_term = f"%{year}%tax%"
        search_term_alt = f"%tax%return% {year}%"
        
        email_matches = conn.execute("""
            SELECT id, title FROM evidence 
            WHERE source_type = 'email' 
            AND (title LIKE ? OR summary LIKE ? OR title LIKE ? OR summary LIKE ?)
        """, (search_term, search_term, search_term_alt, search_term_alt)).fetchall()
        
        for email in email_matches:
            email_id = email['id']
            
            # Create link
            try:
                conn.execute("""
                    INSERT OR IGNORE INTO evidence_links (
                        source_id, target_id, link_type, metadata
                    ) VALUES (?, ?, 'discusses', ?)
                """, (email_id, tax_id, json.dumps({"reason": f"Email title '{email['title']}' mentions tax year {year}"})))
                
                # Bi-directional or inverse link? 
                # Let's just do source=email, target=tax with link_type='discusses'
                
                links_created += 1
            except Exception as e:
                print(f"  ❌ Error linking {email_id} to {tax_id}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Successfully created {links_created} links between emails and tax records.")

if __name__ == "__main__":
    link_taxes_to_emails()
