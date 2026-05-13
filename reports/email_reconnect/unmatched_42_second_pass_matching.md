# Unmatched 42 EMAILS_LOCKER second-pass MBOX/Gmail metadata matching

Input unmatched list: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect/unmatched_42_draft_metadata_check.csv
EMAILS_LOCKER source metadata checked first: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER
Alternate EMAILS_LOCKER metadata location: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/EMAILS_LOCKER
MBOX metadata DB queried read-only: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/mbox_metadata.db
Gmail master index DB queried read-only: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/MBOX_LOCKER/2024-06-22_GMAIL_MBOX_ALL_LOCKER/2024-06-22_GMAIL_ALL_MBOX_ZIPPED/gmail_master_index.db
Derived CSV output: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect/unmatched_42_second_pass_matching.csv
Script path: /Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/reports/email_reconnect/run_unmatched_42_second_pass_matching.py

Scope note: classifications are factual matching categories only; no legal significance is assessed.

## Verification checks
- Input records processed: 42
- Output CSV rows written: 42
- Source TXT files not found: 0
- Records with no candidate in target DBs: 3

## Counts by source type
- eml: 18
- pdf: 24

## Counts by match category
- no match found: 3
- probable metadata match: 39

## Counts by target DB
- mbox_metadata.db: 39
- none: 3

## Counts by reason prefix
- No message-id, filename/source path, subject/date/address, or body/snippet candidate found in queried fields.: 3
- methods=exact_subject: 39

## Record-level results

### EXH-0059_LML_166_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0059_LML_166_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/2021-06-10 0845am LEN emails JZ personal account inquiry to LG email.pdf
- Source database / row: leonard_mayersky_locker / 166
- Parsed headers: exhibit=EXH-0059; message_id=N/A; date=N/A; from=<>; to="lucas@rowboatcreative.com" <lucas@rowboatcreative.com>Hi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Fwd: Document - Jun 10, 2021From: "Mayersky, Leonard" <Leonard.Mayersky@53.com>; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: 1 of 15/26/23, 10:20 AM
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 390394
- Target message/date/from/to/cc/subject: DM6PR19MB29867689F669B3922A9E2070E1359@DM6PR19MB2986.namprd19.prod.outlook.com; 2021-06-10T13:45:29.000Z; Leonard.Mayersky@53.com; lucas@rowboatcreative.com; ; Fwd: Document - Jun 10, 2021
- Target source fields: 1702187748122914957-1623332729000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Fwd: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0060_LML_167_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0060_LML_167_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/savage x fenty cc scam for nearly a year 53 says working on it/savage x fenty BBB page and articles/SavageXFenty _ Complaints _ Better Business Bureau® Profile.pdf
- Source database / row: leonard_mayersky_locker / 167
- Parsed headers: exhibit=EXH-0060; message_id=N/A; date=N/A; from=<>; to=N/A; cc=; subject=[PDF] SavageXFenty _ Complaints _ Better Business Bureau® Profile.pdf; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: 12/5/23, 12:29 AM SavageXFenty | Complaints | Better Business Bureau® Proﬁle
- Classification: no match found
- Target DB / ID: N/A / N/A
- Target message/date/from/to/cc/subject: ; ; ; ; ; 
- Target source fields: 
- Match reason: No message-id, filename/source path, subject/date/address, or body/snippet candidate found in queried fields.
- Match evidence: 
- Candidate count: 0

### EXH-0061_LML_170_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0061_LML_170_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/061021 0845am LEN emails JZ personal account inquiry to LG_01.pdf
- Source database / row: leonard_mayersky_locker / 170
- Parsed headers: exhibit=EXH-0061; message_id=N/A; date=N/A; from=<>; to="lucas@rowboatcreative.com" <lucas@rowboatcreative.com>Hi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Fwd: Document - Jun 10, 2021From: "Mayersky, Leonard" <Leonard.Mayersky@53.com>; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: 1 of 15/26/23, 10:20 AM
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 390394
- Target message/date/from/to/cc/subject: DM6PR19MB29867689F669B3922A9E2070E1359@DM6PR19MB2986.namprd19.prod.outlook.com; 2021-06-10T13:45:29.000Z; Leonard.Mayersky@53.com; lucas@rowboatcreative.com; ; Fwd: Document - Jun 10, 2021
- Target source fields: 1702187748122914957-1623332729000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Fwd: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0062_LML_171_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0062_LML_171_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/2021-05-27 53 mails letter rejecting portion of cc fraud issue 53.pdf
- Source database / row: leonard_mayersky_locker / 171
- Parsed headers: exhibit=EXH-0062; message_id=N/A; date=N/A; from=<>; to=N/A; cc=; subject=[PDF - no text content]; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: [PDF - no extractable text]
- Classification: no match found
- Target DB / ID: N/A / N/A
- Target message/date/from/to/cc/subject: ; ; ; ; ; 
- Target source fields: 
- Match reason: No message-id, filename/source path, subject/date/address, or body/snippet candidate found in queried fields.
- Match evidence: 
- Candidate count: 0

