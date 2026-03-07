# ingest/evidence_card.py
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
import json

@dataclass
class EvidenceCard:
    id: str                         # internal unique ID (e.g. UUID)
    source_type: str                # "email", "imessage", "legal_pdf", "financial"
    file_path: Optional[str]        # original file path if applicable
    origin_system: Optional[str]    # "MBOX_LOCKER", "CHAT_DB", "LAW_PDF", etc.

    # Core forensic anchors
    primary_ids: Dict[str, str]     # {"message_id": "...", "bates": "...", "ledger_id": "..."}
    participants: List[str]         # emails, phone numbers, entity names
    start_timestamp: Optional[str]  # ISO8601 string
    end_timestamp: Optional[str]    # ISO8601 string

    # Text for RAG
    title: Optional[str]
    summary: str                    # 1–3 sentence human-readable summary
    bullets: List[str]              # 3–10 short fact bullets
    body_snippet: str               # compact but rich text, <~512 tokens ideal

    # Extra metadata
    tags: List[str]                 # ["transaction", "fraud_suspected", ...]
    extra: Dict[str, Any]           # any structured extras (thread_id, section_num, etc.)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)
