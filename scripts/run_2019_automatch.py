import sqlite3
import re
import os
from datetime import datetime

# --- Configuration ---
DB_PATH = "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db"
SESSION_IDS = [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]
PLAYER_JZ = 28
PLAYER_LG = 25
PLAYER_PH = 45

# Noise words to ignore in description matching
NOISE = {
    'the', 'inc', 'chi', 'llc', 'com', 'store', 'corp', 'pay', 'payment', 'transfer', 'service', 'services',
    'chicago', 'il', 'chigaco', 'ny', 'nyc', 'sf', 'la', 'us', 'usa', 'terminal', 'pos', 'purchase', 'debit', 'credit', 'point', 'sale', 'auth', 'authorized', 'transaction',
    'wa', 'tx', 'ca', 'ga', 'nj', 'mi', 'oh', 'pa', 'fl', 'az', 'va', 'ma', 'md'
}

def normalize_desc(d):
    if not d: return set()
    d = d.lower()
    d = d.replace('amzn', 'amazon').replace('mktp', 'marketplace')
    words = re.sub(r'[^a-z0-9\s]', ' ', d).split()
    return {w for w in words if len(w) >= 3 and w not in NOISE}

def has_overlap(d1, d2):
    w1 = normalize_desc(d1)
    w2 = normalize_desc(d2)
    if not w1 or not w2: return False
    return not w1.isdisjoint(w2)

