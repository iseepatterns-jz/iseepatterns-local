-- Evidence Annotations Schema (stored in workbench.db, read-write)
-- Allows highlighting text, flagging, tagging, and adding notes to evidence records

CREATE TABLE IF NOT EXISTS evidence_annotations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id     INTEGER NOT NULL,           -- References evidence.id in evidence_hub.db
    annotation_type TEXT NOT NULL DEFAULT 'highlight',  -- 'highlight', 'flag', 'note', 'tag'
    selected_text   TEXT,                       -- The highlighted text excerpt
    note            TEXT,                       -- User note / comment
    color           TEXT DEFAULT '#fbbf24',     -- Highlight color (amber default)
    flag_level      TEXT,                       -- 'critical', 'important', 'review', 'info'
    tags            TEXT,                       -- JSON array of user tags
    created_by      TEXT DEFAULT 'investigator',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ann_evidence ON evidence_annotations(evidence_id);
CREATE INDEX IF NOT EXISTS idx_ann_type ON evidence_annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_ann_flag ON evidence_annotations(flag_level);
