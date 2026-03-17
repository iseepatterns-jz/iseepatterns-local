-- Financial Statement Import & Forensic Hub Schema
-- Handles PDF imports, hashing, and human-in-the-loop review.

CREATE TABLE IF NOT EXISTS statement_files (
    id                  INTEGER PRIMARY KEY,
    original_filename   TEXT NOT NULL,
    storage_path        TEXT NOT NULL,
    sha256_hash         TEXT NOT NULL UNIQUE,
    size_bytes          INTEGER NOT NULL,
    bank_name           TEXT,
    statement_type      TEXT DEFAULT 'CREDIT_CARD', -- 'CREDIT_CARD', 'CHECKING'
    period_start        TEXT,
    period_end          TEXT,
    uploaded_at         TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_sessions (
    id                  INTEGER PRIMARY KEY,
    statement_file_id   INTEGER NOT NULL REFERENCES statement_files(id),
    status              TEXT DEFAULT 'PENDING', -- 'PENDING', 'PARSING', 'REVIEW', 'COMPLETE', 'FAILED'
    transaction_count   INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS statement_transactions (
    id                  INTEGER PRIMARY KEY,
    import_session_id   INTEGER NOT NULL REFERENCES import_sessions(id),
    statement_file_id   INTEGER NOT NULL REFERENCES statement_files(id),
    date                TEXT NOT NULL,
    description_raw     TEXT NOT NULL,
    amount              REAL NOT NULL,
    currency            TEXT DEFAULT 'USD',
    page_number         INTEGER,
    parsed_account_id   TEXT,
    
    -- Human annotation fields
    player_id           INTEGER, -- Link to players table
    final_account_id    TEXT,    -- Assigned card/account label
    notes               TEXT,
    tags                TEXT,    -- JSON array
    review_status       TEXT DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'REVIEWED', 'FLAGGED'
    flag_reason         TEXT,
    
    -- Forensic verification fields
    master_id           INTEGER, -- ID/Row index in the master CSV
    verification_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'MATCHED', 'UNVERIFIED'
    
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stmt_hash ON statement_files(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_st_session ON statement_transactions(import_session_id);
CREATE INDEX IF NOT EXISTS idx_st_review ON statement_transactions(review_status);
CREATE INDEX IF NOT EXISTS idx_st_player ON statement_transactions(player_id);
