# Stage 02 Tax Paralegal Analysis — tax-0056

---

## 1. Document Metadata

- **Item ID**: tax-0056
- **Exhibit ID**: EXH-TAX-0056
- **Source Path**: `/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/TAXES_LOCKER/ROWBOAT_CREATIVE_BUSINESS_TAXES/TAX_RELATED_BY_YEAR/2016/IRS Regarding Form 940 Overpayment 2016.pdf`
- **SHA-256**: `d641ebbd26f278f422ac42d90d15e23dd51f56511ca50ba5acf86d16dfcfaedb`
- **Classification**: PAYROLL
- **File Type**: PDF
- **Page Count**: 1
- **File Size**: 660,680 bytes (645.2 KB)
- **Extraction Method**: pymupdf (fitz) — 15 characters extracted (scanned/image-based PDF)
- **Extraction Status**: `scanned_no_text` — no machine-readable text layer detected; `needs_ocr: true`
- **Tax Year**: 2016
- **Form Type**: Form 940 (Employer's Annual Federal Unemployment Tax Return — related correspondence)
- **Entity**: Rowboat Creative, LLC (per intake metadata)
- **FEIN / EIN**: Not extractable from scanned document
- **Filing Jurisdictions**: Federal (IRS)
- **Preparer**: Not extractable
- **Filing Status**: Not extractable — appears to be IRS correspondence, not a filed return

---

## 2. Document Description

This document is a 1-page PDF file named "IRS Regarding Form 940 Overpayment 2016.pdf," stored in the `TAX_RELATED_BY_YEAR/2016/` directory alongside the entity's other 2016 tax records. Based on the filename and directory context, it is IRS correspondence addressing a Form 940 (Employer's Annual Federal Unemployment Tax Return) overpayment for the 2016 tax year by Rowboat Creative, LLC.

The PDF is a scanned image (660KB for a single page suggests a high-resolution scan of a printed letter), with no embedded machine-readable text layer. Text extraction via pymupdf (fitz) yielded only whitespace characters. The document requires OCR processing to recover its full textual content.

The document is the sole item in the `TAX_RELATED_BY_YEAR/2016/` subdirectory. It is categorized under "TAX_RELATED" rather than a specific tax return directory, consistent with its nature as IRS correspondence rather than a filed return form.

No signatures, filing stamps, or preparer information were extractable from the scanned image.

---

## 3. Key Financial Figures

**Not extractable from scanned image without OCR.**

The document title indicates it concerns a Form 940 overpayment. Form 940 is the Employer's Annual Federal Unemployment Tax Return. An IRS communication regarding an "overpayment" suggests the IRS determined that Rowboat Creative, LLC remitted more federal unemployment tax than was due for the 2016 tax year. The overpayment amount, tax period details, and IRS disposition (refund issued, credit applied to subsequent period, or request for additional information) are contained in the scanned image and not machine-readable.

| Figure | Amount | Page | Source |
|---|---|---|---|
| Any 940 overpayment amount | Unknown | 1 | Scanned — requires OCR |
| Tax period / quarter detail | Unknown | 1 | Scanned — requires OCR |
| IRS disposition (refund/credit) | Unknown | 1 | Scanned — requires OCR |

---

## 4. Entity & Ownership Structure

**Limited information extractable.**

- **Entity**: Rowboat Creative, LLC — identified from intake metadata and filename context as the recipient/taxpayer
- **Entity Type**: Not extractable from this document. Cross-reference: tax-0020 (Rowboat Creative, LLC 2016 Form 1120S) identifies the entity as an S-Corporation for federal tax purposes
- **Shareholders / Ownership**: Not addressed in a Form 940-related IRS letter
- **Officer Compensation**: Not addressed by Form 940 (Form 940 concerns FUTA tax, not officer compensation)
- **Related Entities**: No information extractable

---

## 5. Payroll & Employee Data

This document is payroll-related insofar as Form 940 pertains to federal unemployment tax obligations, which are tied to employee wages. However:

- No employee names, wage amounts, or withholdings are extractable from the scanned image
- The document is IRS correspondence, not a filed Form 940 return, so it would not contain the full payroll detail even if text were recoverable
- The existence of an IRS communication about a 940 overpayment confirms that Rowboat Creative, LLC had employees and filed Form 940 for the 2016 tax year
- No QuickBooks Payroll references are extractable

---

## 6. Context Gaps & Cross-References

1. **Actual overpayment amount unknown**: The core financial figure — the dollar amount of the 940 overpayment — is trapped in the scanned image. OCR is required to determine the amount and whether it was refunded or credited.

2. **No filed 2016 Form 940 in evidence**: The evidence locker contains this IRS correspondence *about* a Form 940 overpayment but does not appear to contain the underlying filed 2016 Form 940 return itself. Without the filed return, the reported FUTA wages and calculated tax cannot be verified.

3. **Related 2016 return — tax-0020 (Form 1120S)**: The 2016 Form 1120S (tax-0020) for Rowboat Creative, LLC is in the intake queue but has not yet been processed through Stage 02 paralegal analysis. Cross-referencing the 1120S officer compensation figures against the 940 wage base would provide a consistency check once both are analyzed.

4. **Other 940 documents**: tax-0072 ("FD_940_-2.pdf," 2020) is the only other Form 940 document in evidence. Comparison with the 2020 940 filing may reveal whether the 2016 overpayment was carried forward as a credit.

5. **Quarterly 941 filings missing**: Form 940 is an annual reconciliation of federal unemployment tax; Form 941 is the quarterly employer return that feeds into it. No 2016 quarterly 941 returns for Rowboat Creative, LLC are apparent in the evidence index.

6. **Date of IRS correspondence unknown**: The letter date is not extractable and is relevant to determining whether the overpayment matter was resolved contemporaneously or remained open during the dispute period.

7. **Questions for Joseph**:
   - Do you recall receiving an IRS notice about a 2016 Form 940 overpayment? What was the resolution — refund, credit applied, or correction required?
   - Is the filed 2016 Form 940 available in your records? If so, it should be added to evidence.
   - Were there quarterly 941 filings for 2016? These would corroborate the wage base used for the 940.
   - Does this overpayment relate to any QuickBooks payroll reconciliation issues from that period?
   - Was there a change in payroll provider or entity classification around 2016 that might have triggered the IRS correspondence?

---

## 7. Draft Internal Memo Paragraph

This document is a 1-page IRS letter addressing a Form 940 (Federal Unemployment Tax) overpayment by Rowboat Creative, LLC for the 2016 tax year. It resides in the TAX_RELATED_BY_YEAR/2016 directory as the only document in that folder. The PDF is a scanned image with no machine-readable text layer; OCR processing is required to recover the dollar amount of the overpayment, the letter date, and the IRS disposition. The existence of this correspondence confirms that Rowboat Creative, LLC employed workers and filed federal payroll tax returns in 2016, which is consistent with the entity's status as an operating S-Corporation during that period as reflected in the 2016 Form 1120S (tax-0020). The overpayment itself may represent a recoverable asset or credit, but the amount and final resolution cannot be determined from the current document state. Cross-reference with the 2016 1120S, any quarterly 941 filings, and the 2020 Form 940 (tax-0072) is recommended to establish the full payroll tax picture across the relevant years.
