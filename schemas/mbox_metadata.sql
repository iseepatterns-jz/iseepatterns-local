-- Chain of custody: locker_source → zip file → mbox file → message
-- Ingested artifacts are tracked in chain_of_custody

CREATE TABLE IF NOT EXISTS chain_of_custody (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_path     TEXT,
    source_type     TEXT,
    sha256          TEXT,
    size_bytes      INTEGER,
    case_id         TEXT,
    notes           TEXT,
    ingested_at     TEXT DEFAULT (datetime('now'))
);

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS emails (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    rfc822_id       TEXT NOT NULL,
    gmail_id        TEXT,
    filename        TEXT,                   -- FileName from metadata CSV
    account         TEXT NOT NULL,
    labels_raw      TEXT,                   -- Raw comma-separated Gmail labels
    category        TEXT,                   -- Derived: inbox/sent/draft/spam/trash/deleted/archived
    from_addr       TEXT,
    subject         TEXT,
    to_addr         TEXT,
    cc_addr         TEXT,
    bcc_addr        TEXT,
    date_sent       TEXT,
    date_received   TEXT,
    thread_count    INTEGER DEFAULT 0,
    locker_source   TEXT NOT NULL,          -- ALL / LEGAL / SG
    zip_source      TEXT,                   -- Which zip file contained the mbox
    mbox_source     TEXT,                   -- Which .mbox file inside the zip
    body            TEXT,                   -- Full body (Phase 2)
    body_single     TEXT,                   -- First-message-only body (Phase 2)
    in_reply_to     TEXT,                   -- Message-ID this is replying to
    refs            TEXT,                   -- Space-separated Message-IDs in thread
    has_body        INTEGER DEFAULT 0,
    is_spam         INTEGER DEFAULT 0,
    is_draft        INTEGER DEFAULT 0,
    is_trash        INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    UNIQUE(rfc822_id, account)
);

CREATE TABLE IF NOT EXISTS drive_links (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    rfc822_id       TEXT NOT NULL,
    account         TEXT NOT NULL,
    gmail_id        TEXT,
    drive_url       TEXT NOT NULL,
    drive_item_id   TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_rfc822      ON emails(rfc822_id);
CREATE INDEX IF NOT EXISTS idx_emails_account     ON emails(account);
CREATE INDEX IF NOT EXISTS idx_emails_category    ON emails(category);
CREATE INDEX IF NOT EXISTS idx_emails_date_sent   ON emails(date_sent);
CREATE INDEX IF NOT EXISTS idx_emails_spam        ON emails(is_spam);
CREATE INDEX IF NOT EXISTS idx_emails_from        ON emails(from_addr);
CREATE INDEX IF NOT EXISTS idx_emails_has_body    ON emails(has_body);
CREATE INDEX IF NOT EXISTS idx_emails_reply_to    ON emails(in_reply_to);
CREATE INDEX IF NOT EXISTS idx_emails_refs        ON emails(refs);
CREATE INDEX IF NOT EXISTS idx_drive_rfc822       ON drive_links(rfc822_id);
CREATE INDEX IF NOT EXISTS idx_drive_account      ON drive_links(account);

-- FTS5 for body search (populated in Phase 2)
CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
    subject, body, from_addr, to_addr,
    content='emails',
    content_rowid='id'
);

-- Auto-sync FTS on insert/update
CREATE TRIGGER IF NOT EXISTS emails_fts_ai AFTER INSERT ON emails BEGIN
    INSERT INTO emails_fts(rowid, subject, body, from_addr, to_addr)
    VALUES (new.id, new.subject, new.body, new.from_addr, new.to_addr);
END;

CREATE TRIGGER IF NOT EXISTS emails_fts_au AFTER UPDATE ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, body, from_addr, to_addr)
    VALUES ('delete', old.id, old.subject, old.body, old.from_addr, old.to_addr);
    INSERT INTO emails_fts(rowid, subject, body, from_addr, to_addr)
    VALUES (new.id, new.subject, new.body, new.from_addr, new.to_addr);
END;

CREATE TRIGGER IF NOT EXISTS emails_fts_ad AFTER DELETE ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, body, from_addr, to_addr)
    VALUES ('delete', old.id, old.subject, old.body, old.from_addr, old.to_addr);
END;
