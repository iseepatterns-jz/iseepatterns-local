import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const MASTER_CSV_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/FINANCIAL_LOCKER/ROWBOAT_CREATIVE_ROSETTASTONE/rbc-rosettastone-statement-transactions-master-sheet-full.csv";
const DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/rowboat-creative/RC-2026/db/workbench.db";
const SCHEMA_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/schemas/financial_master.sql";

// Simple dependency-free CSV parser for a known schema
function parseCSV(content: string) {
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    // Simple comma split for now (adjusting for quoted commas if needed)
    // Actually, let's use a regex that handles quotes properly
    const parseLine = (line: string) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i+1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseLine(lines[0]);
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseLine(lines[i]);
        const record: any = {};
        headers.forEach((h, idx) => {
            record[h] = values[idx] || "";
        });
        records.push(record);
    }
    return records;
}

async function migrate() {
    console.log("🚀 Starting Financial Master Migration...");

    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    
    const db = new Database(DB_PATH);
    const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
    db.exec(schema);
    console.log("✅ Schema applied.");

    console.log("📖 Reading CSV...");
    const csvContent = fs.readFileSync(MASTER_CSV_PATH, "utf8");
    const records = parseCSV(csvContent);
    console.log(`📊 Parsed ${records.length} records.`);

    db.prepare("DELETE FROM master_transactions").run();
    
    const insert = db.prepare(`
        INSERT INTO master_transactions (
            year, date, amount, amount_positive, description, transaction_type, 
            account, account_type, bank, user_label, responsible, category, 
            class, entry_type, entry_type2, department, link, company, 
            industry, invoice_num, invoice_url, client, notes, url, 
            order_id, po_number, is_personal, payment_instrument, payment_identifier, 
            amazon_product_cat, asin, title, unspsc, segment, family, commodity,
            verification_status, forensic_file, forensic_page, forensic_hash, verified_at
        ) VALUES (
            @Year, @Date, @Amount, @amount_positive, @Description, @Transaction_Type,
            @Account, @Account_Type, @Bank, @User, @Responsible, @Category,
            @Class, @Type, @Type2, @Department, @Link, @Company,
            @Industry, @Invoice_num, @Invoice_url, @Client, @Notes, @Url,
            @Order_ID, @PO_Number, @Personal, @Payment_Instrument_Type, @Payment_Identifier,
            @Amazon_Internal_Product_Category, @ASIN, @Title, @UNSPSC, @Segment, @Family, @Commodity,
            @Verification, @Forensic_Statement_File, @Forensic_Page, @Forensic_Hash, @Forensic_Verified_Date
        )
    `);

    const migrateBatch = db.transaction((rows) => {
        for (const row of rows) {
            const cleanAmount = (val: string) => {
                if (!val) return 0;
                return parseFloat(val.replace(/[$,]/g, "")) || 0;
            };

            // Map CSV keys (which might have spaces) to SQL named parameters
            const data = {
                Year: row['Year'],
                Date: row['Date'],
                Amount: cleanAmount(row['Amount']),
                amount_positive: cleanAmount(row['amount_positive']),
                Description: row['Description'],
                Transaction_Type: row['Transaction Type'],
                Account: row['Account'],
                Account_Type: row['Account Type'],
                Bank: row['Bank'],
                User: row['User'],
                Responsible: row['Responsible'],
                Category: row['Category'],
                Class: row['Class'],
                Type: row['Type'],
                Type2: row['Type2'],
                Department: row['Department'],
                Link: row['Link'],
                Company: row['Company'],
                Industry: row['Industry'],
                Invoice_num: row['Invoice #'],
                Invoice_url: row['Invoice URL'],
                Client: row['Client'],
                Notes: row['Notes'],
                Url: row['Url'],
                Order_ID: row['Order ID'],
                PO_Number: row['PO Number'],
                Personal: row['Personal'],
                Payment_Instrument_Type: row['Payment Instrument Type'],
                Payment_Identifier: row['Payment Identifier'],
                Amazon_Internal_Product_Category: row['Amazon-Internal Product Category'],
                ASIN: row['ASIN'],
                Title: row['Title'],
                UNSPSC: row['UNSPSC'],
                Segment: row['Segment'],
                Family: row['Family'],
                Commodity: row['Commodity'],
                Verification: row['Verification'],
                Forensic_Statement_File: row['Forensic_Statement_File'],
                Forensic_Page: row['Forensic_Page'],
                Forensic_Hash: row['Forensic_Hash'],
                Forensic_Verified_Date: row['Forensic_Verified_Date']
            };
            
            insert.run(data);
        }
    });

    console.log("💾 Writing to database...");
    migrateBatch(records);
    console.log("✨ Migration complete!");
    
    const count = db.prepare("SELECT COUNT(*) as cnt FROM master_transactions").get() as { cnt: number };
    console.log(`✅ Verified ${count.cnt} rows in SQLite.`);
}

migrate().catch(console.error);
