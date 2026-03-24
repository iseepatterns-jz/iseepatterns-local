-- Forensic Integrity Audit Results
-- Records the results of variance audits comparing statement transactions to Rosetta master.

CREATE TABLE IF NOT EXISTS forensic_audits (
    id              INTEGER PRIMARY KEY,
    audit_year      INTEGER NOT NULL,
    bank_name       TEXT NOT NULL,
    account_suffix  TEXT,
    status          TEXT DEFAULT 'RUNNING',   -- RUNNING, PASSED, WARNING, FAILED
    total_sessions  INTEGER DEFAULT 0,
    total_txns      INTEGER DEFAULT 0,
    matched_txns    INTEGER DEFAULT 0,
    unmatched_txns  INTEGER DEFAULT 0,
    match_rate      REAL DEFAULT 0.0,
    months_covered  INTEGER DEFAULT 0,
    missing_months  TEXT,                     -- JSON array of missing month numbers
    rosetta_total   INTEGER DEFAULT 0,        -- Total Rosetta master records for the year
    findings        TEXT,                     -- JSON array of audit findings
    monthly_breakdown TEXT,                   -- JSON array of per-month stats
    variance_detail TEXT,                     -- JSON array of unmatched transaction details
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_forensic_audit_year ON forensic_audits(audit_year, bank_name);