### EXH-0063_LML_172_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0063_LML_172_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/061021 0918am LG replies LEN emails JZ personal account inquiry to LG_03.pdf
- Source database / row: leonard_mayersky_locker / 172
- Parsed headers: exhibit=EXH-0063; message_id=N/A; date=N/A; from=<>; to="Mayersky, Leonard" <Leonard.Mayersky@53.com>Hi Len,I apologize for this. I’m unaware of what this is but believe this is related to only his personalaccounts with 5/3. I will speak with him and recommend that he transitions anything personalelsewhere. There should be no intermingling of personal matters NS business. I’m understanding of personal matters however this becomes absolutely detrimental to aworking business relationship that I am personally grateful for and have worked hard at. Again my apologies and appreciate you keeping on my radar. Thanks Len. -- Lucas Guarigliacell: 847.828.0944office: 773.675.BOAT (2628)CEO  | Co-founderRowboat Creativecustom screen printing | embroidery | merchandisingASI: 83710www.rowboatcreative.comhttps://www.instagram.com/rowboat_creativeOn Jun 10, 2021, at 9:45 AM, Mayersky, Leonard <Leonard.Mayersky@53.com> wrote:Hi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Re: Document - Jun 10, 2021From: Lucas Guariglia <lucas@rowboatcreative.com>; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: CAUTION EXTERNAL EMAILDO NOT open attachments or click on links from unknown senders or unexpected emailsSounds about ri
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 389458
- Target message/date/from/to/cc/subject: 7EE6C8B8-6735-42C5-8916-324DD86CC49F@rowboatcreative.com; 2021-06-10T14:18:42.000Z; lucas@rowboatcreative.com; Leonard.Mayersky@53.com; ; Re: Document - Jun 10, 2021
- Target source fields: 1702189832990785839-1623334722000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=72; date_match=True; address_overlap_count=1
- Match evidence: exact subject: Re: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0064_LML_173_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0064_LML_173_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/052721 53 mails letter rejecting portion of cc fraud issue 53.pdf
- Source database / row: leonard_mayersky_locker / 173
- Parsed headers: exhibit=EXH-0064; message_id=N/A; date=N/A; from=<>; to=N/A; cc=; subject=[PDF - no text content]; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: [PDF - no extractable text]
- Classification: no match found
- Target DB / ID: N/A / N/A
- Target message/date/from/to/cc/subject: ; ; ; ; ; 
- Target source fields: 
- Match reason: No message-id, filename/source path, subject/date/address, or body/snippet candidate found in queried fields.
- Match evidence: 
- Candidate count: 0

### EXH-0065_LML_174_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0065_LML_174_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/2021-06-10 0845am LEN emails JZ personal account inquiry to LG_01.pdf
- Source database / row: leonard_mayersky_locker / 174
- Parsed headers: exhibit=EXH-0065; message_id=N/A; date=N/A; from=<>; to="lucas@rowboatcreative.com" <lucas@rowboatcreative.com>Hi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Fwd: Document - Jun 10, 2021From: "Mayersky, Leonard" <Leonard.Mayersky@53.com>; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: 1 of 15/26/23, 10:20 AM
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 390394
- Target message/date/from/to/cc/subject: DM6PR19MB29867689F669B3922A9E2070E1359@DM6PR19MB2986.namprd19.prod.outlook.com; 2021-06-10T13:45:29.000Z; Leonard.Mayersky@53.com; lucas@rowboatcreative.com; ; Fwd: Document - Jun 10, 2021
- Target source fields: 1702187748122914957-1623332729000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Fwd: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0066_LML_175_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0066_LML_175_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/2021-06-10 0918am LG replies LEN emails JZ personal account inquiry to LG_03.pdf
- Source database / row: leonard_mayersky_locker / 175
- Parsed headers: exhibit=EXH-0066; message_id=N/A; date=N/A; from=<>; to="Mayersky, Leonard" <Leonard.Mayersky@53.com>Hi Len,I apologize for this. I’m unaware of what this is but believe this is related to only his personalaccounts with 5/3. I will speak with him and recommend that he transitions anything personalelsewhere. There should be no intermingling of personal matters NS business. I’m understanding of personal matters however this becomes absolutely detrimental to aworking business relationship that I am personally grateful for and have worked hard at. Again my apologies and appreciate you keeping on my radar. Thanks Len. -- Lucas Guarigliacell: 847.828.0944office: 773.675.BOAT (2628)CEO  | Co-founderRowboat Creativecustom screen printing | embroidery | merchandisingASI: 83710www.rowboatcreative.comhttps://www.instagram.com/rowboat_creativeOn Jun 10, 2021, at 9:45 AM, Mayersky, Leonard <Leonard.Mayersky@53.com> wrote:Hi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Re: Document - Jun 10, 2021From: Lucas Guariglia <lucas@rowboatcreative.com>; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: CAUTION EXTERNAL EMAILDO NOT open attachments or click on links from unknown senders or unexpected emailsSounds about ri
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 389458
- Target message/date/from/to/cc/subject: 7EE6C8B8-6735-42C5-8916-324DD86CC49F@rowboatcreative.com; 2021-06-10T14:18:42.000Z; lucas@rowboatcreative.com; Leonard.Mayersky@53.com; ; Re: Document - Jun 10, 2021
- Target source fields: 1702189832990785839-1623334722000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=72; date_match=True; address_overlap_count=1
- Match evidence: exact subject: Re: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0067_LML_176_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0067_LML_176_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/pdf storage/061021 0845am LEN emails JZ personal account inquiry to LG_01.pdf
- Source database / row: leonard_mayersky_locker / 176
- Parsed headers: exhibit=EXH-0067; message_id=N/A; date=N/A; from=<>; to="lucas@rowboatcreative.com" <lucas@rowboatcreative.com>Hi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Fwd: Document - Jun 10, 2021From: "Mayersky, Leonard" <Leonard.Mayersky@53.com>; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: 1 of 15/26/23, 10:20 AM
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 390394
- Target message/date/from/to/cc/subject: DM6PR19MB29867689F669B3922A9E2070E1359@DM6PR19MB2986.namprd19.prod.outlook.com; 2021-06-10T13:45:29.000Z; Leonard.Mayersky@53.com; lucas@rowboatcreative.com; ; Fwd: Document - Jun 10, 2021
- Target source fields: 1702187748122914957-1623332729000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Fwd: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0068_LML_177_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0068_LML_177_nodate.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/pdf storage/2021-06-10 0845am LEN emails JZ personal account inquiry to LG_01.pdf
- Source database / row: leonard_mayersky_locker / 177
- Parsed headers: exhibit=EXH-0068; message_id=N/A; date=N/A; from=<>; to="lucas@rowboatcreative.com" <lucas@rowboatcreative.com>Hi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Fwd: Document - Jun 10, 2021From: "Mayersky, Leonard" <Leonard.Mayersky@53.com>; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: 1 of 15/26/23, 10:20 AM
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 390394
- Target message/date/from/to/cc/subject: DM6PR19MB29867689F669B3922A9E2070E1359@DM6PR19MB2986.namprd19.prod.outlook.com; 2021-06-10T13:45:29.000Z; Leonard.Mayersky@53.com; lucas@rowboatcreative.com; ; Fwd: Document - Jun 10, 2021
- Target source fields: 1702187748122914957-1623332729000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Fwd: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0069_LML_178_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0069_LML_178_nodate.txt
- Source path: 2023-01-31 LG gets personal money market 53 acct week before account closed/Your User ID Has Been Retrieved.pdf
- Source database / row: leonard_mayersky_locker / 178
- Parsed headers: exhibit=EXH-0069; message_id=N/A; date=N/A; from=<>; to=<lucas@rowboatcreative.com>; cc=; subject=Your User ID Has Been RetrievedFrom: <FifthThirdBank@53.com>; subdirectory=2023-01-31 LG gets personal money market 53 acct week before account closed
- Body phrase used: Your User ID Has Been RetrievedDear LUCAS GUARIGLIA,Your Fifth Third User ID has been Retrieved.If you did not initiate 
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223014
- Target message/date/from/to/cc/subject: -841263168.229266.1685053816173@saflokydcrinw01; 2023-05-25T22:30:16.000Z; FifthThirdBank@53.com; lucas@rowboatcreative.com; ; Your User ID Has Been Retrieved
- Target source fields: 1766907001304573289-1685053816000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=47; date_match=False; address_overlap_count=1
- Match evidence: exact subject: Your User ID Has Been Retrieved
- Candidate count: 4

