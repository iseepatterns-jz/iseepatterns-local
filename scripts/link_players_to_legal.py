import sqlite3
import os
import json
import hashlib
from pathlib import Path
import pypdf

# Paths
PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
PLAYERS_DB = PROJECT_ROOT / "data" / "players.db"
HUB_DB = PROJECT_ROOT / "data" / "evidence_hub.db"
COURT_LOCKER = PROJECT_ROOT / "data" / "COURT_LOCKER"

def get_hash(filepath):
    """Generate a stable canonical ID for a file."""
    return hashlib.md5(str(filepath).encode()).hexdigest()

def extract_text(pdf_path):
    """Extract text from a PDF file."""
    try:
        reader = pypdf.PdfReader(pdf_path)
        full_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
        return "\n\n".join(full_text)
    except Exception as e:
        print(f"Error extracting {pdf_path}: {e}")
        return None

def link_players():
    if not PLAYERS_DB.exists() or not HUB_DB.exists():
        print("❌ Missing database(s)")
        return

    p_conn = sqlite3.connect(str(PLAYERS_DB))
    h_conn = sqlite3.connect(str(HUB_DB))
    h_conn.execute("PRAGMA foreign_keys = ON")
    
    # Get all players and aliases
    players = p_conn.execute("SELECT id, display_name, aliases, slug FROM players").fetchall()
    player_data = []
    for p_id, name, aliases_json, slug in players:
        aliases = json.loads(aliases_json) if aliases_json else []
        player_data.append({
            "id": p_id,
            "name": name,
            "aliases": aliases + [name.lower(), slug.lower()],
            "slug": slug
        })

    print(f"[*] Loaded {len(player_data)} players. Scanning COURT_LOCKER...")

    # Recursively find all PDFs
    pdf_files = list(COURT_LOCKER.rglob("*.pdf"))
    print(f"[*] Found {len(pdf_files)} legal documents.")

    merged_count = 0
    link_count = 0

    for pdf_path in pdf_files:
        rel_path = pdf_path.relative_to(PROJECT_ROOT)
        canonical_id = f"legal_{get_hash(pdf_path)}"
        
        # 1. Ingest into Evidence Hub if not already there
        content = extract_text(pdf_path)
        if not content:
            continue

        h_conn.execute("""
            INSERT OR IGNORE INTO evidence (canonical_id, source_type, title, summary, body_snippet)
            VALUES (?, 'legal', ?, ?, ?)
        """, (canonical_id, pdf_path.name, f"Legal Document: {pdf_path.name}", content[:4000]))
        
        # Get the internal ID
        evidence_row = h_conn.execute("SELECT id FROM evidence WHERE canonical_id = ?", (canonical_id,)).fetchone()
        evidence_id = evidence_row[0]

        # Ensure origin record
        h_conn.execute("""
            INSERT OR IGNORE INTO evidence_origins (evidence_id, origin_system, source_file)
            VALUES (?, 'COURT_LOCKER', ?)
        """, (evidence_id, str(rel_path)))

        # 2. Match players in text
        content_lower = content.lower()
        matched_players = []
        for p in player_data:
            # Check for exact display name or any alias
            found = False
            if p["name"].lower() in content_lower:
                found = True
            else:
                for alias in p["aliases"]:
                    if alias and len(alias) > 1 and alias in content_lower:
                        found = True
                        break
            
            if found:
                matched_players.append(p)

        # 3. Create participant links
        for p in matched_players:
            # Ensure a participant entry exists for this player slug
            participant_id_str = f"player:{p['slug']}"
            h_conn.execute("""
                INSERT OR IGNORE INTO participants (identifier, normalized_identifier, display_name)
                VALUES (?, ?, ?)
            """, (participant_id_str, participant_id_str, p["name"]))
            
            p_row = h_conn.execute("SELECT id FROM participants WHERE normalized_identifier = ?", (participant_id_str,)).fetchone()
            p_id = p_row[0]

            # Link evidence to participant
            h_conn.execute("""
                INSERT OR IGNORE INTO evidence_participants (evidence_id, participant_id, role)
                VALUES (?, ?, 'mentioned')
            """, (evidence_id, p_id))
            link_count += 1

        merged_count += 1
        if merged_count % 10 == 0:
            print(f"    Processed {merged_count}/{len(pdf_files)} documents...")

    h_conn.commit()
    p_conn.close()
    h_conn.close()
    print(f"✅ Legal ingestion complete. Merged {merged_count} docs and created {link_count} player associations.")

if __name__ == "__main__":
    link_players()
