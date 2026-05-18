CREATE TABLE IF NOT EXISTS coc_notes_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coc_id INTEGER NOT NULL,
  note_text TEXT,
  changed_at TEXT NOT NULL,
  changed_by TEXT,
  source TEXT DEFAULT 'coc_page'
);

CREATE TABLE IF NOT EXISTS description_edits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  created_by TEXT,
  superseded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_desc_edits_target 
  ON description_edits(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_desc_edits_active 
  ON description_edits(target_type, target_id, version DESC) 
  WHERE superseded_at IS NULL;