### EXH-0070_LML_179_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0070_LML_179_nodate.txt
- Source path: 2023-01-31 LG gets personal money market 53 acct week before account closed/New Account Confirmation.pdf
- Source database / row: leonard_mayersky_locker / 179
- Parsed headers: exhibit=EXH-0070; message_id=N/A; date=N/A; from=<>; to=<lucas@rowboatcreative.com>; cc=; subject=New Account ConﬁrmationFrom: <FifthThirdBank@53.com>; subdirectory=2023-01-31 LG gets personal money market 53 acct week before account closed
- Body phrase used: Your New Account is Ready!Hi!We just wanted to say thanks for opening your new 5/3 RELATIONSHIPMONEY MARKET with us on 0
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 236809
- Target message/date/from/to/cc/subject: -1878283004.1627677.1675199286905@localhost; 2023-01-31T21:08:06.000Z; FifthThirdBank@53.com; lucas@rowboatcreative.com; ; New Account Confirmation
- Target source fields: 1756573814356364862-1675199286000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=47; date_match=False; address_overlap_count=1
- Match evidence: exact subject: New Account Confirmation
- Candidate count: 16

### EXH-0071_LML_180_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0071_LML_180_nodate.txt
- Source path: 2023-01-31 LG gets personal money market 53 acct week before account closed/Visit Summary.pdf
- Source database / row: leonard_mayersky_locker / 180
- Parsed headers: exhibit=EXH-0071; message_id=N/A; date=N/A; from=<>; to=<lucas@rowboatcreative.com>; cc=; subject=Visit SummaryFrom: <FifthThirdBank@53.com>; subdirectory=2023-01-31 LG gets personal money market 53 acct week before account closed
- Body phrase used: Visit Summary!Date of Visit:January 31, 2023Financial Center:DILWORTH, 1511 EAST BLVD, CHARLOTTE, NC 28203Hours:M-TH: 9-
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 236808
- Target message/date/from/to/cc/subject: -470748169.1628039.1675199329997@localhost; 2023-01-31T21:08:49.000Z; FifthThirdBank@53.com; lucas@rowboatcreative.com; ; Visit Summary
- Target source fields: 1756573815055928764-1675199329000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=47; date_match=False; address_overlap_count=1
- Match evidence: exact subject: Visit Summary
- Candidate count: 8

### EXH-0072_LML_181_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0072_LML_181_nodate.txt
- Source path: 2023-01-31 LG gets personal money market 53 acct week before account closed/Card PIN Changed.pdf
- Source database / row: leonard_mayersky_locker / 181
- Parsed headers: exhibit=EXH-0072; message_id=N/A; date=N/A; from=<>; to=<lucas@rowboatcreative.com>; cc=; subject=Card PIN ChangedFrom: <FifthThirdBank@53.com>; subdirectory=2023-01-31 LG gets personal money market 53 acct week before account closed
- Body phrase used: Card PIN ChangedDear LUCAS GUARIGLIA,The PIN for the card ending in x6264 has been changed.If you or a cardholder did no
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 218491
- Target message/date/from/to/cc/subject: 1615535243.3232662.1688588959484@saflokydcrinw01; 2023-07-05T20:29:19.000Z; FifthThirdBank@53.com; lucas@rowboatcreative.com; ; Card PIN Changed
- Target source fields: 1770613861068970167-1688588959000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=47; date_match=False; address_overlap_count=1
- Match evidence: exact subject: Card PIN Changed
- Candidate count: 24

### EXH-0073_LML_182_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0073_LML_182_nodate.txt
- Source path: 2023-01-31 LG gets personal money market 53 acct week before account closed/2023-01-31 LG gets new personal account 1 week before account closed.pdf
- Source database / row: leonard_mayersky_locker / 182
- Parsed headers: exhibit=EXH-0073; message_id=N/A; date=N/A; from=<>; to=<lucas@rowboatcreative.com>; cc=; subject=Visit SummaryFrom: <FifthThirdBank@53.com>; subdirectory=2023-01-31 LG gets personal money market 53 acct week before account closed
- Body phrase used: Your New Account is Ready!Hi!We just wanted to say thanks for opening your new 5/3 RELATIONSHIPMONEY MARKET with us on 0
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 236808
- Target message/date/from/to/cc/subject: -470748169.1628039.1675199329997@localhost; 2023-01-31T21:08:49.000Z; FifthThirdBank@53.com; lucas@rowboatcreative.com; ; Visit Summary
- Target source fields: 1756573815055928764-1675199329000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=72; date_match=True; address_overlap_count=1
- Match evidence: exact subject: Visit Summary
- Candidate count: 8

