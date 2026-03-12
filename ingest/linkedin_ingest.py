import sqlite3
import os
import json
from pathlib import Path

# Paths
PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "players.db"
LOCKER_BASE = PROJECT_ROOT / "data" / "LINKED_IN_PROFILE_LOCKER"

def slug_to_name(slug):
    """Simple heuristic to turn a slug into a display name."""
    # Split by common separators if any
    parts = slug.replace("-", " ").replace("_", " ").split()
    # Capitalize and join
    return " ".join([p.capitalize() for p in parts])

def ingest_linkedin_profiles():
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    
    print(f"📁 Scanning {LOCKER_BASE}...")
    
    # Get all subdirectories
    profile_dirs = [d for d in LOCKER_BASE.iterdir() if d.is_dir()]
    print(f"   Found {len(profile_dirs)} profiles.")

    count = 0
    for pdir in profile_dirs:
        slug = pdir.name
        display_name = slug_to_name(slug)
        linkedin_url = f"https://www.linkedin.com/in/{slug}"
        
        # Determine profile type
        # Heuristic: if it looks like a person name (no spaces or just 2-3 parts), it's a person
        # Some folders might be business names
        is_entity = any(x in slug.lower() for x in ["-llp", "-inc", "bank", "consulting", "agency", "creative"])
        profile_type = "entity" if is_entity else "person"

        try:
            conn.execute("""
                INSERT OR IGNORE INTO players (
                    slug, display_name, linkedin_url, profile_type
                ) VALUES (?, ?, ?, ?)
            """, (slug, display_name, linkedin_url, profile_type))
            count += 1
        except Exception as e:
            print(f"   ❌ Error ingesting {slug}: {e}")

    conn.commit()
    conn.close()
    print(f"✅ Successfully ingested {count} LinkedIn profiles into players.db.")

if __name__ == "__main__":
    ingest_linkedin_profiles()
