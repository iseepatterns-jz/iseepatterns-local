-- Players and Entities Schema
-- Used for the Players API and UI profile management

CREATE TABLE IF NOT EXISTS players (
    id              INTEGER PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,     -- lowercase folder name / linkedin slug
    display_name    TEXT NOT NULL,
    title           TEXT,
    company         TEXT,
    location        TEXT,
    profile_type    TEXT DEFAULT 'person',    -- 'person', 'entity'
    skills          TEXT,                     -- JSON array or comma list
    summary         TEXT,                     -- Profile summary/bio
    linkedin_url    TEXT,
    aliases         TEXT,                     -- JSON array
    email_addresses TEXT,                     -- JSON array
    phone_numbers   TEXT,                     -- JSON array
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_players_slug ON players(slug);
CREATE TABLE IF NOT EXISTS player_files (
    id              INTEGER PRIMARY KEY,
    player_id       INTEGER NOT NULL,
    file_type       TEXT,                     -- 'image', 'document', 'resume'
    file_path       TEXT NOT NULL,
    content_text    TEXT,                     -- OCR or extracted text
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_player_files_player ON player_files(player_id);
