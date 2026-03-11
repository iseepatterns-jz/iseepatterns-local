-- Standardized Transactions Schema for Workbench
CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,
    institution TEXT,
    account_type TEXT,
    currency TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(account_id),
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    counterparty TEXT,
    memo TEXT,
    transaction_type TEXT,
    category TEXT,
    source TEXT, -- 'RBC', 'PRINTAVO', 'QUICKBOOKS'
    evidence_id INTEGER, -- Link to evidence_hub.db/evidence.id if relevant
    raw_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_txn_evidence ON transactions(evidence_id);
