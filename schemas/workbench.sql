CREATE TABLE IF NOT EXISTS coc_notes_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coc_id INTEGER NOT NULL,
  note_text TEXT,
  changed_at TEXT NOT NULL,
  changed_by TEXT,
  source TEXT DEFAULT 'coc_page'
);
