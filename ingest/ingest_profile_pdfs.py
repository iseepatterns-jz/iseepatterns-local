import sqlite3
import os
import json
from pathlib import Path
from pypdf import PdfReader

# Paths
PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
PLAYERS_DB = PROJECT_ROOT / "data" / "players.db"
LOCKER_BASE = PROJECT_ROOT / "data" / "LINKED_IN_PROFILE_LOCKER"

def ingest_pdfs():
    if not PLAYERS_DB.exists():
        print("❌ Missing players.db")
        return

    conn = sqlite3.connect(str(PLAYERS_DB))
    
    # Get all players to match slugs to IDs
    players = conn.execute("SELECT id, slug FROM players").fetchall()
    player_map = {slug: pid for pid, slug in players}
    print(f"[*] Processing PDFs for {len(players)} players...")

    ingest_count = 0
    for player_dir in LOCKER_BASE.iterdir():
        if not player_dir.is_dir():
            continue
            
        slug = player_dir.name
        player_id = player_map.get(slug)
        
        if not player_id:
            # Special case for Adrienne if needed, but she's hardcoded for now
            continue
            
        pdf_path = player_dir / "profile.pdf"
        if pdf_path.exists():
            print(f"   [+] Found PDF for {slug}")
            
            try:
                # Extract Text
                reader = PdfReader(str(pdf_path))
                text_content = ""
                for page in reader.pages:
                    text_content += page.extract_text() + "\n"
                
                # Update player_files
                # Use absolute path for backend serving
                relative_path = str(pdf_path.relative_to(PROJECT_ROOT))
                
                conn.execute("""
                    INSERT INTO player_files (player_id, file_type, file_path, content_text)
                    VALUES (?, 'pdf-profile', ?, ?)
                    ON CONFLICT(id) DO UPDATE SET content_text=excluded.content_text
                """, (player_id, relative_path, text_content))
                
                ingest_count += 1
            except Exception as e:
                print(f"   [!] Error processing {slug}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Ingestion complete. Processed {ingest_count} profile PDFs.")

if __name__ == "__main__":
    ingest_pdfs()
