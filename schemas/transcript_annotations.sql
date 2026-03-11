-- Transcript Annotations Schema (stored in workbench.db, read-write)
-- Allows line-level comments and context notes for legal transcripts

CREATE TABLE IF NOT EXISTS transcript_annotations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    transcript_slug TEXT NOT NULL,              -- References folder name in TRANSCRIPTS_LOCKER
    line_index      INTEGER NOT NULL,           -- 0-based index of the segment in the transcript
    note            TEXT NOT NULL,              -- User comment, slang explanation, or context
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trans_ann_slug ON transcript_annotations(transcript_slug);
CREATE INDEX IF NOT EXISTS idx_trans_ann_line ON transcript_annotations(transcript_slug, line_index);
