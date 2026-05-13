# Forensic Document Analysis — tax-0017

## 1. Document Metadata

- **Item ID**: tax-0017
- **Exhibit ID**: EXH-TAX-0017
- **Source Path**: `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/TAXES_LOCKER/ROWBOAT_CREATIVE_BUSINESS_TAXES/RETURNS_BY_YEAR/2013/Rowboat Creative Services, LLC Federal Form 1120S 2013.pdf`
- **SHA-256**: `70786daec9071a9756d537fd60ca144d15cfebde7067b27f24687f677bd99490`
- **Classification**: TAX_RETURN
- **File Type**: PDF
- **Page Count**: 26
- **File Size**: 719,985 bytes (703.1 KB)
- **Extraction Method**: pymupdf (fitz) — 54,893 characters extracted
- **Tax Year**: 2013
- **Form Type**: 1120S (U.S. Income Tax Return for an S Corporation), with Schedules K, K-1, L, M-1, M-2, Form 1125-A, Form 8879-S, and preparer worksheets
- **Entity**: ROWBOAT CREATIVE SERVICES, LLC
- **FEIN / EIN**: 30-0793361
- **Filing Jurisdictions**: Federal (IRS Cincinnati, OH), Illinois (IL-1120ST referenced in cover letters)
- **Preparer**: James D. Johansen, PTIN P01375263, JD JOHANSEN & ASSOCIATES, LLC, 12779 AVIANO DRIVE, NAPLES, FL 34105; ERO EFIN 608581
- **Filing Status**: Original (not marked amended on page 1; checkboxes for Final, Name Change, Address Change, Amended Return, S Election Termination all unchecked on page 1 of Form 1120S)
- **Signing Officer**: LUCAS GUARIGLIA, title "MANAGER MEMBER," PIN entered 01/12/2014 (page 13)
- **E-File Authorization Date**: 02/13/2014 (Form 8879-S, page 11)

## 2. Document Description

This is a 26-page PDF representing the complete 2013 federal S Corporation tax filing package for ROWBOAT CREATIVE SERVICES, LLC, prepared by JD JOHANSEN & ASSOCIATES, LLC of Naples, Florida. The document includes both the actual filed tax return (Form 1120S with supporting schedules) and the preparer's internal worksheets and e-filing authorization forms.

