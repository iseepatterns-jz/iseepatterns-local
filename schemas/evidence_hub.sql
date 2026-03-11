-- Evidence Hub Schema
-- Single canonical store for all evidence types: iMessage, email, financial, memo
-- Supports deduplication, provenance tracking, participant linking, and FTS5 search
-- Designed for multi-case/multi-client reuse

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -64000;  -- 64MB cache

-- Core canonical evidence records (one row per unique message/record)
CREATE TABLE IF NOT EXISTS evidence (
    id              INTEGER PRIMARY KEY,
    canonical_id    TEXT NOT NULL UNIQUE,  -- dedup key: message_guid / message_id / composite
    case_id         TEXT NOT NULL DEFAULT 'RC-2026',
    client_id       TEXT NOT NULL DEFAULT 'rowboat-creative',
    source_type     TEXT NOT NULL,         -- 'imessage', 'email', 'financial', 'memo'
    title           TEXT,
    summary         TEXT,
    body_snippet    TEXT,                  -- full text for RAG, up to ~4000 chars
    start_timestamp TEXT,                  -- ISO8601 or raw Apple timestamp
    end_timestamp   TEXT,
    tags            TEXT,                  -- JSON array stored as text
    primary_ids     TEXT,                  -- JSON dict stored as text
    extra           TEXT,                  -- JSON dict stored as text
    card_id         TEXT,                  -- original EvidenceCard UUID
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Provenance: which sources contributed each evidence record
CREATE TABLE IF NOT EXISTS evidence_origins (
    id              INTEGER PRIMARY KEY,
    evidence_id     INTEGER NOT NULL REFERENCES evidence(id),
    origin_system   TEXT NOT NULL,         -- 'CHAT_DB_M1STUDIO', 'CHAT_DB_IMAC', 'EMAIL_THREAD_PUBLISH_LOCKER', etc.
    source_file     TEXT NOT NULL,         -- path to source DB or JSON file
    source_rowid    TEXT,                  -- original ROWID in source DB (nullable for non-DB sources)
    card_file       TEXT,                  -- path to the EvidenceCard JSON that was ingested
    imported_at     TEXT DEFAULT (datetime('now')),
    UNIQUE(evidence_id, origin_system, source_file)
);

-- Normalized participants (people/phone/email identifiers)
CREATE TABLE IF NOT EXISTS participants (
    id                      INTEGER PRIMARY KEY,
    identifier              TEXT NOT NULL,        -- raw value: email or phone as-is
    normalized_identifier   TEXT NOT NULL UNIQUE,  -- lowered email or digits-only phone
    display_name            TEXT                   -- optional human-readable name
);

-- Junction: evidence <-> participants (many-to-many)
CREATE TABLE IF NOT EXISTS evidence_participants (
    id              INTEGER PRIMARY KEY,
    evidence_id     INTEGER NOT NULL REFERENCES evidence(id),
    participant_id  INTEGER NOT NULL REFERENCES participants(id),
    role            TEXT DEFAULT 'participant',  -- 'sender', 'recipient', 'cc', 'bcc', 'participant'
    UNIQUE(evidence_id, participant_id, role)
);

-- Full-text search index (content synced from evidence table)
CREATE VIRTUAL TABLE IF NOT EXISTS evidence_fts USING fts5(
    title,
    summary,
    body_snippet,
    content=evidence,
    content_rowid=id
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id, client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_source_type ON evidence(source_type);
CREATE INDEX IF NOT EXISTS idx_evidence_start_ts ON evidence(start_timestamp);
CREATE INDEX IF NOT EXISTS idx_evidence_card_id ON evidence(card_id);
CREATE INDEX IF NOT EXISTS idx_origins_evidence_id ON evidence_origins(evidence_id);
CREATE INDEX IF NOT EXISTS idx_origins_system ON evidence_origins(origin_system);
CREATE INDEX IF NOT EXISTS idx_ep_evidence ON evidence_participants(evidence_id);
CREATE INDEX IF NOT EXISTS idx_ep_participant ON evidence_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_participants_norm ON participants(normalized_identifier);

-- FTS triggers: keep FTS5 in sync with evidence table on insert/update/delete
CREATE TRIGGER IF NOT EXISTS evidence_ai AFTER INSERT ON evidence BEGIN
    INSERT INTO evidence_fts(rowid, title, summary, body_snippet)
    VALUES (new.id, new.title, new.summary, new.body_snippet);
END;

CREATE TRIGGER IF NOT EXISTS evidence_ad AFTER DELETE ON evidence BEGIN
    INSERT INTO evidence_fts(evidence_fts, rowid, title, summary, body_snippet)
    VALUES ('delete', old.id, old.title, old.summary, old.body_snippet);
END;

CREATE TRIGGER IF NOT EXISTS evidence_au AFTER UPDATE ON evidence BEGIN
    INSERT INTO evidence_fts(evidence_fts, rowid, title, summary, body_snippet)
    VALUES ('delete', old.id, old.title, old.summary, old.body_snippet);
    INSERT INTO evidence_fts(rowid, title, summary, body_snippet)
    VALUES (new.id, new.title, new.summary, new.body_snippet);
END;
