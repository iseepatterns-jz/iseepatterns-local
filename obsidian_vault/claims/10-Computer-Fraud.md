---
type: claim
claim_id: "10"
aliases:
  - "Computer Fraud"
  - "CFAA"
  - "Computer Fraud and Abuse Act"
tags:
  - claim
status: active
evidence_count: 0
gaps: []
severity: medium
governing_law: "18 U.S.C. § 1030 (Computer Fraud and Abuse Act)"
related_entities:
  - "[[../entities/Lucas-Guariglia]]"
  - "[[../entities/Joseph-Zangrilli]]"
  - "[[../entities/Rowboat-Creative-LLC]]"
  - "[[../entities/Ryan-Hayes]]"
case: "Guariglia v. Zangrilli, 2024CH00720 (Cook County Chancery)"
created: 2026-05-18
updated: 2026-05-18
---

# Claim 10: Computer Fraud (18 U.S.C. § 1030)

## Legal Elements (Van Buren v. United States, 141 S. Ct. 1648 (2021))

1. Access to a "protected computer" (used in or affecting interstate commerce)
2. Without authorization or exceeding authorized access
3. With intent to obtain information, defraud, or cause damage
4. Loss aggregating at least $5,000 in value over a one-year period

Relevant subsections: § 1030(a)(2) (unauthorized access to obtain information), § 1030(a)(4) (unauthorized access with intent to defraud), § 1030(a)(5)(A) (knowingly causing transmission of program/code causing damage).

---

## Evidence Mapping

### Element 1: Protected Computers

| System | Evidence Ref | Description |
|---|---|---|
| Google Workspace | Transcript: [[../timeline/00-Master-Timeline#2023-05-28]] | Rowboat Creative Google Workspace admin console |
| QuickBooks Online | Transcript: 2024-02-21 | Intuit QBO — payroll lead time settings |
| Receiver Email (hayesr@) | receiptership_email_analysis.md: IDs 298424, 298372 | Google Workspace — receiver's Rowboat email |

---

### Element 2: Unauthorized Access / Exceeding Authorization

| Incident | Evidence | Finding |
|---|---|---|
| LG claims JZ transferred emails | Transcript: 2023-05-28 (lines 22-34) | JZ explained he removed a Google Cloud trial license. Clicked "delete" instead of "remove license." System showed 40-80 hour estimate. JZ hit back. No data transfer occurred. LG eventually retreated. |
| JZ changed receiver's email password | receiptership_email_analysis.md (ID 298372) | JZ created hayesr@rowboatcreative.com for court-appointed receiver (Feb 16, 2024) then changed the password (Feb 19). JZ retained admin control. |
| LG bypassed monitoring via lucasideas@gmail.com | Memory fact: 21 operations emails | LG used personal Gmail for receiver communications outside monitored Rowboat channels. Potential exceeding-authorized-access for company business. |

---

### Element 3: Intent to Defraud — Suspicious Invoice (May 29, 2024)

Email from "LinkedIn Accounts Collections" (accounts@linkedreceivables.com) forwarded by JZ to accounting@rowboatcreative.com.

Forensic findings (Email Fraud Forensic Analysis Report):
- Origin server: Hostinger (nl-srv-smtpout3.hostinger.io, 145.14.159.43) — NOT LinkedIn
- linkedreceivables.com is not a known LinkedIn domain
- X-AuthUser: ceo@newdombook.com
- Invoice #110112141092
- JZ requested payment: "Can you please take care of this now?"

Unclear whether JZ was victim of phishing or knowingly forwarded a fraudulent invoice.

---

### Element 4: $5,000+ Loss

Potential loss aggregation includes the suspicious LinkedIn invoice, Google Workspace disruption costs, and any unauthorized access to financial systems.

---

## Cross-References

- The Google Workspace dispute (Transcript: 2023-05-28) shows both partners accusing each other. LG's accusation of email transfer is contradicted by JZ's explanation. More relevant to fraud claims (LG's false accusations) than CFAA claims.
- The hayesr@ password change is the strongest CFAA evidence — court-appointed receiver's email password controlled by JZ.
- [[../claims/9-Wire-Fraud]] — the suspicious invoice overlaps with wire fraud theory.
- [[../claims/2-Fraud]] — LG's false Google Workspace accusations intersect.

---

## Gap Analysis

| Gap | Severity | Action |
|---|---|---|
| Google Workspace admin audit logs | High | Subpoena Google Workspace admin activity — shows who accessed what and when |
| QuickBooks Online audit trail | High | Subpoena Intuit QBO audit logs — payroll lead time changes |
| linkedreceivables.com domain ownership | High | Investigate domain registration — third party phish or inside job? |
| ceo@newdombook.com email account | Medium | Full correspondence review from this account |
| lucasideas@gmail.com full correspondence | Medium | All 21 bypass emails from LG's personal Gmail |