### EXH-0084_LML_168_2021-06-10.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0084_LML_168_2021-06-10.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/2021-06-10 0819am JZ emails LEN about personal account year old fraud issue attaches scan of mail.pdf
- Source database / row: leonard_mayersky_locker / 168
- Parsed headers: exhibit=EXH-0084; message_id=N/A; date=2021-06-10T08:19:00; from=Joseph <Zangrillijoe@rowboatcreative.com>; to=Leonard MayerskyLeonard.Mayersky@53.comSounds about right. I submitted this last year right when it started. You guys did nothing, and now I’m told that because you didnothing the ﬁrst time I have to eat the 600$ that you allowed to be stolen. Thanks for the consistency on screwing the customer everystep of the way.Scanned with TurboScan.; cc=; subject=Document - Jun 10, 2021; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: From:Joseph Zangrillijoe@rowboatcreative.comSubject:Document - Jun 10, 2021Date:June 10, 2021 at 8:19 AMTo:Leonard Mayer
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 198278
- Target message/date/from/to/cc/subject: 2130D6B8-C1C0-4A07-BA2A-749A7EF0DD94@rowboatcreative.com; 2021-06-10T13:19:55.000Z; joe@rowboatcreative.com; Leonard.Mayersky@53.com; ; Document - Jun 10, 2021
- Target source fields: 1702186132228830736-1623331195000; 2024-06-22-all-29.zip; 2024-06-22-all--joe@rowboatcreative.com-9vjjwt.mbox
- Match reason: methods=exact_subject; score=60; date_match=True; address_overlap_count=0
- Match evidence: exact subject: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0085_LML_169_2021-06-10.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0085_LML_169_2021-06-10.txt
- Source path: 2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted/email individual files/061021 0819am JZ emails LEN about personal account year old fraud issue attaches scan of mail.pdf
- Source database / row: leonard_mayersky_locker / 169
- Parsed headers: exhibit=EXH-0085; message_id=N/A; date=2021-06-10T08:19:00; from=Joseph <Zangrillijoe@rowboatcreative.com>; to=Leonard MayerskyLeonard.Mayersky@53.comSounds about right. I submitted this last year right when it started. You guys did nothing, and now I’m told that because you didnothing the ﬁrst time I have to eat the 600$ that you allowed to be stolen. Thanks for the consistency on screwing the customer everystep of the way.Scanned with TurboScan.; cc=; subject=Document - Jun 10, 2021; subdirectory=2021-06-10 LM forwards JZ personal acct email with scan of physical 53 mail attached and decrypted
- Body phrase used: From:Joseph Zangrillijoe@rowboatcreative.comSubject:Document - Jun 10, 2021Date:June 10, 2021 at 8:19 AMTo:Leonard Mayer
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 198278
- Target message/date/from/to/cc/subject: 2130D6B8-C1C0-4A07-BA2A-749A7EF0DD94@rowboatcreative.com; 2021-06-10T13:19:55.000Z; joe@rowboatcreative.com; Leonard.Mayersky@53.com; ; Document - Jun 10, 2021
- Target source fields: 1702186132228830736-1623331195000; 2024-06-22-all-29.zip; 2024-06-22-all--joe@rowboatcreative.com-9vjjwt.mbox
- Match reason: methods=exact_subject; score=60; date_match=True; address_overlap_count=0
- Match evidence: exact subject: Document - Jun 10, 2021
- Candidate count: 2

