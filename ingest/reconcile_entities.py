import sqlite3
import json
from pathlib import Path

# Paths
PROJECT_ROOT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1")
DB_PATH = PROJECT_ROOT / "data" / "evidence_hub.db"

def reconcile_entities():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    
    # 1. Define Core Entities
    core_entities = [
        {"name": "Joseph Zangrilli", "bio": "Co-founder of Rowboat Creative. Key participant in tax filings and general operations.", "tags": ["founder", "shareholder"]},
        {"name": "Lucas Guariglia", "bio": "Co-founder of Rowboat Creative. Chief Executive and key point of contact.", "tags": ["founder", "ceo", "shareholder"]},
        {"name": "Rowboat Creative, LLC", "bio": "The primary business entity. Illinois-based apparel and logistics company.", "tags": ["business", "primary"]},
        {"name": "Internal Revenue Service", "bio": "Federal tax authority.", "tags": ["agency", "tax"]},
        {"name": "Illinois Department of Revenue", "bio": "State tax authority for Illinois.", "tags": ["agency", "tax"]},
    ]

    print("[*] Ensuring core entities exist...")
    entity_ids = {}
    for ent in core_entities:
        conn.execute("""
            INSERT OR IGNORE INTO entities (name, bio, tags)
            VALUES (?, ?, ?)
        """, (ent["name"], ent["bio"], json.dumps(ent["tags"])))
        
        row = conn.execute("SELECT id FROM entities WHERE name = ?", (ent["name"],)).fetchone()
        entity_ids[ent["name"]] = row[0]

    # 2. Define Clustering Heuristics
    heuristics = [
        # Joseph Zangrilli
        {"entity": "Joseph Zangrilli", "patterns": ["zangrilli", "jz", "joe z"]},
        # Lucas Guariglia
        {"entity": "Lucas Guariglia", "patterns": ["guariglia", "lucas g", "lg"]},
        # Rowboat
        {"entity": "Rowboat Creative, LLC", "patterns": ["rowboat", "rbc"]},
        # IRS
        {"entity": "Internal Revenue Service", "patterns": ["irs", "internal revenue server", "department of the treasury"]},
        # IDOR
        {"entity": "Illinois Department of Revenue", "patterns": ["idor", "il dept of revenue", "illinois revenue"]},
    ]

    print("[*] Reconciling participants to entities...")
    participants = conn.execute("SELECT id, identifier, normalized_identifier, display_name FROM participants").fetchall()
    
    link_count = 0
    for p_id, identifier, norm_id, display_name in participants:
        match_found = False
        target_entity = None
        
        search_text = f"{identifier} {norm_id} {display_name or ''}".lower()
        
        for h in heuristics:
            for pattern in h["patterns"]:
                if pattern in search_text:
                    target_entity = h["entity"]
                    match_found = True
                    break
            if match_found: break
            
        if match_found:
            e_id = entity_ids[target_entity]
            conn.execute("""
                INSERT OR IGNORE INTO participant_entities (participant_id, entity_id, source)
                VALUES (?, ?, 'heuristic')
            """, (p_id, e_id))
            link_count += 1

    conn.commit()
    conn.close()
    print(f"✅ Successfully reconciled {link_count} participants into {len(core_entities)} entities.")

if __name__ == "__main__":
    reconcile_entities()
