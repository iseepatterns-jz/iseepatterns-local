-- Reconstructed Missing Schemas

-- Exhibit Sections (for Workbench)
CREATE TABLE IF NOT EXISTS exhibit_sections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    prefix      TEXT NOT NULL,
    types       TEXT DEFAULT '["email"]', -- JSON array
    description TEXT,
    sort_order  INTEGER DEFAULT 0
);

-- Evidence Assignments
CREATE TABLE IF NOT EXISTS evidence_assignments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id     TEXT NOT NULL,
    evidence_type   TEXT NOT NULL,         -- 'email', 'imessage'
    section_id      INTEGER REFERENCES exhibit_sections(id),
    target_section  TEXT,                  -- fallback for name-based lookup
    notes           TEXT,
    position        INTEGER DEFAULT 0,
    assigned_at     TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_assignments_unique
    ON evidence_assignments(evidence_id, evidence_type, target_section);

-- Workbench Audit Trail
CREATE TABLE IF NOT EXISTS workbench_audit (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    action      TEXT NOT NULL,
    target_type TEXT,
    target_id   TEXT,
    details     TEXT,                     -- JSON details
    created_at  TEXT DEFAULT (datetime('now'))
);

-- Cleaning Overrides (versioned, with supersede chain)
CREATE TABLE IF NOT EXISTS cleaning_overrides (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id     TEXT NOT NULL,
    evidence_type   TEXT NOT NULL,
    rule_type       TEXT NOT NULL,         -- 'flag_for_review', 'strip_signature', 'remove_line', etc.
    params          TEXT,                  -- JSON params
    reason          TEXT,
    version         INTEGER DEFAULT 1,
    superseded_at   TEXT,                  -- NULL = active
    created_at      TEXT DEFAULT (datetime('now'))
);

-- Timeline Events
CREATE TABLE IF NOT EXISTS timeline_events (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id        TEXT NOT NULL UNIQUE,
    date            TEXT NOT NULL,        -- ISO date
    date_label      TEXT,                 -- human readable date
    title           TEXT NOT NULL,
    description     TEXT,
    category        TEXT,
    severity        TEXT,                 -- 'INFO', 'LOW', 'HIGH', 'CRITICAL'
    claims          TEXT,                 -- JSON array of claim slugs
    sources         TEXT,                 -- JSON array of evidence IDs
    lg_involved     INTEGER DEFAULT 0,
    jz_involved     INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Case Corner: Claims
CREATE TABLE IF NOT EXISTS claims (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    category        TEXT,
    severity        TEXT,                 -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    status          TEXT DEFAULT 'NEW',   -- 'NEW', 'RESEARCHING', 'DRAFTED', 'FINAL'
    legal_elements  TEXT,                 -- JSON array
    description     TEXT,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Case Corner: Claim Notes
CREATE TABLE IF NOT EXISTS claim_notes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id        INTEGER NOT NULL REFERENCES claims(id),
    role            TEXT NOT NULL,        -- 'user', 'assistant', 'system'
    content         TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Case Corner: Claim Evidence
CREATE TABLE IF NOT EXISTS claim_evidence (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id        INTEGER NOT NULL REFERENCES claims(id),
    evidence_id     TEXT NOT NULL,
    evidence_type   TEXT NOT NULL,
    relevance       TEXT,                 -- 'DIRECT', 'CIRCUMSTANTIAL', 'CONTEXT'
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);

-- Case Corner: Claim Players
CREATE TABLE IF NOT EXISTS claim_players (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id        INTEGER NOT NULL REFERENCES claims(id),
    player_slug     TEXT NOT NULL,
    player_name     TEXT NOT NULL,
    role            TEXT,                 -- 'SUBJECT', 'WITNESS', 'VICTIM', 'CONSPIRATOR'
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
);

-- Case Corner: Agency Submissions
CREATE TABLE IF NOT EXISTS agency_submissions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                TEXT NOT NULL UNIQUE,
    title               TEXT NOT NULL,
    agency_type         TEXT,             -- 'FEDERAL', 'STATE', 'LOCAL'
    submission_method   TEXT,             -- 'EMAIL', 'PORTAL', 'PHONE', 'MAIL'
    contact_info        TEXT,             -- JSON dict
    status              TEXT DEFAULT 'TODO', -- 'TODO', 'SUBMITTED', 'PENDING', 'ACCEPTED'
    sort_order          INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);