### EXH-0101_MSG_66_2023-05-23.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0101_MSG_66_2023-05-23.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230523-Re_[EXTERNAL] Missed Payment_-583.eml
- Source database / row: mayersky_smoking_gun / 66
- Parsed headers: exhibit=EXH-0101; message_id=<05BB462D-BE11-4451-9668-2F0A5FFCC9CC@rowboatcreative.com>; date=2023-05-23T15:37:10-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,I received the form but what would the updated draft amount be?
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223237
- Target message/date/from/to/cc/subject: DC2D9C25-FBB0-4C55-A5FD-5E645BAE7CD1@rowboatcreative.com; 2023-05-23T21:14:45.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766721046499122688-1684876485000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0103_MSG_64_2023-05-23.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0103_MSG_64_2023-05-23.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230523-Re_[EXTERNAL] Missed Payment_-581.eml
- Source database / row: mayersky_smoking_gun / 64
- Parsed headers: exhibit=EXH-0103; message_id=<BAC6F940-CC17-4F9F-BB22-9E3EC2DC279A@rowboatcreative.com>; date=2023-05-23T15:38:40-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,I received the form but what would the updated draft amount be? The payments were a lot lower than $1k/mo initial
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223237
- Target message/date/from/to/cc/subject: DC2D9C25-FBB0-4C55-A5FD-5E645BAE7CD1@rowboatcreative.com; 2023-05-23T21:14:45.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766721046499122688-1684876485000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0105_MSG_81_2023-05-23.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0105_MSG_81_2023-05-23.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230523-Re_[EXTERNAL] Missed Payment_-570.eml
- Source database / row: mayersky_smoking_gun / 81
- Parsed headers: exhibit=EXH-0105; message_id=<D3989864-1866-4D52-BA85-250859FF1AEB@rowboatcreative.com>; date=2023-05-23T16:15:26-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Do you have some time to discuss this tomorrow? We definitely were not expecting this
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223237
- Target message/date/from/to/cc/subject: DC2D9C25-FBB0-4C55-A5FD-5E645BAE7CD1@rowboatcreative.com; 2023-05-23T21:14:45.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766721046499122688-1684876485000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0107_MSG_84_2023-05-23.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0107_MSG_84_2023-05-23.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230523-Re_[EXTERNAL] Missed Payment_-559.eml
- Source database / row: mayersky_smoking_gun / 84
- Parsed headers: exhibit=EXH-0107; message_id=<40B5CE7E-EBE0-436D-B3FE-393373296B27@rowboatcreative.com>; date=2023-05-23T16:46:49-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Are there now 3 months of back payments due as well?
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223237
- Target message/date/from/to/cc/subject: DC2D9C25-FBB0-4C55-A5FD-5E645BAE7CD1@rowboatcreative.com; 2023-05-23T21:14:45.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766721046499122688-1684876485000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0115_MSG_85_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0115_MSG_85_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-363.eml
- Source database / row: mayersky_smoking_gun / 85
- Parsed headers: exhibit=EXH-0115; message_id=<CF7C897A-9863-4D21-8771-0148F937618B@rowboatcreative.com>; date=2023-05-24T12:38:29-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Can we talk through things when you might have a moment? I just want to make sure I fully understand what is best
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0116_MSG_86_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0116_MSG_86_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-362.eml
- Source database / row: mayersky_smoking_gun / 86
- Parsed headers: exhibit=EXH-0116; message_id=<3B9B21FC-CA2F-4FFF-A735-D8C137713FED@rowboatcreative.com>; date=2023-05-24T12:38:59-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Can we talk through things when you might have a moment? I just want to make sure I fully understand what is best
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0117_MSG_83_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0117_MSG_83_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-360.eml
- Source database / row: mayersky_smoking_gun / 83
- Parsed headers: exhibit=EXH-0117; message_id=<9B70B779-E3CE-41AD-89F5-F4E5AC15582F@rowboatcreative.com>; date=2023-05-24T12:39:29-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Can we talk through things when you might have a moment? I just want to make sure I fully understand what is best
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0118_MSG_89_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0118_MSG_89_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-359.eml
- Source database / row: mayersky_smoking_gun / 89
- Parsed headers: exhibit=EXH-0118; message_id=<C35C1EEE-F340-4CFE-A3EA-36A9C42F9183@rowboatcreative.com>; date=2023-05-24T12:39:59-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Can we talk through things when you might have a moment? I just want to make sure I fully understand what is best
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0119_MSG_93_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0119_MSG_93_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-358.eml
- Source database / row: mayersky_smoking_gun / 93
- Parsed headers: exhibit=EXH-0119; message_id=<A9233FAB-A980-4F1A-80D3-01A88F9E947C@rowboatcreative.com>; date=2023-05-24T12:40:29-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Can we talk through things when you might have a moment? I just want to make sure I fully understand what is best
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0120_MSG_56_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0120_MSG_56_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-356.eml
- Source database / row: mayersky_smoking_gun / 56
- Parsed headers: exhibit=EXH-0120; message_id=<4BC25C36-44C6-4084-BF88-7DD161ED1145@rowboatcreative.com>; date=2023-05-24T12:40:59-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Can we talk through things when you might have a moment? I just want to make sure I fully understand what is best
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0122_MSG_65_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0122_MSG_65_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-344.eml
- Source database / row: mayersky_smoking_gun / 65
- Parsed headers: exhibit=EXH-0122; message_id=<51FA9357-3CCD-4EC4-BB19-811BA2A07442@rowboatcreative.com>; date=2023-05-24T12:54:56-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Thank you Amy! With leaving the fixed rate on at monthly payments of $1479.
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0124_MSG_78_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0124_MSG_78_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-332.eml
- Source database / row: mayersky_smoking_gun / 78
- Parsed headers: exhibit=EXH-0124; message_id=<06935B74-7E11-4F2C-8F3C-B51AF4412560@rowboatcreative.com>; date=2023-05-24T13:06:36-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Ok I will review. The fixed rate can be amended at any point correct? In the event that the prime drops then we can
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0128_MSG_70_2023-05-24.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0128_MSG_70_2023-05-24.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230524-Re_[EXTERNAL] Missed Payment_-322.eml
- Source database / row: mayersky_smoking_gun / 70
- Parsed headers: exhibit=EXH-0128; message_id=<721AF9C7-8423-4565-AC29-88FDA4575CF2@rowboatcreative.com>; date=2023-05-24T13:24:08-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: What does that exactly mean and how does i
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223162
- Target message/date/from/to/cc/subject: B156576E-C7B5-4F19-8043-4D46E4FFCE6A@rowboatcreative.com; 2023-05-24T17:24:19.000Z; lucas@rowboatcreative.com; Amy.Laughinghouse@firstcitizens.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766797146364854036-1684949059000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0134_MSG_90_2023-05-25.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0134_MSG_90_2023-05-25.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230525-Re_[EXTERNAL] Missed Payment_-58.eml
- Source database / row: mayersky_smoking_gun / 90
- Parsed headers: exhibit=EXH-0134; message_id=<3D7CD163-DB20-484B-B87B-2E40EB8C80A2@rowboatcreative.com>; date=2023-05-25T14:19:18-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,Attached is the signed document.
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223049
- Target message/date/from/to/cc/subject: BN6PR11MB4148E34A43E841557E93D4B7F2469@BN6PR11MB4148.namprd11.prod.outlook.com; 2023-05-25T18:54:47.000Z; Amy.Laughinghouse@firstcitizens.com; lucas@rowboatcreative.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766893443433770898-1685040887000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0135_MSG_57_2023-05-25.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0135_MSG_57_2023-05-25.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230525-Re_[EXTERNAL] Missed Payment_-57.eml
- Source database / row: mayersky_smoking_gun / 57
- Parsed headers: exhibit=EXH-0135; message_id=<8AAF1AFE-7DB4-425A-BA6C-ABEB7DE3EA32@rowboatcreative.com>; date=2023-05-25T14:23:18-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,The signed document was sent securely. I will stop in a branch today to make the overdue payment. Can you please 
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223049
- Target message/date/from/to/cc/subject: BN6PR11MB4148E34A43E841557E93D4B7F2469@BN6PR11MB4148.namprd11.prod.outlook.com; 2023-05-25T18:54:47.000Z; Amy.Laughinghouse@firstcitizens.com; lucas@rowboatcreative.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766893443433770898-1685040887000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0136_MSG_60_2023-05-25.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0136_MSG_60_2023-05-25.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230525-Re_[EXTERNAL] Missed Payment_-56.eml
- Source database / row: mayersky_smoking_gun / 60
- Parsed headers: exhibit=EXH-0136; message_id=<C6ED276F-DCA8-4F43-A464-E49CA0C0BEA8@rowboatcreative.com>; date=2023-05-25T14:23:48-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,The signed document was sent securely. I will stop in a branch today to make the overdue payment. Can you please 
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223049
- Target message/date/from/to/cc/subject: BN6PR11MB4148E34A43E841557E93D4B7F2469@BN6PR11MB4148.namprd11.prod.outlook.com; 2023-05-25T18:54:47.000Z; Amy.Laughinghouse@firstcitizens.com; lucas@rowboatcreative.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766893443433770898-1685040887000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0137_MSG_54_2023-05-25.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0137_MSG_54_2023-05-25.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230525-Re_[EXTERNAL] Missed Payment_-55.eml
- Source database / row: mayersky_smoking_gun / 54
- Parsed headers: exhibit=EXH-0137; message_id=<1C377727-289A-45FC-B358-FD09F2E2D5FE@rowboatcreative.com>; date=2023-05-25T14:24:18-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,The signed document was sent securely. I will stop in a branch today to make the overdue payment. Let’s hold the 
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223049
- Target message/date/from/to/cc/subject: BN6PR11MB4148E34A43E841557E93D4B7F2469@BN6PR11MB4148.namprd11.prod.outlook.com; 2023-05-25T18:54:47.000Z; Amy.Laughinghouse@firstcitizens.com; lucas@rowboatcreative.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766893443433770898-1685040887000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0138_MSG_53_2023-05-25.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0138_MSG_53_2023-05-25.txt
- Source path: 2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml/20230525-Re_[EXTERNAL] Missed Payment_-54.eml
- Source database / row: mayersky_smoking_gun / 53
- Parsed headers: exhibit=EXH-0138; message_id=<8A8F43C2-2B93-4069-93C1-DA6F33783F2B@rowboatcreative.com>; date=2023-05-25T14:24:48-04:00; from=Lucas Guariglia <lucas@rowboatcreative.com>; to="Laughinghouse, Amy" <Amy.Laughinghouse@firstcitizens.com>; cc=; subject=Re: [EXTERNAL] Missed Payment?; subdirectory=2023-05-23 LG talks to First Citzens Bank home equity line of credit/eml
- Body phrase used: Hi Amy,The signed document was sent securely. I will stop in a branch today to make the overdue payment. Let’s hold the 
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 223049
- Target message/date/from/to/cc/subject: BN6PR11MB4148E34A43E841557E93D4B7F2469@BN6PR11MB4148.namprd11.prod.outlook.com; 2023-05-25T18:54:47.000Z; Amy.Laughinghouse@firstcitizens.com; lucas@rowboatcreative.com; ; Re: [EXTERNAL] Missed Payment?
- Target source fields: 1766893443433770898-1685040887000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=84; date_match=True; address_overlap_count=2
- Match evidence: exact subject: Re: [EXTERNAL] Missed Payment?
- Candidate count: 75

