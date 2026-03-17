const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db';
const db = new Database(dbPath);

const sessions = db.prepare(`
    SELECT s.id, s.status, s.transaction_count, f.original_filename 
    FROM import_sessions s 
    JOIN statement_files f ON s.statement_file_id = f.id
`).all();

console.log(JSON.stringify(sessions, null, 2));
db.close();
process.exit(0);
