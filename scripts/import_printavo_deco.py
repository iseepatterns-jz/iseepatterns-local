#!/usr/bin/env python3
"""Import Printavo and Deconetwork data into evidence_hub.db"""
import csv, json, sqlite3, os, sys

DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/evidence_hub.db"
PRINTAVO_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/qb_reconstruction_workspace/printavo"
DECO_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/qb_reconstruction_workspace/deconetwork"

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode=WAL")
conn.execute("PRAGMA foreign_keys=ON")

# Drop existing
for t in ['printavo_invoices','printavo_purchase_orders','deco_orders','deco_purchase_orders','deco_po_items']:
    conn.execute(f"DROP TABLE IF EXISTS {t}")

# Create tables
conn.executescript("""
CREATE TABLE printavo_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    nickname TEXT,
    created_date TEXT,
    customer_name TEXT,
    customer_id TEXT,
    customer_company TEXT,
    customer_email TEXT,
    invoice_status TEXT,
    total REAL,
    total_untaxed REAL,
    amount_paid REAL,
    amount_outstanding REAL,
    po_number TEXT,
    tags TEXT,
    owner TEXT,
    invoice_url TEXT,
    public_url TEXT,
    raw_json TEXT
);

CREATE TABLE printavo_purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT NOT NULL UNIQUE,
    invoice_number TEXT,
    vendor_name TEXT,
    cost REAL,
    raw_json TEXT
);

CREATE TABLE deco_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    order_type TEXT,
    status TEXT,
    production_status TEXT,
    priority_order TEXT,
    po_number TEXT,
    supplier_po_number TEXT,
    order_job_name TEXT,
    sales_staff TEXT,
    date_ordered TEXT,
    date_invoiced TEXT,
    date_shipped TEXT,
    date_due TEXT,
    date_produced TEXT,
    date_scheduled TEXT,
    order_total REAL,
    shipping_total REAL,
    tax_total REAL,
    tax_exempt TEXT,
    rush_order_cost REAL,
    coupon_discount REAL,
    amount_billed REAL,
    payment_due_date TEXT,
    payment_date TEXT,
    payment_terms TEXT,
    payment_method TEXT,
    wholesale_price REAL,
    base_cost REAL,
    site_id TEXT,
    site_name TEXT,
    billing_company TEXT,
    billing_first_name TEXT,
    billing_last_name TEXT,
    billing_email TEXT,
    billing_address TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_country TEXT,
    billing_post_code TEXT,
    billing_phone TEXT,
    shipping_first_name TEXT,
    shipping_last_name TEXT,
    shipping_company TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_state TEXT,
    shipping_country TEXT,
    shipping_post_code TEXT,
    shipping_phone TEXT,
    shipping_method TEXT,
    weight_total REAL,
    shipping_notes TEXT,
    raw_json TEXT
);

CREATE TABLE deco_purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT NOT NULL UNIQUE,
    vendor_name TEXT,
    vendor_invoice_no TEXT,
    vendor_tracking_no TEXT,
    status TEXT,
    reference TEXT,
    date_created TEXT,
    date_due TEXT,
    attention_to TEXT,
    notes TEXT,
    line_item_count INTEGER,
    company TEXT,
    first_name TEXT,
    last_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    phone_number TEXT,
    total REAL,
    shipping REAL,
    final_total REAL,
    raw_json TEXT
);

CREATE TABLE deco_po_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT NOT NULL,
    vendor_name TEXT,
    sku_code TEXT,
    product_code TEXT,
    name TEXT,
    color TEXT,
    size TEXT,
    unit_price REAL,
    qty INTEGER,
    qty_received INTEGER,
    total REAL,
    final_total REAL,
    order_numbers TEXT,
    raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_pi_invoice ON printavo_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_pi_customer ON printavo_invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_ppo_po ON printavo_purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_ppo_invoice ON printavo_purchase_orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_do_order ON deco_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_do_customer ON deco_orders(billing_company);
CREATE INDEX IF NOT EXISTS idx_dpo_po ON deco_purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_dpoi_po ON deco_po_items(po_number);
""")
conn.commit()

def s(val, maxlen=None):
    v = (val or '').strip()
    return v[:maxlen] if maxlen else v

