Here’s a concise spec you can hand directly to Antigravity that explains how the Printavo exports and the **rbc-statement-transactions-master-sheet-full.csv** should be integrated into lawmodel1.

***

## Antigravity Spec: Integrate Printavo + Master Statement Sheet into lawmodel1

You are extending the existing **lawmodel1** forensic environment to add a financial “source of truth” layer based on Printavo exports and a unified bank/credit card master sheet.

All paths below are under:

- `/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data`

### 1. Raw CSV data sources (must be ingested)

There are five key CSV files:

1. **Printavo invoices (orders/jobs)**  
   - File: `rbc-crm-printavo-exportsOrdersJob_export20240220.csv`  
   - Semantics: one row per order/invoice.  
   - Important columns (names approximate, infer from header):
     - `Order ID` or `Invoice #` (e.g., `702271`)  
     - Customer name and `Customer ID`  
     - Order dates (created, due, production, ship)  
     - Amounts (subtotal, tax, total, etc.)  
     - Status (Order Completed, Shipped, Quote, etc.)  
     - Public invoice URLs and internal invoice URLs  

2. **Printavo purchase orders**  
   - File: `rbc-crm-printavo-purchase-order-data.csv`  
   - Semantics: one row per purchase order (often tied to garments/vendors).  
   - Important columns:
     - `PO Number` (e.g., `P1887`, `P1520`, etc.)  
     - Related `Order ID` / `Invoice #`  
     - Vendor name (e.g., SanMar, S&S Activewear, Amazon)  
     - Item/description and cost info  

3. **Transactions by job (processor transactions)**  
   - File: `rbc-crm-exportsTransactionsJob_export20240220.csv`  
   - Semantics: card processor / gateway transactions tied to Printavo orders.  
   - Important columns:
     - `Order ID` (invoice number, matches Printavo invoices)  
     - `Transaction ID` (e.g., `p1_txn_...`)  
     - `Deposit ID` (e.g., `p1_dbm_...`)  
     - Card type (Visa/MasterCard/AmEx), cardholder name & address  
     - Net amount, gross amount, fees, created date  

4. **Printavo payments and expenses**  
   - File: `rbc-crm-printavo-paymentsExpensesExport-20240220.csv`  
   - Semantics: ledger of invoice payments and goods/expense entries inside Printavo.  
   - Important columns:
     - `ID` (Printavo internal row ID)  
     - `Created Date` and `Transaction Date`  
     - `Payment Processor`, `Payment Transaction ID` (e.g., `p1_txn_...`)  
     - `Name` (e.g., `Invoice #702271 Payment`, `P1908`, `GOODS`)  
     - `Category` (Credit Card, GOODS, Check, etc.)  
     - `Amount`  
     - `Invoice #` and `Invoice URL`  
     - Customer and `Customer ID`  
     - Sales tax fields  

5. **Full compilation of all Rowboat bank + credit card statements (source of truth)**  
   - File: `rbc-statement-transactions-master-sheet-full.csv`  
   - Semantics: one row per bank/credit card transaction across all accounts; this is the **canonical master sheet**.  
   - Important columns (from the sample structure):
     - `Year`, `Date`, `Amount`, `Amount positive`  
     - `Description` (narrative from bank/CC, e.g., “DEBIT CARD PURCHASE AT …”)  
     - `Transaction Type` (Withdrawl, Deposit, CC Debit, etc.)  
     - `Account`, `Account Type`, `Bank`  
     - `User`, `Responsible` (e.g., RBC, LG, JZ)  
     - `Category`, `Class`, `Type`, `Type2`, `Department`  
     - `Order ID`, `PO Number` (when linked to Printavo jobs)  
     - `Payment Instrument Type`, `Payment Identifier`  
     - Amazon‑specific fields (Internal Product Category, ASIN, Title, etc.), flight codes, and free‑text Notes  
   - This CSV is the **single source of truth** for what actually hit Rowboat accounts and cards.

### 2. New SQLite tables to create

Create (or extend) a SQLite database in:

- `lawmodel1/data/financial_hub.db`

with at least these tables:

1. **financial_master** (from rbc-statement-transactions-master-sheet-full.csv)

```sql
CREATE TABLE IF NOT EXISTS financial_master (
  master_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER,
  date TEXT,
  amount REAL,
  amount_positive REAL,
  description TEXT,
  transaction_type TEXT,
  account TEXT,
  account_type TEXT,
  bank TEXT,
  user TEXT,
  responsible TEXT,
  category TEXT,
  class TEXT,
  type TEXT,
  type2 TEXT,
  department TEXT,
  order_id TEXT,
  po_number TEXT,
  payment_instrument_type TEXT,
  payment_identifier TEXT,
  customer_id TEXT,
  job_id TEXT,
  notes TEXT,
  raw_json TEXT
);
```

- `raw_json` stores the full original row as JSON for anything we don’t explicitly model.

2. **printavo_invoices** (from rbc-crm-printavo-exportsOrdersJob_export20240220.csv)