### EXH-0141_LML_183_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0141_LML_183_nodate.txt
- Source path: 2020-02-05 LM credit limit extended/20200205-Re_Online banking-23119.pdf
- Source database / row: leonard_mayersky_locker / 183
- Parsed headers: exhibit=EXH-0141; message_id=N/A; date=N/A; from=<>; to=Joseph Zangrilli <joe@rowboatcreative.com>CC: Lucas Guariglia <lucas@rowboatcreative.com>, "Mendoza, Haidy"<Haidy.Mendoza@53.com>Limits approved. Will keep you updated. Almost wrapped up!Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Wednesday, February 5, 2020 11:52:56 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=Lucas Guariglia <lucas@rowboatcreative.com>; Mendoza, Haidy <Haidy.Mendoza@53.com>; subject=Re: Online bankingFrom: "Mayersky, Leonard" <Leonard.Mayersky@53.com>; subdirectory=2020-02-05 LM credit limit extended
- Body phrase used: 1 of 16/9/23, 8:13 PM
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 262624
- Target message/date/from/to/cc/subject: CH2PR19MB3768FF84B1CC1B54BAC2F5E8E1020@CH2PR19MB3768.namprd19.prod.outlook.com; 2020-02-05T19:11:13.000Z; Leonard.Mayersky@53.com; joe@rowboatcreative.com; lucas@rowboatcreative.com,Haidy.Mendoza@53.com; Re: Online banking
- Target source fields: 1657725127102316644-1580929873000; 2024-06-22-all-37.zip; 2024-06-22-all--joe@rowboatcreative.com-dEQiAz.mbox
- Match reason: methods=exact_subject; score=71; date_match=False; address_overlap_count=4
- Match evidence: exact subject: Re: Online banking
- Candidate count: 20

### EXH-0142_LML_187_nodate.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0142_LML_187_nodate.txt
- Source path: 2023-03-03 Len sends new encryted email to LG needs password/030323 LEN and LG encrypted Info.pdf
- Source database / row: leonard_mayersky_locker / 187
- Parsed headers: exhibit=EXH-0142; message_id=N/A; date=N/A; from=<>; to="lucas@rowboatcreative.com" <lucas@rowboatcreative.com> You have received a secure message from Fifth Third Email Encryption. Read your secure message by opening the attachment, securedoc_20230303T095915.html. You willbe prompted to open (view) the file or save (download) it to your computer. For best results, save the filefirst, then open it in a Web browser.NOTE: Please contact CISCO CRES Technical Support if you need assistance with any of thefollowing areas: Registration/Account Creation, Locked Account, Password Reset, SecurityQuestions or Accessing Attachments. CRES technical support is available 24 hours on weekdays:• CRES technical support is available 24 hours on weekdays:◦ Frequently Asked Questions webpage at: http://res.cisco.com/websafe/help?topic=FAQ◦ Email support: support@res.cisco.com◦ Online chat support: https://res.cisco.com/websafe/help?topic=ContactSupport• For Fifth Third Financial Risk Solutions (Swap Dealer) trade related questions, call 877-874-9914.• For all other questions, contact Fifth Third Bank, N.A. at 855-877-3875 or via email atFifthThirdEmailSupport@53.com. Contact email support only for problems opening the attachment, ifyou have questions regarding the content of the message or its validity please contact the senderdirectly.About Cisco Registered Email Service -https://res.cisco.com/websafe/about Attachments:securedoc_20230303T095915.html303 KBInfo; cc=; subject=InfoFrom: "Mayersky, Leonard" <Leonard.Mayersky@53.com>; subdirectory=2023-03-03 Len sends new encryted email to LG needs password
- Body phrase used: 1 of 15/26/23, 10:18 AM
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 234274
- Target message/date/from/to/cc/subject: 13cbf0$8q4n7t@soflokydciron03.info53.com; 2023-03-03T14:59:17.000Z; Leonard.Mayersky@53.com; lucas@rowboatcreative.com; ; Info
- Target source fields: 1759359072065493102-1677855557000; 2024-06-22-all-14.zip; 2024-06-22-all--lucas@rowboatcreative.com-KqTV-Q.mbox
- Match reason: methods=exact_subject; score=72; date_match=True; address_overlap_count=1
- Match evidence: exact subject: Info
- Candidate count: 25

