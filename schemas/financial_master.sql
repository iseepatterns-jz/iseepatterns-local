-- Master Financial Ledger & Audit Governance
-- This table is the System of Record for all RosettaStone-aligned transactions.

CREATE TABLE IF NOT EXISTS master_transactions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    year                INTEGER,
    date                TEXT,
    amount              REAL,
    amount_positive     REAL,
    description         TEXT,
    transaction_type    TEXT,
    account             TEXT,
    account_type        TEXT,
    bank                TEXT,
    user_label          TEXT, -- 'User' in CSV
    responsible         TEXT,
    category            TEXT,
    class               TEXT,
    entry_type          TEXT, -- 'Type' in CSV
    entry_type2         TEXT, -- 'Type2' in CSV
    department          TEXT,
    link                TEXT,
    company             TEXT,
    industry            TEXT,
    invoice_num         TEXT,
    invoice_url         TEXT,
    client              TEXT,
    notes               TEXT,
    url                 TEXT,
    order_id            TEXT,
    po_number           TEXT,
    is_personal         TEXT,
    payment_instrument  TEXT,
    payment_identifier  TEXT,
    amazon_product_cat  TEXT,
    asin                TEXT,
    title               TEXT,
    unspsc              TEXT,
    segment             TEXT,
    family              TEXT,
    commodity           TEXT,
    
    -- Forensic & Verification Metadata (Governed)
    verification_status TEXT DEFAULT 'UNVERIFIED', -- 'UNVERIFIED', 'FORENSICALLY_VERIFIED'
    forensic_file       TEXT,
    forensic_page       INTEGER,
    forensic_hash       TEXT,
    verified_at         TEXT,
    
    -- Internal technical fields
    raw_data            TEXT, -- JSON blob for any extra/unmapped columns
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- Audit Log for governance and chain of custody
CREATE TABLE IF NOT EXISTS master_audit_log (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id           INTEGER NOT NULL REFERENCES master_transactions(id),
    action              TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'VERIFY', 'DELETE'
    changed_fields      TEXT,          -- JSON of old vs new values
    reason              TEXT,
    agent_id            TEXT,          -- ID of the AI or User making the change
    timestamp           TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_master_date ON master_transactions(date);
CREATE INDEX IF NOT EXISTS idx_master_desc ON master_transactions(description);
CREATE INDEX IF NOT EXISTS idx_master_hash ON master_transactions(forensic_hash);
CREATE INDEX IF NOT EXISTS idx_audit_master ON master_audit_log(master_id);
