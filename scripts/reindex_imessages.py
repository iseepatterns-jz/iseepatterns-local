# scripts/reindex_imessages.py
import os
import sys
from pathlib import Path

# Add project root to path so we can import from ingest
sys.path.append(str(Path(__file__).parent.parent))

from ingest.imessage_ingest import generate_imessage_cards_for_db

DATA_DIR = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data")
CARDS_OUT = DATA_DIR / "evidence_cards"

M1STUDIO_DB = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db")
IMAC_DB = Path("/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/chatdb_storage/imac_2025-06-01_chatdb_old_mac_os_no_decode_needed/2025-06-01_original_file_from_imac/chat.db")

def reindex():
    print("🔄 Re-indexing iMessages with updated attribution whitelist...")
    
    # 1. Clean up old iMessage cards to prevent stale attribution
    print("🧹 Cleaning up old iMessage JSON cards...")
    count = 0
    for card in CARDS_OUT.glob("imsg_*.json"):
        card.unlink()
        count += 1
    print(f"   Removed {count} existing iMessage cards.")

    # 2. Regenerate from both source databases
    print("📥 Regenerating M1Studio iMessages...")
    generate_imessage_cards_for_db(M1STUDIO_DB, origin_system="CHAT_DB_M1STUDIO")
    
    print("📥 Regenerating iMac iMessages...")
    generate_imessage_cards_for_db(IMAC_DB, origin_system="CHAT_DB_IMAC")
    
    print("✅ iMessage re-indexing complete.")

if __name__ == "__main__":
    reindex()
