-- Standardized Tax Returns Schema for Workbench
CREATE TABLE IF NOT EXISTS tax_returns (
    filing_id TEXT PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    form_type TEXT,
    filing_entity TEXT,
    filing_state TEXT,
    gross_income REAL,
    cost_of_goods_sold REAL,
    gross_profit REAL,
    total_deductions REAL,
    net_income REAL,
    officer_compensation REAL,
    distributions REAL,
    total_assets REAL,
    source_file TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tax_k1_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filing_id TEXT REFERENCES tax_returns(filing_id),
    partner_name TEXT,
    ownership_pct REAL,
    ordinary_income REAL,
    distributions REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tax_year ON tax_returns(tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_entity ON tax_returns(filing_entity);