def run_automatch():
    if not os.path.exists(DB_PATH):
        print(f"Error: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print(f"--- 2019 Automatch Started ---")

    for session_id in SESSION_IDS:
        print(f"Processing Session {session_id}...")
        
        # 1. Get Session Info
        cursor.execute("""
            SELECT s.id, f.original_filename, f.statement_type
            FROM import_sessions s
            JOIN statement_files f ON s.statement_file_id = f.id
            WHERE s.id = ?
        """, (session_id,))
        session = cursor.fetchone()
        if not session:
            print(f"  Session {session_id} not found. Skipping.")
            continue

        filename = session['original_filename']
        # Parse Month/Year from filename (e.g. 20190410-statements-0404.pdf)
        match = re.search(r'^(\d{4})(\d{2})(\d{2})', filename)
        if match:
            stmt_year = int(match.group(1))
            stmt_month = int(match.group(2))
        else:
            print(f"  Could not parse date from filename: {filename}. Skipping.")
            continue

        acct_match = re.search(r'(\d{4})\.pdf$', filename) or re.search(r'-(\d{4})-', filename)
        stmt_acct = acct_match.group(1) if acct_match else None

        # 2. Reset existing matches for this session
        cursor.execute("""
            UPDATE statement_transactions 
            SET master_id = NULL, verification_status = 'PENDING', match_score = 0, match_reason = NULL,
                rosetta_user = NULL, rosetta_account = NULL, rosetta_category = NULL, rosetta_company = NULL
            WHERE import_session_id = ? AND (verification_status = 'MATCHED' OR verification_status = 'PENDING')
        """, (session_id,))

        # 3. Get Forensic Transactions
        cursor.execute("SELECT * FROM statement_transactions WHERE import_session_id = ?", (session_id,))
        forensic_txns = cursor.fetchall()
        
        match_count = 0
        used_master_ids = set()

        for ft in forensic_txns:
            f_id = ft['id']
            f_amount = abs(ft['amount'])
            f_desc = (ft['description_raw'] or "").lower()
            
            # Parse forensic date (MM/DD)
            f_date_parts = ft['date'].split('/')
            f_m = int(f_date_parts[0])
            f_d = int(f_date_parts[1])
            
            # Estimate Year
            f_year = stmt_year
            if f_m > stmt_month and stmt_month < 6: f_year = stmt_year - 1
            elif f_m < stmt_month and stmt_month == 12 and f_m == 1: f_year = stmt_year + 1

            # 4. Find potential matches by amount (±$0.05)
            cursor.execute("""
                SELECT id, date, description, amount, user_label, account, account_type, category 
                FROM master_transactions 
                WHERE abs(abs(CAST(REPLACE(REPLACE(COALESCE(amount, '0'), '$', ''), ',', '') AS REAL)) - ?) <= 0.05
            """, (f_amount,))
            candidates = cursor.fetchall()

            best_candidate = None
            max_score = -1
            final_reasons = []

            for c in candidates:
                if c['id'] in used_master_ids: continue

                # Parse Master Date (M/D/Y)
                c_date_str = c['date'] or ""
                c_match = re.search(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', c_date_str)
                if not c_match: continue
                
                c_m = int(c_match.group(1))
                c_d = int(c_match.group(2))
                c_y = int(c_match.group(3))
                if c_y < 100: c_y += 2000

                # Date Filtering
                month_diff = abs(c_m - f_m)
                if month_diff > 1: continue
                
                day_diff = abs(c_d - f_d)
                
                # Scoring
                score = 40
                reasons = ["Amt"]

                if month_diff == 0: reasons.append("SameMonth")
                else: score -= 10; reasons.append("AdjMonth")

                if day_diff == 0: score += 15; reasons.append("ExactDay")
                elif day_diff <= 1: score += 12; reasons.append("Day±1")
                elif day_diff <= 3: score += 8; reasons.append("Day±3")
                elif day_diff <= 7: score += 3; reasons.append(f"Day±{day_diff}")
                else: score -= 5; reasons.append(f"Day±{day_diff}")

                if c_y == f_year: score += 15; reasons.append("YearMatch")
                else: score -= 40; reasons.append(f"YearMismatch({c_y}vs{f_year})")

                if stmt_acct and c['account'] == stmt_acct: score += 20; reasons.append("AcctDigits")

                c_desc = (c['description'] or "").lower()
                clean_c = re.sub(r'[^a-z0-9]', '', c_desc)
                clean_f = re.sub(r'[^a-z0-9]', '', f_desc)
                
                if clean_c in clean_f or clean_f in clean_c:
                    score += 20; reasons.append("DescMatch")
                elif has_overlap(f_desc, c_desc):
                    score += 10; reasons.append("DescFuzzy")
                else:
                    score -= 20; reasons.append("DescMismatch")

                if score > max_score:
                    max_score = score
                    best_candidate = c
                    final_reasons = reasons

            if best_candidate and max_score >= 50:
                used_master_ids.add(best_candidate['id'])
                
                user_label = (best_candidate['user_label'] or "").strip().upper()
                player_id = None
                if user_label == 'JZ': player_id = PLAYER_JZ
                elif user_label == 'LG': player_id = PLAYER_LG
                elif user_label == 'PH': player_id = PLAYER_PH

                reason_str = f"[Paralegal] {'+'.join(final_reasons)} Match (Score: {max_score})"
                
                cursor.execute("""
                    UPDATE statement_transactions 
                    SET master_id = ?, 
                        verification_status = 'MATCHED',
                        rosetta_user = ?, 
                        rosetta_account = ?, 
                        rosetta_category = ?, 
                        rosetta_company = ?,
                        match_score = ?, 
                        match_reason = ?,
                        final_account_id = ?, 
                        player_id = ?,
                        nc_flag = 0
                    WHERE id = ?
                """, (
                    best_candidate['id'],
                    best_candidate['user_label'] or '',
                    best_candidate['account'] or '',
                    best_candidate['category'] or '',
                    best_candidate['description'] or '',
                    max_score,
                    reason_str,
                    best_candidate['account'] or None,
                    player_id,
                    f_id
                ))
                match_count += 1

        print(f"  Matched {match_count} / {len(forensic_txns)} transactions.")

    conn.commit()
    conn.close()
    print(f"--- 2019 Automatch Completed ---")

if __name__ == "__main__":
    run_automatch()
