# Email Evidence Search Protocol

This rule governs the search for email evidence within the Lawmodel1 project, specifically targeting the 2024-06-22 Gmail MBOX Locker.

## Core Directives

1.  **Consult Mapping First**: Before initiating any search, consult `data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/mbox_accounts_mapping.csv` to identify which account(s) and zip file(s) are likely to contain the targeted information.
2.  **Primary Data Source**: Use `gmail_master_index.db` as the primary source for all email queries. This database contains indexed headers and body snippets from all 44 zip files.
3.  **Search Workflow**:
    -   Perform SQL or Full-Text Search (FTS) queries against `gmail_master_index.db` to locate specific messages.
    -   Use the `zip_file` and `email_account` fields to contextualize findings.
    -   Only use `grep -r` or full MBOX extraction when the index snippet is insufficient for deep legal analysis.
4.  **No Reinvention**: Do not parse or re-index the raw zip files for individual queries. Rely on the master index to avoid redundant processing time and compute.

## Search Targets
When looking for evidence, prioritize these specific accounts and evidence types:

### General Leadership & Operations Accounts
**Accounts:** `lucas@rowboatcreative.com`, `info@rowboatcreative.com`, `fulfillment@rowboatcreative.com`, `orders@rowboatcreative.com`, `abel@rowboatcreative.com`

**Target Evidence:**
- wire fraud
- misappropriation
- self-dealing
- weaponization against JZ
- implications
- intentions
- side deals
- fraud

### Accounting Account
**Account:** `accounting@rowboatcreative.com`

**Target Evidence:**
- specific evidence that "Ashley Myles" is actually Lucas Guariglia
- how the fake "Ashley Myles" persona put Rowboat Creative and Joseph Zangrilli at risk financially and legally
- how emails are worded (e.g., Lucas Guariglia's ultra-aggressive and rude demeanor toward clients)
- wire fraud
- misappropriation
- self-dealing
- weaponization against JZ
- implications
- intentions
- side deals
- fraud

### General Correspondence
- Search for subject lines containing "reconciliation", "draw", "audit", or "distribution".
