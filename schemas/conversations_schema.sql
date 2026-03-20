-- Conversation Playlists schema for workbench.db
-- Curated message collections to organize iMessages by topic

CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT DEFAULT '#60a5fa',
    created_at  TEXT DEFAULT (datetime('now','localtime')),
    updated_at  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_rowid   INTEGER NOT NULL,
    source_db       TEXT DEFAULT 'chat_master',
    sort_order      INTEGER,
    added_at        TEXT DEFAULT (datetime('now','localtime')),
    note            TEXT,
    PRIMARY KEY (conversation_id, message_rowid)
);

CREATE INDEX IF NOT EXISTS idx_cm_conversation ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cm_message ON conversation_messages(message_rowid);
