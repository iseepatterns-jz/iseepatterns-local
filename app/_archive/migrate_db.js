const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db';

if (!fs.existsSync(dbPath)) {
    console.log("DB NOT FOUND at", dbPath);
    process.exit(1);
}

const db = new Database(dbPath);

try {
    const info = db.pragma("table_info(statement_transactions)");
    const columnNames = info.map(c => c.name);
    
    if (!columnNames.includes('master_id')) {
        console.log("Adding master_id...");
        db.prepare("ALTER TABLE statement_transactions ADD COLUMN master_id INTEGER").run();
    }
    
    if (!columnNames.includes('verification_status')) {
        console.log("Adding verification_status...");
        db.prepare("ALTER TABLE statement_transactions ADD COLUMN verification_status TEXT DEFAULT 'PENDING'").run();
    }
    
    console.log("Migration complete.");
} catch (e) {
    console.log("Migration failed:", e.message);
} finally {
    db.close();
}
