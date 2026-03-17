const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db';

try {
    const db = new Database(dbPath);
    db.prepare("ALTER TABLE import_sessions ADD COLUMN error_message TEXT").run();
    console.log("Column error_message added successfully");
    db.close();
} catch (e) {
    if (e.message.includes("duplicate column name")) {
        console.log("Column already exists");
    } else {
        console.error("FAILED to add column:", e.message);
    }
}