The document is organized as follows:
- **Pages 1–2**: Form 1120S (pages 1 and 2) — the core S Corporation return. Page 1 contains the income/deduction computation; page 2 contains Schedule B (Other Information) with entity structure questions.
- **Pages 3–4**: Schedule K (Shareholders' Pro Rata Share Items) and Schedule L (Balance Sheets per Books). Schedule K lines 1–17 detail income, deductions, credits, and other items passed through to shareholders.
- **Page 5**: Schedule M-1 (Reconciliation of Income per Books with Income per Return) and Schedule M-2 (Analysis of Accumulated Adjustments Account).
- **Page 6**: Form 1125-A (Cost of Goods Sold).
- **Pages 7–8**: Schedule K-1 for shareholder LUCAS GUARIGLIA (50%) with page 2 instruction codes.
- **Pages 9–10**: Schedule K-1 for shareholder JOSEPH ZANGRILLI (50%) with page 2 instruction codes.
- **Page 11**: Form 8879-S (IRS e-file Signature Authorization) — signed with PIN by MANAGER MEMBER.
- **Pages 12–14**: S Corporation Information Worksheet (preparer internal). Includes incorporation date (05/29/2013), estimated tax payment schedule, and e-filing elections for Illinois S Corporation return.
- **Page 15**: Other Deductions Worksheet — itemizes $64,787 in deductions reported on Form 1120S, line 19.
- **Page 16**: Schedule M-1 Items Worksheet — preparer's working paper for book-tax differences (appears mostly blank).
- **Page 17**: Five Year Tax History — preparer summary; only 2013 column populated.
- **Pages 18–19**: IRS e-file Authentication Statement and Electronic Filing Information Worksheet. Identifies the paid preparer and ERO as James D. Johansen / JD JOHANSEN & ASSOCIATES, LLC.
- **Pages 20–24**: Additional preparer worksheets including Taxes and Licenses Smart Worksheet, Meals and Entertainment Smart Worksheet, and Computed Net Income Per Books Smart Worksheet.
- **Pages 25–26**: Cover letters to each shareholder (LUCAS GUARIGLIA and JOSEPH ZANGRILLI) transmitting their K-1s and referencing "2013 Illinois Schedule K-1-P (Form IL-1120-ST)."

The document appears complete — all required schedules for a 2013 1120S filing are present. Dollar amounts appear in tax software footers at the bottom of each page alongside the entity name and FEIN. The filing was electronic (e-filed) with IRS and Illinois. No filing stamps are present (consistent with e-file).

Notable structural observation: The entity name on this return is "ROWBOAT CREATIVE SERVICES, LLC" rather than "Rowboat Creative, LLC." The date of incorporation listed is May 29, 2013 — the same year as this return — suggesting the entity may have been formed or converted to an S Corporation in 2013.

## 3. Key Financial Figures

### Income Statement (per Form 8879-S and supporting schedules)

| Figure | Amount | Page | Source |
|---|---|---|---|
| Gross Receipts or Sales (net of returns) | $262,112 | 11 | Form 8879-S, line 1 |
| Cost of Goods Sold | $81,772 | 6 | Form 1125-A, line 8 |
| Gross Profit | $180,340 | 11 | Form 8879-S, line 2 |
| Net 4797 Gain (Loss) | $0 | 17 | Five Year History, line 4 |
| Other Income (Loss) | $0 | 17 | Five Year History, line 5 |
| Total Income | $180,340 | 17 | Five Year History, line 6 |
| Salaries | $0 (blank) | 17 | Five Year History, line 7 |
| Depreciation | $0 (blank) | 17 | Five Year History, line 8 |
| Other Deductions | $103,345 | 17 | Five Year History, line 9 |
| Total Deductions | $103,345 | 17 | Five Year History, line 10 |
| Ordinary Business Income | $76,995 | 5, 11, 17 | Schedule M-2 line 2; Form 8879-S line 3; Five Year History line 11 |
| Net Rental Real Estate Income | $0 | 11 | Form 8879-S, line 4 |
| Income (Loss) Reconciliation | $76,995 | 11 | Form 8879-S, line 5 |

### Cost of Goods Sold Detail (Form 1125-A)

| Figure | Amount | Page | Line |
|---|---|---|---|
| Inventory at Beginning of Year | $0 | 6 | Line 1 |
| Purchases | $81,772 | 6 | Line 2 |
| Cost of Labor | $0 | 6 | Line 3 |
| Additional Section 263A Costs | $0 | 6 | Line 4 |
| Other Costs | $0 | 6 | Line 5 |
| Total (Lines 1–5) | $81,772 | 6 | Line 6 |
| Inventory at End of Year | $0 | 6 | Line 7 |
| Cost of Goods Sold | $81,772 | 6 | Line 8 |

Inventory valuation method: Cost (box 9a(i) checked, page 6).

### Schedule L — Balance Sheets per Books (partial, extracted from footer)

| Figure | Beginning of Year | End of Year | Page |
|---|---|---|---|
| Various asset/liability lines | (data in footer) | (data in footer) | 4 |
| Footer values reported: $76,995 → $1,390 → $0 → $0 → $1,390 → $1,390 → $1,390 | — | — | 4 |

The Schedule L balance sheet data appears in the tax software footer on page 4 but the individual line labels are not extractable from the form's positioning. The values present ($1,390 referenced multiple times) suggest a minimal balance sheet with Total Assets / Total Liabilities and Shareholders' Equity of approximately $1,390 at year-end.

### Other Deductions Breakdown (Form 1120S, Line 19)

| Expense Category | Amount | Page |
|---|---|---|
| Accounting | $2,668 | 15, 21 |
| Automobile and Truck Expense | $3,113 | 15, 21 |
| Bank Charges | $2 | 15, 21 |
| Computer Services and Supplies | $100 | 15, 21 |
| Credit and Collection Costs | $1,396 | 15, 21 |
| Dues and Subscriptions | $407 | 15, 21 |
| Insurance (General Liability) | $1,059 | 15, 21, 22 |
| Meals and Entertainment (100%) | $689 | 15, 21 |
| Office Expense | $2,290 | 15, 21 |
| Outside Services / Independent Contractors | $20,236 | 15, 21 |
| Postage | $2,396 | 15, 21 |
| Printing | $161 | 15, 21 |
| Supplies | $14,089 | 15, 21 |
| Telephone | $2,027 | 15, 21 |
| Travel | $725 | 15, 21 |
| Utilities | $573 | 15, 21 |
| Embroidery Expenses | $5,971 | 15, 21 |
| Decorative Items | $341 | 15, 21 |
| Digitizing Expenses | $375 | 15, 21 |
| Advertising Expenses | $6,169 | 15, 21 |
| Retail Sales Tax (Other Misc Taxes) | $9,017 | 22, 23 |
| **Total Other Deductions** | **$64,787** | 15, 21 |

### Schedule K Reconciliation — Shareholder Allocation

| Shareholder | Ownership % | Ordinary Business Income (Line 1) | Total Income (Line 18) | Page |
|---|---|---|---|---|
| LUCAS GUARIGLIA | 50.00% | $38,497 | $38,497 | 7, 21 |
| JOSEPH ZANGRILLI | 50.00% | $38,498 | $38,498 | 9, 21 |
| **Total** | **100%** | **$76,995** | **$76,995** | 21 |

## 4. Entity & Ownership Structure

**Entity type**: The document confirms ROWBOAT CREATIVE SERVICES, LLC is an S Corporation for federal tax purposes (Form 1120S filing). The entity was incorporated on May 29, 2013 (page 12, S Corporation Information Worksheet). The "LLC" suffix combined with the 1120S filing indicates an LLC that elected to be taxed as an S Corporation.

**Entity name**: The return uses "ROWBOAT CREATIVE SERVICES, LLC" — notably "Services" rather than simply "Rowboat Creative, LLC." The name control on the e-file worksheet is "ROWB" (page 19).

**Business address**: 2649 N. KILDARE, CHICAGO, IL 60639 (pages 12, 20).

**Business activity**: The Other Deductions detail (pages 15, 21) lists embroidery expenses ($5,971), decorative items ($341), digitizing expenses ($375), and advertising expenses ($6,169), indicating the business involves custom embroidery/decoration services with significant outside contractor costs ($20,236).

**Shareholders**: Two 50/50 shareholders identified:
- **LUCAS GUARIGLIA**: SSN 323-82-3817, 1934 N. WASHTENAW #307, CHICAGO, IL 60647 (page 7). Signed as "MANAGER MEMBER" on Form 8879-S (page 11). Entered officer PIN on 01/12/2014 (page 13). K-1 shows ordinary business income of $38,497 (page 7).
- **JOSEPH ZANGRILLI**: SSN 320-66-1897, 2642 N HAMLIN, Chicago, IL 60646 (page 9). K-1 shows ordinary business income of $38,498 (page 9).

**Officer compensation**: There is NO officer compensation reported on this return. The Five Year History (page 17, line 7 — Salaries) is blank/zero for 2013. Line 7 (Compensation of Officers) on Form 1120S page 1 does not show a filled dollar amount in the extracted text. The Other Deductions worksheet (page 15) contains no salary or wage line items. This is notable for an S Corporation with $76,995 in ordinary business income — shareholders performing services for an S Corporation are generally expected to receive reasonable compensation.

**K-1 distributions**: The cover letters (pages 25–26) reference both federal Schedule K-1 (Form 1120S) and Illinois Schedule K-1-P (Form IL-1120-ST), confirming the Illinois S Corporation replacement tax return was filed. No cash distribution amounts to shareholders are explicitly visible in the extracted data.

**Related entities**: None referenced in this document. Schedule B (page 2) questions about ownership in other corporations or partnerships appear blank/unchecked.

**State of incorporation vs. operation**: Both are Illinois (Chicago address).

## 5. Payroll & Employee Data

**Not applicable — no payroll data present in this document.** The return shows no officer compensation, no salaries and wages, and no employee-related deductions. The Five Year History (page 17, line 7) shows $0 for Salaries. The Form 1120S page 1 does not show filled amounts in the Compensation of Officers (line 7) or Salaries and Wages (line 8) fields.

This is a notable absence for an active S Corporation with $262,112 in gross receipts and two shareholder-managers. In the context of a partnership dispute, the lack of reported officer compensation may be relevant — but that assessment is beyond the scope of this paralegal analysis.

The preparer worksheets (pages 15–16) confirm no payroll-related expenses were claimed. The Taxes and Licenses Smart Worksheet (page 23) includes a line for "Payroll taxes" (C1) and "Credit from Form 8846" (C2), but no amounts appear filled.

## 6. Context Gaps & Cross-References

1. **Entity name variation**: The return is filed under "ROWBOAT CREATIVE SERVICES, LLC" (emphasis on _Services_) while other evidence in the locker references "Rowboat Creative, LLC." The same FEIN (30-0793361) is used. Was the legal entity name "Rowboat Creative Services, LLC" at formation, or is this a tax preparer error? The incorporation date of May 29, 2013 is suspiciously within the same tax year as this return — was this a new entity formation or a conversion from a different structure?

2. **Illinois return not included**: The cover letters (pages 25–26) and e-file worksheet (page 13) confirm that an Illinois Form IL-1120ST (Small Business Corporation Replacement Tax Return) with Schedules K-1-P was filed for 2013. This Illinois return is not present in the evidence locker for this item. Location of the 2013 IL-1120ST?

3. **No officer compensation**: An S Corporation with $76,995 in ordinary business income, two shareholder-managers actively involved in operations (per the nature of the business), and zero reported officer compensation or salaries raises standard IRS reasonable compensation questions. Is officer compensation documented elsewhere (e.g., payroll records, W-2s) that would fill this gap?

4. **Minimal balance sheet**: The Schedule L data (page 4) appears to show assets/equity of approximately $1,390 at both beginning and end of year, with $0 inventory. This is consistent with a service-based business with no significant capital investment, but the $1,390 figure appears on every line suggesting a largely empty balance sheet. Was a full balance sheet actually filed, or is this a minimal-filing approach used by the preparer?

5. **Estimated tax payments**: The S Corporation Information Worksheet (page 12) lists due dates for Q1–Q4 estimated tax payments (04/15/13, 06/17/13, 09/16/13, 12/16/13) but the "Amount Paid" columns are blank. Did the entity make estimated tax payments in 2013, and if so, what were the amounts?

6. **Five-year history only has 2013**: The Five Year Tax History worksheet (page 17) has columns for 2009–2013 but only 2013 is populated. This is consistent with the entity being newly formed/incorporated in 2013. If the business operated before 2013 under a different structure (sole proprietorship, general partnership), those prior-year returns would be separate documents.

7. **Large outside services expense**: $20,236 in outside services/independent contractors (page 15) represents approximately 31% of total other deductions ($64,787). Who were the contractors? Are 1099s available? This could indicate that the business model relied heavily on subcontractor labor rather than employees.

8. **Preparer in Florida, business in Illinois**: The return was prepared by JD JOHANSEN & ASSOCIATES, LLC in Naples, FL, despite the business operating in Chicago, IL. Is this preparer also associated with PKF or other accounting firms that appear elsewhere in the tax evidence? What was the relationship between the Florida preparer and the Chicago-based business?

9. **Electronic funds withdrawal**: The Form 8879-S (page 11) includes authorization for electronic funds withdrawal (direct debit) from a financial institution account. The bank information worksheet (page 14) indicates checking account information was entered into the tax preparation software but the specific bank name, routing number, and account number are not visible in the extracted text (may be in a separate, non-extracted field or redacted). Which bank account was used for tax payments?

10. **Specific questions for Joseph**:
    - Was "Rowboat Creative Services, LLC" the legal entity name in 2013, or should it have been "Rowboat Creative, LLC"?
    - Did you and Lucas Guariglia receive any cash distributions from the business in 2013 beyond the K-1 pass-through income?
    - Were you aware that no officer compensation was reported on the 2013 S-Corp return?
    - Where is the 2013 Illinois IL-1120ST return?

## 7. Draft Internal Memo Paragraph

The 2013 federal S Corporation tax return for ROWBOAT CREATIVE SERVICES, LLC (FEIN 30-0793361) reports gross receipts of $262,112, cost of goods sold of $81,772, and ordinary business income of $76,995 for the calendar year. The return reflects a 50/50 ownership split between shareholder-managers Lucas Guariglia and Joseph Zangrilli, each allocated approximately $38,497 in ordinary business income via Schedule K-1. The return was prepared by JD Johansen & Associates of Naples, Florida, and electronically filed with an authorization signature by Lucas Guariglia as "Manager Member" on February 13, 2014. The entity's reported business activities, based on the itemized deduction categories (embroidery expenses, decorative items, digitizing, and advertising), are consistent with a custom-decorated-apparel or promotional-products operation relying substantially on outside contractors ($20,236). The document reflects an entity incorporated on May 29, 2013 — the same tax year — with the entity name recorded as "Rowboat Creative Services, LLC" rather than "Rowboat Creative, LLC," a variation also observed in other evidence locker materials. No officer compensation, employee wages, or payroll-related deductions are reported on this return.