def sf(val, default=0.0):
    try: return float((val or '').strip().replace('$','').replace(',','') or default)
    except: return default

def si(val, default=0):
    try: return int((val or '0').strip())
    except: return default

# ── Printavo Invoices ──
csv_path = os.path.join(PRINTAVO_DIR, "rbc-crm-printavo-exportsOrdersJob_export20240220.csv")
count = 0
if os.path.exists(csv_path):
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        for row in csv.DictReader(f):
            inv = s(row.get('Invoice #'))
            if not inv: continue
            conn.execute("""INSERT OR IGNORE INTO printavo_invoices
                (invoice_number,nickname,created_date,customer_name,customer_id,
                 customer_company,customer_email,invoice_status,total,total_untaxed,
                 amount_paid,amount_outstanding,po_number,tags,owner,invoice_url,public_url,raw_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (inv, s(row.get('Nickname'),500), s(row.get('Created Date')),
                 s(row.get('Customer Full Name')), s(row.get('Customer Id')),
                 s(row.get('Customer Company')), s(row.get('Customer Email')),
                 s(row.get('Invoice Status')), sf(row.get('Total')), sf(row.get('Total Untaxed')),
                 sf(row.get('Amount Paid')), sf(row.get('Amount Outstanding')),
                 s(row.get('PO #')), s(row.get('Tags')),
                 s(row.get('Owner')), s(row.get('Invoice URL')),
                 s(row.get('Public Invoice View URL')), json.dumps(dict(row))))
            count += 1
    print(f"printavo_invoices: {count} rows")
else:
    print(f"MISSING: {csv_path}")

# ── Printavo Purchase Orders ──
csv_path = os.path.join(PRINTAVO_DIR, "rbc-crm-printavo-purchase-order-data.csv")
count = 0
if os.path.exists(csv_path):
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        for row in csv.DictReader(f):
            po = s(row.get('PO'))
            if not po: continue
            conn.execute("""INSERT OR IGNORE INTO printavo_purchase_orders
                (po_number,invoice_number,vendor_name,cost,raw_json)
                VALUES (?,?,?,?,?)""",
                (po, s(row.get('INV')), s(row.get('NICKNAME'),500),
                 sf(row.get('PRICE')), json.dumps(dict(row))))
            count += 1
    print(f"printavo_purchase_orders: {count} rows")
else:
    print(f"MISSING: {csv_path}")

# ── Deco Orders ──
csv_path = os.path.join(DECO_DIR, "rbc-crm-deco-order-export-summary.csv")
count = 0
if os.path.exists(csv_path):
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        for row in csv.DictReader(f):
            order = s(row.get('Order Number'))
            if not order: continue
            conn.execute("""INSERT OR IGNORE INTO deco_orders
                (order_number,order_type,status,production_status,priority_order,
                 po_number,supplier_po_number,order_job_name,sales_staff,
                 date_ordered,date_invoiced,date_shipped,date_due,date_produced,date_scheduled,
                 order_total,shipping_total,tax_total,tax_exempt,rush_order_cost,
                 coupon_discount,amount_billed,payment_due_date,payment_date,
                 payment_terms,payment_method,wholesale_price,base_cost,
                 site_id,site_name,
                 billing_company,billing_first_name,billing_last_name,billing_email,
                 billing_address,billing_city,billing_state,billing_country,billing_post_code,billing_phone,
                 shipping_first_name,shipping_last_name,shipping_company,
                 shipping_address,shipping_city,shipping_state,shipping_country,shipping_post_code,shipping_phone,
                 shipping_method,weight_total,shipping_notes,raw_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (order, s(row.get('Order Type')), s(row.get('Status')), s(row.get('Production Status')),
                 s(row.get('Priority Order')), s(row.get('PO Number')), s(row.get('Supplier PO Number')),
                 s(row.get('Order Job Name'),500), s(row.get('Sales Staff Account')),
                 s(row.get('Date Ordered')), s(row.get('Date Invoiced')), s(row.get('Date Shipped')),
                 s(row.get('Date Due')), s(row.get('Date Produced')), s(row.get('Date Scheduled')),
                 sf(row.get('Order Total')), sf(row.get('Shipping Total')), sf(row.get('Tax Total')),
                 s(row.get('Tax Exempt')), sf(row.get('Rush Order Cost')),
                 sf(row.get('Coupon Discount')), sf(row.get('Amount Billed')),
                 s(row.get('Payment Due Date')), s(row.get('Payment Date')),
                 s(row.get('Payment Terms')), s(row.get('Payment Method')),
                 sf(row.get('Wholesale Price')), sf(row.get('Base Cost')),
                 s(row.get('Site Id')), s(row.get('Site Name')),
                 s(row.get('Billing Company')), s(row.get('Billing First Name')),
                 s(row.get('Billing Last Name')), s(row.get('Billing Email Address')),
                 s(row.get('Billing Address')), s(row.get('Billing City')),
                 s(row.get('Billing State')), s(row.get('Billing Country')),
                 s(row.get('Billing Post Code')), s(row.get('Billing Phone Number')),
                 s(row.get('Shipping First Name')), s(row.get('Shipping Last Name')),
                 s(row.get('Shipping Company')), s(row.get('Shipping Address')),
                 s(row.get('Shipping City')), s(row.get('Shipping State')),
                 s(row.get('Shipping Country')), s(row.get('Shipping Post Code')),
                 s(row.get('Shipping Phone Number')), s(row.get('Shipping Method')),
                 sf(row.get('Weight Total')), s(row.get('Shipping Notes'),1000),
                 json.dumps(dict(row))))
            count += 1
    print(f"deco_orders: {count} rows")
else:
    print(f"MISSING: {csv_path}")

# ── Deco Purchase Orders ──
csv_path = os.path.join(DECO_DIR, "rbc-crm-deco-purchase-order-export.csv")
count = 0
if os.path.exists(csv_path):
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        for row in csv.DictReader(f):
            po = s(row.get('PO Number'))
            if not po: continue
            conn.execute("""INSERT OR IGNORE INTO deco_purchase_orders
                (po_number,vendor_name,vendor_invoice_no,vendor_tracking_no,status,
                 reference,date_created,date_due,attention_to,notes,line_item_count,
                 company,first_name,last_name,address,city,state,zip,country,phone_number,
                 total,shipping,final_total,raw_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (po, s(row.get('Vendor Name')), s(row.get('Vendor Invoice No')),
                 s(row.get('Vendor Tracking No')), s(row.get('Status')),
                 s(row.get('Reference')), s(row.get('Date Created')),
                 s(row.get('Date Due')), s(row.get('Attention To')),
                 s(row.get('Notes'),2000), si(row.get('Line Item Count')),
                 s(row.get('Company')), s(row.get('First Name')),
                 s(row.get('Last Name')), s(row.get('Address')),
                 s(row.get('City')), s(row.get('State')), s(row.get('Zip')),
                 s(row.get('Country')), s(row.get('Phone Number')),
                 sf(row.get('Total')), sf(row.get('Shipping')), sf(row.get('Final Total')),
                 json.dumps(dict(row))))
            count += 1
    print(f"deco_purchase_orders: {count} rows")
else:
    print(f"MISSING: {csv_path}")

# ── Deco PO Items ──
csv_path = os.path.join(DECO_DIR, "rbc-crm-deco-purchase-order-item-export.csv")
count = 0
if os.path.exists(csv_path):
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        for row in csv.DictReader(f):
            po = s(row.get('PO Number'))
            if not po: continue
            conn.execute("""INSERT INTO deco_po_items
                (po_number,vendor_name,sku_code,product_code,name,color,size,
                 unit_price,qty,qty_received,total,final_total,order_numbers,raw_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (po, s(row.get('Vendor Name')), s(row.get('Sku Code')),
                 s(row.get('Product Code')), s(row.get('Name'),500),
                 s(row.get('Color')), s(row.get('Size')),
                 sf(row.get('Unit Price')), si(row.get('Qty')),
                 si(row.get('Qty Received')), sf(row.get('Total')),
                 sf(row.get('Final Total')), s(row.get('Order Number(s)')),
                 json.dumps(dict(row))))
            count += 1
    print(f"deco_po_items: {count} rows")
else:
    print(f"MISSING: {csv_path}")

conn.commit()

# Summary
print("\n=== IMPORT SUMMARY ===")
for t in ['printavo_invoices','printavo_purchase_orders','deco_orders','deco_purchase_orders','deco_po_items']:
    n = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {n} rows")

conn.close()