### EXH-0155_LML_191_2020-01-16.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0155_LML_191_2020-01-16.txt
- Source path: 2020-01-17 RBC welcomed as new customer at 53/2020-01-17 RBC welcomed as new customer at 53.pdf
- Source database / row: leonard_mayersky_locker / 191
- Parsed headers: exhibit=EXH-0155; message_id=N/A; date=2020-01-16T13:33:00; from=Lucas <Guariglialucas@rowboatcreative.com>; to=Mendoza, HaidyHaidy.Mendoza@53.com; cc=Mayersky, LeonardLeonard.Mayersky@53.com,Joe Zangrillijoe@rowboatcreative.comThank you Haidy!Pleasure to e-meet you as well. Including my business partner and COO Joe. I am at Chase right now trying to ﬁnalize close out. Will contact you should there be any issues with direct wire hopefully coming overwithin the hour. -- Lucas Guarigliacell: 847.828.0944ofﬁce: 773.675.BOAT (2628)CEO  | Co-founderRowboat Creativecustom screen printing | embroidery | merchandisingASI: 83710www.rowboatcreative.comhttps://www.instagram.com/rowboat_creativeOn Jan 16, 2020, at 1:21 PM, Mendoza, Haidy <Haidy.Mendoza@53.com> wrote:; subject=Re: Internet and mobile log in; subdirectory=2020-01-17 RBC welcomed as new customer at 53
- Body phrase used: From:Lucas Guariglialucas@rowboatcreative.comSubject:Re: Internet and mobile log inDate:January 16, 2020 at 1:33 PMTo:Me
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 265622
- Target message/date/from/to/cc/subject: 9FA54455-3539-4214-BF47-8A9E43226913@rowboatcreative.com; 2020-01-16T22:17:04.000Z; lucas@rowboatcreative.com; Haidy.Mendoza@53.com; joe@rowboatcreative.com,Leonard.Mayersky@53.com; Re: Internet and mobile log in
- Target source fields: 1655924880886647263-1579213024000; 2024-06-22-all-37.zip; 2024-06-22-all--joe@rowboatcreative.com-dEQiAz.mbox
- Match reason: methods=exact_subject; score=72; date_match=True; address_overlap_count=1
- Match evidence: exact subject: Re: Internet and mobile log in
- Candidate count: 61

### EXH-0228_LML_189_2020-01-31.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0228_LML_189_2020-01-31.txt
- Source path: 2020-01-31 LG SENDS email to LM JD CC RM from 53 and asks when issues will subside Not a day has gone by without interruption/2020-01-31 LM  from 53 replies this is just 53com issues.pdf
- Source database / row: leonard_mayersky_locker / 189
- Parsed headers: exhibit=EXH-0228; message_id=N/A; date=2020-01-31T12:06:00; from=Mayersky, <LeonardLeonard.Mayersky@53.com>; to=Cooney, CarolynCAROLYN.COONEY@53.com,Lucas Guariglialucas@rowboatcreative.com,Mingo, RonRon.Mingo@53.com,Duffek, JillJill.Duffek@53.com; cc=Joe Zangrillijoe@rowboatcreative.comThis is just 53.com issues.  Len MayerskyVice President | Business Banking; subject=RE: SECURITY; subdirectory=2020-01-31 LG SENDS email to LM JD CC RM from 53 and asks when issues will subside Not a day has gone by without interruption
- Body phrase used: Is anyone able to answer when these security issues will subside? Not a day has gone bywithout an interruption and inabi
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 263418
- Target message/date/from/to/cc/subject: F24346F1-B675-461E-8B01-FB1DF448C006@rowboatcreative.com; 2020-01-31T18:05:37.000Z; lucas@rowboatcreative.com; CAROLYN.COONEY@53.com; Ron.Mingo@53.com,Jill.Duffek@53.com,Leonard.Mayersky@53.com,joe@rowboatcreative.com; Re: SECURITY
- Target source fields: 1657268026150477068-1580493937000; 2024-06-22-all-37.zip; 2024-06-22-all--joe@rowboatcreative.com-dEQiAz.mbox
- Match reason: methods=exact_subject; score=60; date_match=True; address_overlap_count=0
- Match evidence: exact subject: RE: SECURITY
- Candidate count: 13