```sql
CREATE TABLE IF NOT EXISTS printavo_invoices (
  invoice_number TEXT PRIMARY KEY,
  order_name TEXT,
  created_date TEXT,
  due_date TEXT,
  production_date TEXT,
  ship_date TEXT,
  customer_name TEXT,
  customer_id TEXT,
  status TEXT,
  subtotal REAL,
  tax REAL,
  total REAL,
  public_invoice_url TEXT,
  internal_invoice_url TEXT,
  owner TEXT,
  raw_json TEXT
);
```

3. **printavo_purchase_orders** (from rbc-crm-printavo-purchase-order-data.csv)

```sql
CREATE TABLE IF NOT EXISTS printavo_purchase_orders (
  po_number TEXT PRIMARY KEY,
  invoice_number TEXT,
  vendor_name TEXT,
  description TEXT,
  cost REAL,
  raw_json TEXT
);
```

4. **printavo_payments_expenses** (from rbc-crm-printavo-paymentsExpensesExport-20240220.csv)

```sql
CREATE TABLE IF NOT EXISTS printavo_payments_expenses (
  id TEXT PRIMARY KEY,
  created_date TEXT,
  transaction_date TEXT,
  payment_processor TEXT,
  payment_transaction_id TEXT,
  name TEXT,
  category TEXT,
  amount REAL,
  invoice_number TEXT,
  invoice_url TEXT,
  invoice_owner TEXT,
  customer_name TEXT,
  customer_id TEXT,
  sales_tax_percentage TEXT,
  sales_tax TEXT,
  raw_json TEXT
);
```

5. **printavo_transactions_by_job** (from rbc-crm-exportsTransactionsJob_export20240220.csv)

```sql
CREATE TABLE IF NOT EXISTS printavo_transactions_by_job (
  order_id TEXT,
  transaction_id TEXT PRIMARY KEY,
  deposit_id TEXT,
  customer_name TEXT,
  net_amount REAL,
  gross_amount REAL,
  total_fees REAL,
  currency_code TEXT,
  created_date TEXT,
  cardholder_name TEXT,
  cardholder_address TEXT,
  raw_json TEXT
);
```

### 3. The “transactions hub” idea (keys to unify everything)

These tables are connected by keys:

- `invoice_number` / `Order ID`  
- `po_number`  
- `payment_transaction_id` / `transaction_id` / `deposit_id`  
- `payment_identifier` and `order_id` / `po_number` in the master sheet  
- `customer_id`, `user`, `responsible`, and vendor names

Goal: enable queries like:

> “Take this bank/CC transaction from rbc-statement-transactions-master-sheet-full.csv and find all related Printavo invoices, POs, payments, and processor transactions, then link to emails/iMessages/evidence cards.”

### 4. EvidenceCard integration (linking to the hub)

For every EvidenceCard you already create (email, iMessage, legal PDF, financial snippet), extend the `primary_ids` and `extra` fields to include these IDs whenever present:

- `primary_ids` should include some/all of:
  - `invoice_number`  
  - `po_number`  
  - `payment_txn_id` (Printavo `Payment Transaction ID` or `Transaction ID`)  
  - `deposit_id`  
  - `master_row_id` (row ID from `financial_master`)  
  - `payment_identifier` (from master sheet, when known)  

- `extra` should include:
  - `order_id` (if separate from invoice number)  
  - `customer_id`  
  - Vendor names (e.g., SanMar, Amazon, airlines)  
  - Any job/customer/job_id fields you infer from Printavo or the master sheet  

As a result:

- A row in **rbc-statement-transactions-master-sheet-full.csv** → `financial_master` row → referenced by `master_row_id` in EvidenceCards.  
- A row in **Printavo invoices** (orders/jobs) → `printavo_invoices` row → referenced by `invoice_number` in EvidenceCards.  
- A row in **Printavo POs** → `printavo_purchase_orders` row → referenced by `po_number` in EvidenceCards.  
- A row in **Printavo payments/expenses** and **transactions_by_job** → `payment_txn_id` / `transaction_id` → referenced in EvidenceCards and cross‑linked to invoices and master sheet rows.

### 5. RAG / query behavior to support

The Next.js RAG endpoint should be able to:

1. Start from **any** of these identifiers:
   - `invoice_number`  
   - `po_number`  
   - `transaction_id` / `payment_transaction_id` / `deposit_id`  
   - `payment_identifier`  
   - A specific row in `financial_master` (e.g., by date + amount + description)  

2. Use the SQLite hub to:
   - Resolve all related invoices, POs, payments, and job transactions.  
   - Derive a time window from these rows (e.g., ±7 or ±30 days around the financial event).  

3. Use that to filter `evidence_cards`:
   - By `source_type` (email, imessage, legal_pdf, financial, invoice, purchase_order, payment_expense, processor_txn).  
   - By `start_timestamp` / `end_timestamp`.  
   - By `primary_ids` / `extra` matching the same `invoice_number`, `po_number`, `payment_txn_id`, `master_row_id`, etc.

4. Build a set of **evidence cards** (emails, iMessages, invoices, POs, statements) that all point back to the same financial truth, and send those to the Qwen forensic model (Analyst or Synthesizer persona).

***

You can give this spec directly to Antigravity as:

- “How to ingest and normalize these CSVs,” and  
- “How to wire their IDs into the existing evidence_cards + RAG pipeline, with rbc-statement-transactions-master-sheet-full.csv as the ultimate source of truth.”