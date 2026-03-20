import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ── Environment Detection ──
const IS_LAMBDA = !!process.env.VAULT_ROOT;
const VAULT_ROOT = process.env.VAULT_ROOT || "";

// ── Data paths ──
// On Lambda: databases are bundled at VAULT_ROOT/db/
// On local:  databases are at the external volume paths
const DATA_ROOT = IS_LAMBDA
    ? path.join(VAULT_ROOT, "db")
    : path.resolve(
        "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1",
        "data"
    );

const EVIDENCE_DIR = IS_LAMBDA
    ? path.join(VAULT_ROOT, "db")
    : path.resolve(
        "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data",
        "SG_and_LG_collusion_and_amazon_misappro/ATTORNEY_EVIDENCE_PACKAGE"
    );

const PROJECT_ROOT = IS_LAMBDA
    ? VAULT_ROOT
    : path.resolve(
        "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1"
    );

const CLIENT_ID = "rowboat-creative";
const CASE_ID = "RC-2026";

function getDbPath(dbName: string): string {
    if (IS_LAMBDA) {
        return path.join(DATA_ROOT, dbName);
    }
    return path.join(DATA_ROOT, CLIENT_ID, CASE_ID, "db", dbName);
}

// ── Singleton connections ──
let _commDb: Database.Database | null = null;
let _commDbRW: Database.Database | null = null;
let _workbenchDb: Database.Database | null = null;
let _imessageDb: Database.Database | null = null;

/**
 * Communications database (gmail_master_index.db) — READ ONLY
 * Master email index with 741k records.
 */
export function getCommDb(): Database.Database {
    if (!_commDb) {
        const dbPath = IS_LAMBDA
            ? path.join(DATA_ROOT, "mbox_metadata.db")
            : path.join(DATA_ROOT, "..", "data", "MBOX_LOCKER", "mbox_metadata.db");
        _commDb = new Database(dbPath, { readonly: true });
        _commDb.pragma("journal_mode = WAL");
        _commDb.pragma("cache_size = -64000"); // 64MB cache
    }
    return _commDb;
}

export function getCommDbWritable(): Database.Database {
    if (!_commDbRW) {
        const dbPath = IS_LAMBDA
            ? path.join(DATA_ROOT, "mbox_metadata.db")
            : path.join(DATA_ROOT, "..", "data", "MBOX_LOCKER", "mbox_metadata.db");
        _commDbRW = new Database(dbPath); // default is read-write
        _commDbRW.pragma("journal_mode = WAL");
        _commDbRW.pragma("cache_size = -64000");
    }
    return _commDbRW;
}

// All tables (including chain_of_custody) live in mbox_metadata.db
export function getCommonDb(): Database.Database {
    return getCommDb();
}

/**
 * Workbench database — READ-WRITE
 * Stores assignments, cleaning overrides, descriptions, audit trail.
 * Never touches original evidence.
 */
export function getWorkbenchDb(): Database.Database {
    if (!_workbenchDb) {
        let dbPath: string;

        if (IS_LAMBDA) {
            // On Lambda: DBs are flat at VAULT_ROOT/db/, filesystem is read-only
            dbPath = path.join(VAULT_ROOT, "db", "workbench.db");
            _workbenchDb = new Database(dbPath, { readonly: true });
        } else {
            // Local dev: nested path with auto-create
            const dbDir = path.join(DATA_ROOT, CLIENT_ID, CASE_ID, "db");
            dbPath = path.join(dbDir, "workbench.db");

            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            _workbenchDb = new Database(dbPath);
            _workbenchDb.pragma("journal_mode = WAL");
            _workbenchDb.pragma("foreign_keys = ON");

            // Initialize schema if needed
            const schemaFiles = ["workbench.sql", "transcript_annotations.sql", "missing_schemas.sql", "timeline.sql", "financial_import.sql"];
            schemaFiles.forEach(file => {
                const schemaPath = path.join(PROJECT_ROOT, "schemas", file);
                if (fs.existsSync(schemaPath)) {
                    const schema = fs.readFileSync(schemaPath, "utf-8");
                    _workbenchDb!.exec(schema);
                }
            });
        }
    }
    return _workbenchDb;
}

/**
 * iMessage database — READ ONLY
 * Contains text messages extracted from device backups.
 */
export function getImessageDb(): Database.Database {
    if (!_imessageDb) {
        const dbPath = IS_LAMBDA
            ? path.join(DATA_ROOT, "chat_master.db")
            : path.join(PROJECT_ROOT, "data", "chat_master.db");
        _imessageDb = new Database(dbPath, { readonly: true });
        _imessageDb.pragma("journal_mode = WAL");
        _imessageDb.pragma("cache_size = -32000"); // 32MB cache for large chat DB
    }
    return _imessageDb;
}

/**
 * Generic database accessor — opens any .db in the project data/ directory.
 * Caches connections by name. READ ONLY.
 */
const _genericDbs: Record<string, Database.Database> = {};
export function getDb(name: string): Database.Database {
    if (!_genericDbs[name]) {
        const dbPath = IS_LAMBDA
            ? path.join(VAULT_ROOT, "db", `${name}.db`)
            : path.join(
                "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data",
                `${name}.db`
            );
        _genericDbs[name] = new Database(dbPath, { readonly: true });
        _genericDbs[name].pragma("journal_mode = WAL");
        _genericDbs[name].pragma("cache_size = -4000"); // 4MB cache
    }
    return _genericDbs[name];
}

export { CLIENT_ID, CASE_ID, EVIDENCE_DIR, PROJECT_ROOT };

/**
 * Evidence Hub database — READ ONLY
 * Contains 643k+ evidence records (emails + iMessages) with provenance, participants, and FTS5.
 */
let _evidenceHubDb: Database.Database | null = null;
export function getEvidenceHubDb(): Database.Database {
    if (!_evidenceHubDb) {
        const dbPath = IS_LAMBDA
            ? path.join(DATA_ROOT, "evidence_hub.db")
            : path.join(
                "/Volumes/batdrivetb5/AI_TRAINING/lawmodel1",
                "data",
                "evidence_hub.db"
            );
        _evidenceHubDb = new Database(dbPath, { readonly: true });
        _evidenceHubDb.pragma("journal_mode = WAL");
        _evidenceHubDb.pragma("cache_size = -64000");
    }
    return _evidenceHubDb;
}

/**
 * Case Corner database — READ-WRITE
 * Reuses workbench.db but applies case_corner.sql schema.
 */
export function getCaseCornerDb(): Database.Database {
    const db = getWorkbenchDb(); // same file, shared connection
    // On Lambda, DB is pre-baked and readonly — skip schema application
    if (!IS_LAMBDA) {
        const schemaPath = path.join(PROJECT_ROOT, "schemas", "case_corner.sql");
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, "utf-8");
            db.exec(schema);
        }
    }
    return db;
}
