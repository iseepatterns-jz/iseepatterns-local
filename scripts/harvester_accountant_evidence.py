
import sqlite3
import pandas as pd
import os
import re

DB_PATH = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/accountant_correspondence.db'
LOG_PATH = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/accountant_paralegal_log.md'

# Forensic Keywords reflecting paralegal focus
FORENSIC_CATEGORIES = {
    'EXCLUSION': [
        r'don\'t tell joe', r'exclusive', r'no access', r'remove joe', 
        r'only lucas', r'private', r'separate', r'between us'
    ],
    'FINANCIAL_MANIPULATION': [
        r'draw', r'distrib', r'wire', r'transfer', r'additional account', 
        r'closure', r'close account', r'open account', r'new bank', r'erc', r'ppp'
    ],
    'SECURITY_TAMPERING': [
        r'wipe', r'delete', r'erase', r'server', r'laptop', r'security', r'access', r'clean up'
    ]
}

def harvest_evidence():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Forensic Harvesting: Methodically reviewing all emails...")
    
    # We want to look at ALL emails but flag the hits
    cursor.execute("""
        SELECT rfc822_id, date_sent, from_addr, to_addr, cc_addr, subject, cleaned_body, accountant_found, has_joe, has_lucas 
        FROM accountant_emails
        ORDER BY date_sent ASC
    """)
    
    rows = cursor.fetchall()
    evidence_cards = []
    
    for row in rows:
        rfc_id, date, from_a, to_a, cc_a, subject, body, acc, hj, hl = row
        
        # Determine Finding Category
        findings = []
        full_text = f"{subject} {body}".lower()
        
        for category, patterns in FORENSIC_CATEGORIES.items():
            for p in patterns:
                if re.search(p, full_text):
                    findings.append(category)
                    break
        
        # We also especially care if Joe is absent from a critical topic
        is_lucas_only = hl and not hj
        
        if findings or (is_lucas_only and any(kw in full_text for kw in ['draw', 'bank', 'account', 'closure'])):
            # Build an evidence card entry
            particpants = f"From: {from_a}\nTo: {to_a}\nCC: {cc_a}"
            
            card = f"### [EVIDENCE CARD] {date}\n"
            card += f"**Subject:** {subject}\n\n"
            card += f"**Participants:**\n{particpants}\n\n"
            card += f"**Paralegal Analysis:**\n"
            
            if is_lucas_only:
                card += "- **Joe Excluded**: This critical communication was sent without Joe's participation.\n"
            
            if findings:
                card += f"- **Keywords Tagged**: {', '.join(set(findings))}\n"
                
            card += f"\n**Exerpt:**\n> {body[:800]}...\n\n"
            card += "---\n"
            evidence_cards.append(card)

    # Write to File
    with open(LOG_PATH, 'w') as f:
        header = "# Accountant Correspondence Paralegal Log\n\n"
        header += f"**Review Date:** 2026-03-14\n"
        header += f"**Total Emails Scanned:** {len(rows):,}\n"
        header += f"**Notable Evidence Found:** {len(evidence_cards):,}\n\n"
        header += "This log contains structured evidence cards for accountant emails showing exclusion, financial manipulation, or security tampering.\n\n"
        f.write(header)
        for card in evidence_cards:
            f.write(card)
            
    print(f"Extraction complete. {len(evidence_cards)} cards generated in {LOG_PATH}")
    conn.close()

if __name__ == "__main__":
    harvest_evidence()