### EXH-0235_LML_165_2020-02-05.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0235_LML_165_2020-02-05.txt
- Source path: 2020-02-05 LG emails LM HM JZ so many emails and separate threads we are unsure what still needs to happen calls system overcomplicated/2020-02-05 LG emails LM HM JZ so many emails and separate threads we are unsure what still needs to happen calls system overcomplicated.pdf
- Source database / row: leonard_mayersky_locker / 165
- Parsed headers: exhibit=EXH-0235; message_id=N/A; date=2020-02-05T08:24:00; from=Lucas <Guariglialucas@rowboatcreative.com>; to=Mendoza, HaidyHaidy.Mendoza@53.com; cc=Mayersky, LeonardLeonard.Mayersky@53.com,Joe Zangrillijoe@rowboatcreative.comHi Haidy,We are in the height of busy season ramp up which is why we were trying to get through setup and hurdles as quick as possible. There have obviously still been hiccups to tend to. I am still unable to login via my mobile phone. It has a security block on it even after deleting the app and reinstalling. I am able to login on my computer using the exact same credentials. Very confused why this would be and I don't feel comfortable calling the number it asks me to which then requires me to tell my social security number etc. Any ideas on this?Additionally, since the previous Chase account is closed down, I do not have access to bank statements which Len needs to complete something. I have to make a separate trip to a branch to retrieve these. Will try to do so this week. There are so many emails and separate threads at this point, we are unsure as to what is still not setup and what needs to happen. The system just seems very over complicated to have separate platforms whereas chase we had 1 login and portal to do everything. Please let me know on the above. Thanks! _______________________________Lucas Guarigliacell: 847.828.0944ofﬁce: 773.675.BOAT (2628)CEO | Co-founderRowboat Creativecustom screen printing | embroidery | merchandisingASI: 83710www.rowboatcreative.comhttps://www.instagram.com/rowboat_creativeOn Jan 31, 2020, at 8:22 PM, Mendoza, Haidy <Haidy.Mendoza@53.com> wrote:Hi Lucas,I called you earlier today and left a voicemail. If you still need my assistance with it, call me anything after 9 monday.This e-mail transmission contains information that is conﬁdential and may be privileged.It is intended only for the addressee(s) named above. If you receive this e-mail in error,please do not read, copy or disseminate it in any manner.  If you are not the intended recipient, any disclosure, copying, distribution or use of the contents of this informationis prohibited. Please reply to the message immediately by informing the sender that the message was misdirected. After replying, please erase it from your computer system. Your assistance in correcting this error is appreciated.; subject=Re: Online banking; subdirectory=2020-02-05 LG emails LM HM JZ so many emails and separate threads we are unsure what still needs to happen calls system overcomplicated
- Body phrase used: From:Lucas Guariglialucas@rowboatcreative.comSubject:Re: Online bankingDate:February 5, 2020 at 8:24 AMTo:Mendoza, Haidy
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 262624
- Target message/date/from/to/cc/subject: CH2PR19MB3768FF84B1CC1B54BAC2F5E8E1020@CH2PR19MB3768.namprd19.prod.outlook.com; 2020-02-05T19:11:13.000Z; Leonard.Mayersky@53.com; joe@rowboatcreative.com; lucas@rowboatcreative.com,Haidy.Mendoza@53.com; Re: Online banking
- Target source fields: 1657725127102316644-1580929873000; 2024-06-22-all-37.zip; 2024-06-22-all--joe@rowboatcreative.com-dEQiAz.mbox
- Match reason: methods=exact_subject; score=72; date_match=True; address_overlap_count=1
- Match evidence: exact subject: Re: Online banking
- Candidate count: 20

### EXH-0267_LML_188_2020-02-27.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0267_LML_188_2020-02-27.txt
- Source path: 2020-02-26  LG emails LM HM unable to log in not sure what access code is asks if have to deal with token situation repeatedly/2020-02-26 LG emails LM HM unable to log in not sure what access code is asks if have to deal with token situation repeatedly.pdf
- Source database / row: leonard_mayersky_locker / 188
- Parsed headers: exhibit=EXH-0267; message_id=N/A; date=2020-02-27T09:56:00; from=Mayersky, <LeonardLeonard.Mayersky@53.com>; to=Lucas Guariglialucas@rowboatcreative.com,Mendoza, HaidyHaidy.Mendoza@53.com; cc=Joe Zangrillijoe@rowboatcreative.comGood morning, Ok, heard back from Carolyn. You would have either downloaded to have a smart tokenon your cell or ordered a token and would have been emailed a temporary code to usefor 10 days. We’re way past the 10 days. Please call the CSC for help 866-475-0729 options 1, 1 , 1 Keep me posted!  Len MayerskyVice President | Business Banking; subject=RE: 53 Direct; subdirectory=2020-02-26  LG emails LM HM unable to log in not sure what access code is asks if have to deal with token situation repeatedly
- Body phrase used: Unable to login. Not sure wha the temporary access code is. System won’t let me retrieve it either as it says can’t iden
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 258959
- Target message/date/from/to/cc/subject: C6C8EDE1-4C0D-4E4E-8302-822F9FFAAAD8@rowboatcreative.com; 2020-02-27T16:05:15.000Z; joe@rowboatcreative.com; Leonard.Mayersky@53.com; lucas@rowboatcreative.com,Haidy.Mendoza@53.com; Re: 53 Direct
- Target source fields: 1659706558327712185-1582819515000; 2024-06-22-all-37.zip; 2024-06-22-all--joe@rowboatcreative.com-dEQiAz.mbox
- Match reason: methods=exact_subject; score=60; date_match=True; address_overlap_count=0
- Match evidence: exact subject: RE: 53 Direct
- Candidate count: 21

### EXH-0542_LML_192_2021-06-10.txt
- Source TXT: /Volumes/iseepatterns-evidence/IGNORE/data_other/EMAILS_LOCKER/EXH-0542_LML_192_2021-06-10.txt
- Source path: Leonard.mayersky@53.com/Fwd Document  Jun 10 2021.pdf
- Source database / row: leonard_mayersky_locker / 192
- Parsed headers: exhibit=EXH-0542; message_id=N/A; date=2021-06-10T08:45:00; from=Mayersky, <LeonardLeonard.Mayersky@53.com>; to=lucas@rowboatcreative.comHi Lucas,I got this from Joe. I don’t know what he is talking about??Get Outlook for iOSFrom: Joseph Zangrilli <joe@rowboatcreative.com>Sent: Thursday, June 10, 2021 8:19:55 AMTo: Mayersky, Leonard <Leonard.Mayersky@53.com>; cc=; subject=Fwd: Document - Jun 10, 2021; subdirectory=Leonard.mayersky@53.com
- Body phrase used: emails
- Classification: probable metadata match
- Target DB / ID: mbox_metadata.db / 390394
- Target message/date/from/to/cc/subject: DM6PR19MB29867689F669B3922A9E2070E1359@DM6PR19MB2986.namprd19.prod.outlook.com; 2021-06-10T13:45:29.000Z; Leonard.Mayersky@53.com; lucas@rowboatcreative.com; ; Fwd: Document - Jun 10, 2021
- Target source fields: 1702187748122914957-1623332729000; 2024-06-22-all-30.zip; 2024-06-22-all--lucas@rowboatcreative.com-1IaZg-.mbox
- Match reason: methods=exact_subject; score=72; date_match=True; address_overlap_count=1
- Match evidence: exact subject: Fwd: Document - Jun 10, 2021
- Candidate count: 2
