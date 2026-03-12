import sqlite3
import os
import json
from pathlib import Path

# Paths
PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
PLAYERS_DB = PROJECT_ROOT / "data" / "players.db"
HUB_DB = PROJECT_ROOT / "data" / "evidence_hub.db"

def bridge_players():
    if not PLAYERS_DB.exists() or not HUB_DB.exists():
        print("❌ Missing database(s)")
        return

    p_conn = sqlite3.connect(str(PLAYERS_DB))
    h_conn = sqlite3.connect(str(HUB_DB))
    h_conn.execute("PRAGMA foreign_keys = ON")
    
    players = p_conn.execute("SELECT slug, display_name, linkedin_url FROM players").fetchall()
    print(f"[*] Processing {len(players)} players from locker...")

    bridge_count = 0
    for slug, display_name, url in players:
        # Normalize name for better matching
        # e.g. "Joseph Zangrilli" -> "josephzangrilli"
        clean_name = display_name.lower().replace(" ", "")
        # e.g. "joseph-zangrilli-248a52195" -> "josephzangrilli" (rough name match)
        clean_slug = "".join([c for c in slug.lower() if c.isalpha()])
        
        # 1. Ensure Entity exists in Hub
        h_conn.execute("""
            INSERT OR IGNORE INTO entities (name, bio, tags)
            VALUES (?, ?, ?)
        """, (display_name, f"LinkedIn Profile: {url}", json.dumps(["linkedin-auto"])))
        
        entity_row = h_conn.execute("SELECT id FROM entities WHERE name = ?", (display_name,)).fetchone()
        entity_id = entity_row[0]

        # 2. Match participants
        # We search with 4 strategies:
        # 1. Identifier contains slug prefix (e.g. jzangrilli@xxx contains jzangrilli)
        # 2. Identifier matches clean slug (e.g. josephzangrilli@xxx)
        # 3. Display name matches LinkedIn display name
        # 4. Domain matching for entities (e.g. allworldagency.com for Allworldagency)
        
        sql = """
            SELECT id, identifier FROM participants 
            WHERE lower(identifier) LIKE ? 
               OR lower(identifier) LIKE ?
               OR lower(display_name) LIKE ?
               OR lower(identifier) LIKE ?
               OR replace(lower(display_name), ' ', '') = ?
               OR lower(identifier) LIKE ?
        """
        
        # Heuristics
        slug_prefix = slug.split("-")[0]
        domain_pattern = f"%@{slug}%" if len(slug) > 5 and not "-" in slug else "NONE_MATCH"
        clean_slug_pattern = f"%{clean_slug[:10]}%" if len(clean_slug) > 5 else "NONE_MATCH"

        matches = h_conn.execute(sql, (
            f"%{slug}%",            # Strategy 1 (Exact slug in ID)
            f"%{slug_prefix}%",     # Strategy 1b (Slug prefix)
            f"%{display_name}%",    # Strategy 3 (Exact display name)
            domain_pattern,         # Strategy 4 (Domain)
            clean_name,             # Strategy 3b (Concatenated name)
            clean_slug_pattern      # Strategy 2 (Concatenated slug)
        )).fetchall()

        for p_id, identifier in matches:
            # Low confidence for very broad prefix matches
            confidence = 0.95
            if slug_prefix in identifier and not slug in identifier:
                confidence = 0.7

            h_conn.execute("""
                INSERT OR IGNORE INTO participant_entities (participant_id, entity_id, source, confidence)
                VALUES (?, ?, 'linkedin-bridge', ?)
            """, (p_id, entity_id, confidence))
            bridge_count += 1
            print(f"   [+] Linked {identifier} to {display_name} (conf={confidence})")

    h_conn.commit()
    p_conn.close()
    h_conn.close()
    print(f"✅ Bridge complete. Linked {bridge_count} identities across the Hub.")

if __name__ == "__main__":
    bridge_players()
