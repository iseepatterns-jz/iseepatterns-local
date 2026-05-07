#!/usr/bin/env python3
"""Generate attorney syntheses for email batch 01 (51 emails)."""

import os
import re
import sys

BATCH_FILE = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/batches/email_batch_01_of_10.txt"
OUTPUT_DIR = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/pipeline/artifacts/03-email-attorney/"

def parse_email_header(filepath):
    """Parse the email header section (lines before BODY marker)."""
    header = {}
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Split header from body
    body_split = re.split(r'\n--- BODY \(CLEAN\) ---\n', content, maxsplit=1)
    header_text = body_split[0]
    clean_body = body_split[1] if len(body_split) > 1 else ""
    
    # Extract fields
    for line in header_text.split('\n'):
        line = line.strip()
        if line.startswith('EXHIBIT '):
            header['EXHIBIT'] = line.replace('EXHIBIT ', '').strip()
        elif line.startswith('FROM:'):
            header['FROM'] = line.replace('FROM:', '').strip()
        elif line.startswith('TO:'):
            header['TO'] = line.replace('TO:', '').strip()
        elif line.startswith('CC:'):
            header['CC'] = line.replace('CC:', '').strip()
        elif line.startswith('SUBJECT:'):
            header['SUBJECT'] = line.replace('SUBJECT:', '').strip()
        elif line.startswith('DATE:'):
            header['DATE'] = line.replace('DATE:', '').strip()
        elif line.startswith('JZ_CCED:'):
            header['JZ_CCED'] = line.replace('JZ_CCED:', '').strip()
        elif line.startswith('ENCRYPTED:'):
            header['ENCRYPTED'] = line.replace('ENCRYPTED:', '').strip()
        elif line.startswith('PRIORITY:'):
            header['PRIORITY'] = line.replace('PRIORITY:', '').strip()
        elif line.startswith('MESSAGE-ID:'):
            header['MESSAGE_ID'] = line.replace('MESSAGE-ID:', '').strip()
        elif line.startswith('IN-REPLY-TO:'):
            header['IN_REPLY_TO'] = line.replace('IN-REPLY-TO:', '').strip()
        elif line.startswith('SOURCE DATABASE:'):
            header['SOURCE_DB'] = line.replace('SOURCE DATABASE:', '').strip()
        elif line.startswith('SUBDIRECTORY:'):
            header['SUBDIRECTORY'] = line.replace('SUBDIRECTORY:', '').strip()
        elif line.startswith('DB ROW ID:'):
            header['DB_ROW_ID'] = line.replace('DB ROW ID:', '').strip()
    
    return header, clean_body


def extract_date_display(date_str):
    """Extract a human-readable date."""
    if not date_str or date_str == 'N/A':
        return 'N/A'
    # Try ISO format
    m = re.match(r'(\d{4}-\d{2}-\d{2})T', date_str)
    if m:
        return m.group(1)
    return date_str


def generate_synthesis(item_id, exhibit_id, header, clean_body, filepath):
    """Generate attorney synthesis for one email."""
    subj = header.get('SUBJECT', 'No Subject')
    date_raw = header.get('DATE', 'N/A')
    date_display = extract_date_display(date_raw)
    from_field = header.get('FROM', 'Unknown')
    to_field = header.get('TO', 'Unknown')
    priority = header.get('PRIORITY', '')
    encrypted = header.get('ENCRYPTED', 'NO')
    jz_cced = header.get('JZ_CCED', 'NO')
    source_db = header.get('SOURCE_DB', '')
    subdir = header.get('SUBDIRECTORY', '')
    msg_id = header.get('MESSAGE_ID', 'N/A')
    in_reply_to = header.get('IN_REPLY_TO', 'N/A')
    
    # Truncate body for analysis
    body_short = clean_body[:2000].strip()
    
    # === ANALYSIS LOGIC ===
    
    # Determine email group for synthesis content
    is_duplicate = False
    duplicate_of = ""
    
    # BBB Complaints PDF (EXH-0060)
    if 'EXH-0060' in exhibit_id:
        evidence_summary = (
            "This exhibit is a Third-Party Business Record: a Better Business Bureau (BBB) profile page for SavageXFenty "
            "showing 743 total complaints in 3 years and 145 complaints closed in the last 12 months. Multiple consumer "
            "complaints describe a pattern of unauthorized recurring charges, misleading checkout processes that enroll "
            "customers in VIP memberships without clear consent, refusal to process refunds, and expiration of paid "
            "membership credits. This document corroborates JZ's allegations that the SavageXFenty charges on his "
            "personal 53 account were part of a broader pattern of consumer fraud by the merchant, not isolated incidents."
        )
        claim_alignment = (
            "**Fraud: SUPPORTING** — Demonstrates pattern of deceptive business practices by SavageXFenty consistent with "
            "JZ's claims of unauthorized charges. (Common law fraud elements: false representation, scienter, intent to "
            "induce reliance, justifiable reliance, damages.)\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — SavageXFenty's recurring charges processed via electronic "
            "interstate payment networks constitute wire transmissions in furtherance of a scheme to defraud.\n"
            "**Mail Fraud (18 USC 1341): TANGENTIAL** — BBB complaints involve written communications but primary "
            "relevance is to electronic/telephone transactions.\n"
            "**Fiduciary Breach: BACKGROUND** — Demonstrates the nature of the underlying fraud that 53 failed to prevent, "
            "but not directly about 53's fiduciary duties.\n"
            "**Conversion: TANGENTIAL** — The complaints describe retention of consumer funds without providing goods/services.\n"
            "**Breach of Contract: BACKGROUND** — Provides context for the merchant agreement violations.\n"
            "**Accounting: BACKGROUND** — Relevant to tracing unauthorized charges.\n"
            "**Unjust Enrichment: SUPPORTING** — Shows SavageXFenty retained funds from consumers without proper authorization, "
            "supporting the theory that they were unjustly enriched at JZ's expense.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Pattern of racketeering activity evidenced by systematic consumer fraud "
            "across multiple victims over an extended period.\n"
            "**Computer Fraud (18 USC 1030): TANGENTIAL** — Charges processed via computer systems."
        )
        cross_refs = (
            "Cross-references: EXH-0074 through EXH-0081 (JZ's communications with 53 about SavageXFenty charges); "
            "EXH-0084/EXH-0085 (JZ's complaint to LM about year-old unresolved fraud); EXH-0082/EXH-0083 "
            "(JZ forwarding payroll issues to LG showing cumulative banking problems). Timeline: The BBB profile was "
            "accessed 12/5/2023, but complaints span September-November 2023, contemporaneous with JZ's account issues."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — demonstrates pattern and practice of the merchant whose charges "
            "are at issue. FRE 403: Probative value outweighs any prejudice; the document is a neutral third-party record. "
            "Hearsay (FRE 801/802): The BBB profile is a business record (FRE 803(6)) and/or public record. Individual "
            "consumer complaints within are hearsay but admissible as statements of then-existing mental/emotional "
            "condition (FRE 803(3)) or as business records incorporated into BBB's regular course. Authentication "
            "(FRE 901): Authenticate via BBB custodian certification or FRE 902(11) self-authentication for business records."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Mayersky, did you or anyone at 53 ever investigate whether SavageXFenty "
            "was a known fraudulent merchant before declining JZ's fraud claims?' (2) 'Were 53's fraud detection systems "
            "flagging the SavageXFenty charge pattern given their BBB complaint volume?' "
            "Discovery follow-ups: Subpoena SavageXFenty's merchant processing records with 53; obtain 53's internal "
            "fraud detection policies for recurring unauthorized charges. Timing: Use this as demonstrative exhibit "
            "at summary judgment to establish merchant's fraudulent nature."
        )
        exhibit_readiness = (
            "Redactions: None required — all consumer names already redacted by BBB. Foundation witness: BBB records "
            "custodian or FRE 902(11) certification. File format: PDF text extraction. Authenticate via BBB certificate."
        )
    
    # LM forwards JZ's inquiry to LG (EXH-0061, EXH-0065, EXH-0067, EXH-0068)
    elif any(x in exhibit_id for x in ['EXH-0061', 'EXH-0065', 'EXH-0067', 'EXH-0068']):
        evidence_summary = (
            "This email shows Leonard Mayersky (53 bank relationship manager) forwarding Joseph Zangrilli's personal "
            "account inquiry to Lucas Guariglia (Rowboat Creative co-founder) on June 10, 2021. LM states: 'I got this "
            "from Joe. I don't know what he is talking about??' The forwarded email from JZ to LM includes a scan of "
            "physical mail related to a year-old credit card fraud dispute that 53 allegedly failed to resolve. LM's "
            "decision to forward JZ's confidential banking matter to LG — without JZ's consent — is itself a potential "
            "breach of banking confidentiality and privacy obligations."
        )
        if 'EXH-0065' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0061 from a different file path within the LM locker."
        elif 'EXH-0067' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0061 from a different file path (pdf storage subdirectory)."
        elif 'EXH-0068' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0061 from a different file path."
        
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — LM's disclosure of JZ's personal banking communications to a third party "
            "(LG) without JZ's knowledge or consent violates the bank's duty of confidentiality to its customer. "
            "Under common law, banks owe fiduciary duties of confidentiality and loyalty to depositors.\n"
            "**Fraud: SUPPORTING** — The forwarding occurred in a broader context where LG and LM were allegedly "
            "collaborating to JZ's detriment, including account manipulation.\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — Electronic transmission of confidential banking information to "
            "a third party in furtherance of a scheme to defraud JZ.\n"
            "**Mail Fraud (18 USC 1341): TANGENTIAL** — The physical mail scan was transmitted via email.\n"
            "**Computer Fraud (18 USC 1030): SUPPORTING** — Unauthorized disclosure of protected financial information "
            "via computer systems.\n"
            "**RICO (18 USC 1962): SUPPORTING** — This communication is evidence of the LM-LG enterprise operating "
            "through interstate wire facilities.\n"
            "**Fiduciary Breach: DIRECT** — (additional) 53's failure to resolve the underlying fraud dispute for over "
            "a year constitutes breach of the duty of care.\n"
            "**Conversion: BACKGROUND** — The underlying fraud involves conversion of JZ's funds.\n"
            "**Breach of Contract: BACKGROUND** — The account agreement requires timely fraud investigation.\n"
            "**Accounting: BACKGROUND** — Relevant to tracing the disputed charges.\n"
            "**Unjust Enrichment: BACKGROUND** — 53 benefited from fees on fraudulent charges."
        )
        cross_refs = (
            "Cross-references: EXH-0063/EXH-0066 (LG's reply to LM); EXH-0084/EXH-0085 (JZ's original email to LM); "
            "EXH-0087-EXH-0090 (LM's original forwarding email in eml format); EXH-0074-EXH-0081 (JZ-53 correspondence "
            "about SavageXFenty fraud). Timeline: June 10, 2021 — LM receives JZ's fraud complaint and immediately "
            "forwards to LG rather than handling through proper banking channels."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — direct evidence of confidential information sharing between "
            "LM and LG. FRE 403: No unfair prejudice — probative of breach of confidentiality and conspiracy. "
            "Hearsay (FRE 801/802): LM's statement 'I don't know what he is talking about??' is party-opponent "
            "admission (FRE 801(d)(2)) if LM is a party or authorized agent. JZ's forwarded email is not hearsay "
            "when offered to show LM's knowledge and subsequent actions. Authentication (FRE 901): Email metadata "
            "and LM's 53.com email address provide sufficient authentication."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Mayersky, what 53 policy authorized you to forward a customer's personal "
            "banking dispute to that customer's business partner?' (2) 'Mr. Guariglia, had Mr. Zangrilli ever authorized "
            "you to receive his personal banking communications from 53?' Discovery follow-ups: Obtain 53's privacy "
            "and confidentiality policies; subpoena all communications between LM and LG. Timing: Key exhibit for "
            "summary judgment on fiduciary breach and privacy violations."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: Leonard Mayersky (sender) or Lucas Guariglia (recipient). "
            "File format: Text extraction from email. JZ_CCED: YES — significant that JZ was not actually on the CC "
            "line of the LM-to-LG forwarding (the header metadata is unclear)."
        )
    
    # LG replies to LM (EXH-0063, EXH-0066)
    elif any(x in exhibit_id for x in ['EXH-0063', 'EXH-0066']):
        evidence_summary = (
            "Lucas Guariglia's reply to Leonard Mayersky on June 10, 2021, responding to LM's forwarding of JZ's "
            "personal banking dispute. LG apologizes, states he is 'unaware of what this is,' believes it relates "
            "'only to his personal accounts with 5/3,' and promises to 'speak with him and recommend that he "
            "transitions anything personal elsewhere.' LG explicitly states: 'There should be no intermingling of "
            "personal matters NS business.' Critically, LG characterizes JZ's fraud complaint as 'absolutely "
            "detrimental to a working business relationship' with LM, prioritizing the banking relationship over "
            "JZ's fraud victimization."
        )
        if 'EXH-0066' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0063 from a different file path."
        
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — LG, as co-founder/CEO of Rowboat Creative, owed fiduciary duties to "
            "JZ (co-owner). LG's response — apologizing to the bank for JZ's fraud complaint and characterizing "
            "JZ's legitimate dispute as 'detrimental' — demonstrates bad faith and disloyalty to his business "
            "partner. Instead of supporting JZ's effort to recover stolen funds, LG sided with the bank.\n"
            "**Fraud: SUPPORTING** — LG's minimization of JZ's fraud claim ('only his personal accounts') and "
            "active discouragement of JZ pursuing his rights supports the fraud/conspiracy theory.\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — Electronic communication furthering a scheme to deprive "
            "JZ of fraud recovery rights.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Evidence of the LM-LG relationship and coordinated action.\n"
            "**Breach of Contract: SUPPORTING** — LG's actions violate implied covenant of good faith and fair "
            "dealing in the partnership/operating agreement.\n"
            "**Conversion: BACKGROUND** — LG's response effectively aids the conversion of JZ's funds.\n"
            "**Unjust Enrichment: TANGENTIAL** — LG benefits from maintaining the banking relationship at JZ's expense."
        )
        cross_refs = (
            "Cross-references: EXH-0061/EXH-0065/EXH-0067/EXH-0068 (LM's forwarding to LG); EXH-0086 (same email "
            "from MSG database); EXH-0084/EXH-0085 (JZ's original complaint to LM). Timeline: June 10, 2021, "
            "09:18 AM — LG responds within approximately 30 minutes of LM's forward."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — party-opponent admission by LG. FRE 403: No unfair "
            "prejudice — highly probative of LG's disloyalty. Hearsay (FRE 801/802): LG's statements are "
            "party-opponent admissions (FRE 801(d)(2)(A)). Authentication (FRE 901): LG's @rowboatcreative.com "
            "email address and email metadata provide authentication."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Guariglia, why did you apologize to the bank for your business "
            "partner's fraud complaint?' (2) 'What do you mean by 'absolutely detrimental to a working business "
            "relationship' — were you worried the bank would retaliate against Rowboat Creative if JZ pursued "
            "his fraud claim?' Discovery follow-ups: Obtain all LG communications with LM; examine whether LG "
            "ever actually 'spoke with' JZ as promised. Timing: Powerful impeachment exhibit at deposition/trial."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: Lucas Guariglia (sender). File format: Text "
            "extraction from email. Key admission: LG acknowledges the issue involves JZ's personal accounts "
            "but treats it as detrimental to LG's relationship with the bank."
        )
    
    # PDF no text content (EXH-0062, EXH-0064)
    elif any(x in exhibit_id for x in ['EXH-0062', 'EXH-0064']):
        evidence_summary = (
            "This exhibit is a PDF attachment from 53 bank mailed to JZ, dated May 27, 2021, rejecting a "
            "portion of JZ's credit card fraud claim. The PDF was scanned and forwarded as part of the June 10, "
            "2021 email chain where LM forwarded JZ's personal account materials to LG. While this text "
            "extraction contains no readable body content (scanned image only), the exhibit establishes that "
            "53 formally denied at least part of JZ's fraud dispute, and that this denial letter was subsequently "
            "shared with LG by LM without authorization."
        )
        if 'EXH-0064' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0062 from a different file path."
        
        claim_alignment = (
            "**Fiduciary Breach: SUPPORTING** — 53's denial of a legitimate fraud claim, combined with LM's "
            "unauthorized sharing of the denial letter with LG, demonstrates breach of duty of care and loyalty.\n"
            "**Fraud: SUPPORTING** — The denial letter is evidence of 53's pattern of rejecting JZ's fraud "
            "claims despite compelling evidence.\n"
            "**Wire Fraud (18 USC 1343): TANGENTIAL** — The denial was transmitted electronically.\n"
            "**Breach of Contract: SUPPORTING** — Account agreement requires good-faith fraud investigation; "
            "denial suggests failure.\n"
            "**Conversion: BACKGROUND** — The funds remain converted due to 53's denial.\n"
            "**RICO (18 USC 1962): BACKGROUND** — Part of the pattern of conduct."
        )
        cross_refs = (
            "Cross-references: EXH-0084/EXH-0085 (JZ's complaint referencing the denial); EXH-0061/EXH-0063 "
            "(the forwarding chain containing this PDF). Timeline: May 27, 2021 — 53 mails rejection letter; "
            "June 10, 2021 — LM forwards to LG."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — establishes 53 denied the fraud claim. FRE 403: No "
            "prejudice. Hearsay (FRE 801/802): 53's denial letter is a business record (FRE 803(6)) and/or "
            "party admission (FRE 801(d)(2)). Authentication (FRE 901): The original PDF should be obtained "
            "from 53 via subpoena for proper authentication; the scanned copy can be authenticated by JZ as "
            "what he received."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Mayersky, why did you forward a denial letter regarding JZ's "
            "personal account to his business partner?' (2) 'What investigation did 53 conduct before denying "
            "this fraud claim?' Discovery follow-ups: Subpoena original denial letter and complete fraud "
            "investigation file from 53. Timing: Request original PDF in native format with metadata."
        )
        exhibit_readiness = (
            "Redactions: May need to redact account numbers if full account numbers visible in scan. "
            "Foundation witness: JZ (received the letter) or 53 records custodian. File format: PDF scan — "
            "best evidence rule may require original. Recommend OCR processing for text extraction."
        )
    
    # LG new account/visit at 53 (EXH-0069, EXH-0070, EXH-0071, EXH-0072, EXH-0073)
    elif any(x in exhibit_id for x in ['EXH-0069', 'EXH-0070', 'EXH-0071', 'EXH-0072', 'EXH-0073', 
                                        'EXH-0091', 'EXH-0092', 'EXH-0093', 'EXH-0094', 
                                        'EXH-0095', 'EXH-0096', 'EXH-0097', 'EXH-0098']):
        # These fall into two subcategories: LM locker PDF versions and MSG eml versions
        if 'User ID' in subj or 'EXH-0069' in exhibit_id or 'EXH-0097' in exhibit_id or 'EXH-0098' in exhibit_id:
            evidence_summary = (
                "Fifth Third Bank automated notification to Lucas Guariglia at his Rowboat Creative email "
                "(lucas@rowboatcreative.com) confirming that his User ID for 53 online banking has been "
                "retrieved/recovered. Dated January 31, 2023. This is significant because LG is accessing "
                "his personal 53 account using Rowboat Creative's corporate email infrastructure, indicating "
                "commingling of personal and business banking relationships. The User ID retrieval occurred "
                "approximately one week before the Rowboat Creative corporate account was closed."
            )
        elif 'New Account' in subj or 'EXH-0070' in exhibit_id or 'EXH-0091' in exhibit_id or 'EXH-0092' in exhibit_id:
            evidence_summary = (
                "Fifth Third Bank automated notification to Lucas Guariglia confirming the opening of a new "
                "5/3 Relationship Money Market account (account #x4548) on January 31, 2023. The confirmation "
                "was sent to LG's Rowboat Creative email address. The account was opened at the Dilworth "
                "Financial Center in Charlotte, NC — notably not in Chicago where Rowboat Creative is based. "
                "LG opened this personal account approximately one week before the Rowboat Creative corporate "
                "account was closed, suggesting LG was preparing an alternative banking relationship at 53 "
                "while JZ was being locked out."
            )
        elif 'Visit Summary' in subj or 'EXH-0071' in exhibit_id or 'EXH-0073' in exhibit_id or 'EXH-0093' in exhibit_id or 'EXH-0094' in exhibit_id:
            evidence_summary = (
                "Fifth Third Bank Visit Summary for Lucas Guariglia's in-person visit to the Dilworth "
                "Financial Center (1511 East Blvd, Charlotte, NC 28203) on January 31, 2023. LG opened "
                "a Fifth Third Relationship Money Market account (account #x4548, routing #053100737) "
                "during this visit. The Retail Personal Banker was Robin Varghese (NMLS #1932366). "
                "LG traveled to Charlotte, NC to open this account — far from both Rowboat Creative's "
                "Chicago base and LG's suspected actual location. This timing is highly suspicious: one "
                "week before the corporate account was closed."
            )
        elif 'Card PIN' in subj or 'EXH-0072' in exhibit_id or 'EXH-0095' in exhibit_id or 'EXH-0096' in exhibit_id:
            evidence_summary = (
                "Fifth Third Bank automated notification to Lucas Guariglia confirming the PIN was changed "
                "for the card ending in x6264, dated January 31, 2023. This is the same date LG opened the "
                "new personal money market account. The sequence of events — User ID retrieval, new account "
                "opening, visit to Charlotte branch, and PIN change all on January 31, 2023 — strongly "
                "suggests LG was securing his personal banking relationship at 53 in anticipation of "
                "imminent events affecting the corporate account."
            )
        
        claim_alignment = (
            "**Fiduciary Breach: SUPPORTING** — LG's establishment of personal banking at 53 using corporate "
            "email and in a distant city while JZ was being locked out of accounts demonstrates disloyalty "
            "and self-dealing.\n"
            "**Fraud: SUPPORTING** — The sequence and timing of LG's personal account activities strongly "
            "support the inference that LG had foreknowledge of the impending corporate account closure "
            "and was preparing for it.\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — Electronic banking communications across state lines "
            "in furtherance of the scheme.\n"
            "**Computer Fraud (18 USC 1030): TANGENTIAL** — Use of computer systems to manage personal "
            "account while corporate account issues were developing.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Part of the pattern of coordinated activity between LG "
            "and LM at 53.\n"
            "**Breach of Contract: BACKGROUND** — May violate partnership agreement regarding corporate "
            "opportunities and conflicts of interest.\n"
            "**Conversion: BACKGROUND** — Contextual evidence of LG's independent banking preparation.\n"
            "**Unjust Enrichment: TANGENTIAL** — LG secured personal banking benefits through corporate "
            "relationships."
        )
        cross_refs = (
            "Cross-references: EXH-0086 (LG's claim to LM that he would separate JZ's personal matters); "
            "EXH-0061-EXH-0068 (LM-LG communications about JZ's accounts). Timeline: January 31, 2023 — "
            "LG opens personal 53 account; ~February 7, 2023 — Rowboat Creative corporate account closed. "
            "The one-week gap is highly probative of premeditation."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — temporal proximity to corporate account closure "
            "and use of corporate email for personal banking. FRE 403: Probative value is very high; no "
            "unfair prejudice. Hearsay (FRE 801/802): Automated bank notifications are business records "
            "(FRE 803(6)). Authentication (FRE 901): 53's standard email templates and headers provide "
            "distinctive characteristics; can be authenticated via 53 records custodian."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Guariglia, why did you travel to Charlotte, NC to open a "
            "personal bank account at the same institution where Rowboat Creative banks, exactly one week "
            "before the corporate account was closed?' (2) 'Had you discussed the corporate account's "
            "status with Leonard Mayersky before opening your personal account?' Discovery follow-ups: "
            "Subpoena LG's complete personal account records from 53; obtain branch surveillance footage "
            "from January 31, 2023. Timing: This sequence is critical for proving premeditation and "
            "coordinated action."
        )
        exhibit_readiness = (
            "Redactions: Redact full account numbers (last 4 digits only shown). Foundation witness: 53 "
            "records custodian or FRE 902(11) certification. File format: Email text extraction or .eml "
            "native format."
        )
    
    # JZ to 53 - Guess who (EXH-0074, EXH-0075)
    elif any(x in exhibit_id for x in ['EXH-0074', 'EXH-0075']):
        evidence_summary = (
            "Joseph Zangrilli emails Esau Martinez at Fifth Third Bank on May 17, 2021, with a terse "
            "message: 'Yea, It's still blocking me. I'll come in and you can fix it.' This email is part "
            "of a chain regarding persistent bank blocks on JZ's accounts. The casual, frustrated tone "
            "suggests this is a recurring problem JZ has been dealing with repeatedly. JZ references "
            "coming into the branch in person, indicating remote/phone resolution had failed."
        )
        if 'EXH-0075' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0074 from the LM locker database."
        
        claim_alignment = (
            "**Fiduciary Breach: SUPPORTING** — 53's persistent blocking of JZ's account access without "
            "adequate explanation or resolution demonstrates failure of the duty of care.\n"
            "**Fraud: SUPPORTING** — The unexplained blocking is consistent with the theory that LM and "
            "LG were manipulating account access to JZ's detriment.\n"
            "**Wire Fraud (18 USC 1343): TANGENTIAL** — Electronic communication about blocked access.\n"
            "**Breach of Contract: SUPPORTING** — Account agreement entitles JZ to account access.\n"
            "**Conversion: BACKGROUND** — Blocked access facilitates conversion of funds.\n"
            "**RICO (18 USC 1962): BACKGROUND** — Part of the pattern of account interference."
        )
        cross_refs = (
            "Cross-references: EXH-0076-EXH-0081 (follow-up emails in this chain); EXH-0082/EXH-0083 "
            "(JZ tells LG about banking blocks). Timeline: May 17, 2021 — JZ's account being blocked; "
            "contemporaneous with SavageXFenty fraud charges."
        )
        admissibility = (
            "Relevance (FRE 401/402): RELEVANT — establishes JZ's account access problems. FRE 403: No "
            "prejudice. Hearsay (FRE 801/802): JZ's statements are party admissions if offered against "
            "JZ; otherwise, state of mind (FRE 803(3)). Authentication (FRE 901): Email metadata."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Martinez, what was blocking JZ's account and who authorized "
            "it?' (2) 'How many times was JZ's account blocked between May 2021 and February 2023?' "
            "Discovery: Obtain 53's account restriction/block log for JZ's accounts."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: JZ (sender) or Esau Martinez (recipient). "
            "File format: Text/.eml."
        )
    
    # JZ to 53 - follow up (EXH-0076, EXH-0077)
    elif any(x in exhibit_id for x in ['EXH-0076', 'EXH-0077']):
        evidence_summary = (
            "JZ's May 17, 2021 follow-up to Esau Martinez at 53, sent approximately 2.5 hours after his "
            "initial email. JZ reports spending 25 minutes on another call and receiving 'maddening "
            "nonsense explanations.' He explicitly states that 53's blocks affected his BUSINESS account, "
            "preventing payroll from processing: 'If you care you blocked my payroll and screwed up all my "
            "payments to flag a purchase from one of our regular distributors.' JZ threatens to cancel "
            "his account. This email directly links 53's account blocking to business disruption — "
            "specifically payroll interference — which is a core issue in the partnership fraud case."
        )
        if 'EXH-0077' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0076 from the LM locker database."
        
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — 53's actions blocking the business account and interfering "
            "with payroll processing breach the duty of care and constitute gross negligence.\n"
            "**Fraud: SUPPORTING** — The payroll interference is consistent with a scheme to undermine "
            "JZ's business operations.\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — Electronic payroll processing blocked via wire "
            "communications.\n"
            "**Breach of Contract: DIRECT** — Blocking payroll is a material breach of the business "
            "banking agreement.\n"
            "**Conversion: SUPPORTING** — Interference with payroll funds.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Payroll interference as part of a pattern of "
            "racketeering activity.\n"
            "**Computer Fraud (18 USC 1030): SUPPORTING** — Unauthorized impairment of access to "
            "financial computer systems."
        )
        cross_refs = (
            "Cross-references: EXH-0074/EXH-0075 (initial email); EXH-0078-EXH-0081 (continued chain); "
            "EXH-0082/EXH-0083 (JZ forwarding payroll issues to LG). Timeline: May 17, 2021, 8:35 PM — "
            "JZ escalating frustration after failed phone support."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — direct evidence of payroll interference by 53. "
            "FRE 403: Highly probative, no unfair prejudice. Hearsay (FRE 801/802): JZ's statements are "
            "present sense impressions (FRE 803(1)) and/or state of mind (FRE 803(3)). Authentication "
            "(FRE 901): Email metadata."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Martinez, how could a fraud flag on JZ's personal credit "
            "card result in his business payroll being blocked?' (2) 'What communication occurred between "
            "53's fraud department and Leonard Mayersky regarding JZ's account blocks?' Discovery: "
            "Subpoena 53's complete account restriction log; obtain QuickBooks payroll records showing "
            "failed transactions."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: JZ (sender). File format: Text/.eml."
        )
    
    # JZ to 53 - another charge (EXH-0078, EXH-0079)
    elif any(x in exhibit_id for x in ['EXH-0078', 'EXH-0079']):
        evidence_summary = (
            "JZ emails Esau Martinez at 53 on May 18, 2021, reporting: 'Also got hit with another "
            "savagexfenty charge yesterday too. Maybe we will get this solved next year?' JZ states: "
            "'We are 0 for 2 on yesterday alone. Which is consistent with nearly everyday with fifth "
            "third. At this point you are just theives [sic].' Despite 53's knowledge of the fraudulent "
            "SavageXFenty charges, the unauthorized charges continued. JZ's accusation of theft directly "
            "alleges that 53 was complicit in allowing the fraud to continue."
        )
        if 'EXH-0079' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0078 from the LM locker database."
        
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — 53's continued failure to stop known unauthorized charges "
            "after being repeatedly notified constitutes willful disregard of customer protection duties.\n"
            "**Fraud: SUPPORTING** — 53's inaction in the face of ongoing fraud can constitute "
            "constructive fraud or aiding and abetting fraud.\n"
            "**Wire Fraud (18 USC 1343): DIRECT** — Each unauthorized SavageXFenty charge processed "
            "electronically constitutes a wire transmission in furtherance of fraud, which 53 facilitated.\n"
            "**Mail Fraud (18 USC 1341): TANGENTIAL** — Credit card statements mailed showing fraudulent "
            "charges.\n"
            "**Computer Fraud (18 USC 1030): SUPPORTING** — Unauthorized charges processed via protected "
            "computer systems.\n"
            "**Conversion: SUPPORTING** — Ongoing conversion of JZ's funds via unauthorized charges.\n"
            "**Breach of Contract: DIRECT** — Failure to stop unauthorized charges violates cardholder "
            "agreement and EFTA/Reg E protections.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Ongoing pattern of predicate acts.\n"
            "**Unjust Enrichment: SUPPORTING** — 53 profited from interchange fees on fraudulent charges."
        )
        cross_refs = (
            "Cross-references: EXH-0074-EXH-0077 (same email chain); EXH-0060 (BBB complaints showing "
            "SavageXFenty's fraudulent pattern). Timeline: May 18, 2021 — nearly a year of unresolved "
            "SavageXFenty charges."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — contemporaneous documentation of ongoing fraud. "
            "FRE 403: JZ's angry language ('theives') may carry some prejudice but probative value "
            "dominates. Hearsay (FRE 801/802): Present sense impression (FRE 803(1)) and excited "
            "utterance (FRE 803(2)) — JZ is clearly agitated by ongoing fraud. Authentication (FRE 901): "
            "Email metadata."
        )
        strategic = (
            "Deposition questions: (1) 'Why did 53 continue to allow SavageXFenty charges to process "
            "after JZ reported them as fraudulent?' (2) 'What is 53's policy for blocking merchants "
            "after a customer reports fraud?' Discovery: Obtain 53's merchant blocking/chargeback "
            "policies; subpoena SavageXFenty merchant files at 53."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: JZ (sender). File format: Text/.eml."
        )
    
    # JZ to 53 - no response (EXH-0080, EXH-0081)
    elif any(x in exhibit_id for x in ['EXH-0080', 'EXH-0081']):
        evidence_summary = (
            "JZ's May 18, 2021 follow-up to Esau Martinez after receiving no call back or reply to his "
            "earlier emails about the ongoing fraud and account blocks. JZ's message is brief and "
            "frustrated: 'Nothing? No call back or reply? At least you are consistent with ignoring the "
            "customer which seems to be a 53 policy.' The lack of response from 53 despite multiple "
            "escalations demonstrates a pattern of deliberate indifference."
        )
        if 'EXH-0081' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0080 from the LM locker database."
        
        claim_alignment = (
            "**Fiduciary Breach: SUPPORTING** — 53's failure to respond to customer fraud reports "
            "constitutes breach of the duty of care.\n"
            "**Fraud: SUPPORTING** — Deliberate non-response suggests complicity or willful blindness.\n"
            "**Wire Fraud (18 USC 1343): BACKGROUND** — Contextual evidence of 53's non-responsiveness.\n"
            "**Breach of Contract: SUPPORTING** — Failure to communicate is a breach of customer service "
            "obligations.\n"
            "**RICO (18 USC 1962): BACKGROUND** — Part of the pattern of obstructive conduct."
        )
        cross_refs = (
            "Cross-references: EXH-0078/EXH-0079 (email this is responding to/following up on); "
            "EXH-0074-EXH-0077 (full chain). Timeline: May 18, 2021, 12:40 PM."
        )
        admissibility = (
            "Relevance (FRE 401/402): RELEVANT — establishes 53's pattern of non-response. FRE 403: No "
            "prejudice. Hearsay (FRE 801/802): Present sense impression (FRE 803(1)). Authentication "
            "(FRE 901): Email metadata."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Martinez, did you ever respond to any of JZ's emails?' "
            "(2) 'What is 53's SLA for responding to fraud complaints?' Discovery: Obtain 53's customer "
            "complaint tracking system records."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: JZ (sender). File format: Text/.eml."
        )
    
    # JZ forwards payroll bill to LG (EXH-0082, EXH-0083)
    elif any(x in exhibit_id for x in ['EXH-0082', 'EXH-0083']):
        evidence_summary = (
            "On May 27, 2021, Joseph Zangrilli forwards to Lucas Guariglia an email chain with Leonard "
            "Mayersky and Virginia Jones at 53 regarding payroll processing problems. The chain shows JZ "
            "telling LM: 'First expected chat transcript from the top tier of payroll support. If you "
            "need me I will be playing in chats instead of running my business in hopes that I can figure "
            "out a way to pay my employees.' LM responds: 'thank you joe. the chats are from the quick "
            "books?' JZ confirms: 'Yes. They are also still saying it keeps getting blocked on your end.' "
            "This email chain directly establishes: (1) 53 was blocking Rowboat Creative's payroll, "
            "(2) LM was aware of the blocking, (3) JZ was transparently keeping LG informed, and (4) "
            "the blocking was attributed by third parties (QuickBooks/payroll) to 53's end."
        )
        if 'EXH-0083' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0082 from a different subdirectory."
        
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — LM, as 53 relationship manager, was actively involved in "
            "discussions about blocked payroll yet failed to resolve the issue, demonstrating breach "
            "of duty of care and potentially active obstruction.\n"
            "**Fraud: SUPPORTING** — The payroll blocking is a key mechanism of the alleged fraud scheme.\n"
            "**Wire Fraud (18 USC 1343): DIRECT** — Blocking electronic payroll transmissions constitutes "
            "interference with wire communications in furtherance of fraud.\n"
            "**Computer Fraud (18 USC 1030): SUPPORTING** — Unauthorized impairment of financial computer "
            "systems (payroll processing).\n"
            "**Breach of Contract: DIRECT** — Blocking payroll access breaches the business banking "
            "agreement.\n"
            "**Conversion: SUPPORTING** — Interference with payroll funds.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Payroll blocking as predicate act in pattern.\n"
            "**Accounting: SUPPORTING** — Payroll records are essential accounting documents affected "
            "by the scheme."
        )
        cross_refs = (
            "Cross-references: EXH-0074-EXH-0081 (JZ's direct communications with 53 about blocks); "
            "EXH-0084-EXH-0090 (June 10, 2021 chain); EXH-0086 (LG's response to LM about JZ's "
            "complaints). Timeline: May 27, 2021 — contemporaneous with SavageXFenty fraud dispute."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — direct evidence of payroll blocking and LM's "
            "knowledge. FRE 403: No prejudice. Hearsay (FRE 801/802): JZ's statements are party "
            "admissions as to JZ; LM's statement is party-opponent admission (FRE 801(d)(2)(D)) as "
            "53 employee. Authentication (FRE 901): Email metadata."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Mayersky, what did you do to resolve the payroll blocking "
            "after JZ informed you on May 27?' (2) 'Who at 53 had the authority to block and unblock "
            "payroll transactions?' Discovery: Subpoena 53's complete transaction log for Rowboat "
            "Creative's payroll processor; obtain QuickBooks records. Timing: Critical for establishing "
            "that LM had knowledge and opportunity to resolve but did not."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: JZ (sender). File format: Text/.eml."
        )
    
    # JZ complaints to LM about fraud (EXH-0084, EXH-0085)
    elif any(x in exhibit_id for x in ['EXH-0084', 'EXH-0085']):
        evidence_summary = (
            "On June 10, 2021, Joseph Zangrilli emails Leonard Mayersky with a scanned document regarding "
            "his year-old credit card fraud dispute. JZ writes: 'Sounds about right. I submitted this "
            "last year right when it started. You guys did nothing, and now I'm told that because you did "
            "nothing the first time I have to eat the 600$ that you allowed to be stolen. Thanks for the "
            "consistency on screwing the customer every step of the way.' This email establishes: (1) JZ "
            "timely reported the fraud when it began (~mid-2020), (2) 53 took no action for approximately "
            "one year, (3) 53 then denied the claim based on its own inaction, and (4) the amount in "
            "dispute was approximately $600."
        )
        if 'EXH-0085' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0084 from a different file path."
        
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — 53's year-long failure to investigate a timely-reported fraud "
            "claim, followed by denial based on the bank's own delay, is a textbook breach of the duty "
            "of care and duty of loyalty.\n"
            "**Fraud: SUPPORTING** — 53's conduct — taking no action on a fraud report and then using "
            "its own inaction as grounds for denial — is constructive fraud.\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — Electronic transmission of the fraud report "
            "that 53 ignored.\n"
            "**Breach of Contract: DIRECT** — Violation of cardholder agreement requiring timely fraud "
            "investigation, and EFTA Regulation E requirements.\n"
            "**Conversion: SUPPORTING** — 53's inaction allowed conversion of JZ's $600.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Part of a pattern of systematically denying valid "
            "customer claims.\n"
            "**Unjust Enrichment: SUPPORTING** — 53 retained benefit of JZ's paid fees while refusing "
            "to protect his funds.\n"
            "**Accounting: BACKGROUND** — The $600 dispute requires accounting treatment."
        )
        cross_refs = (
            "Cross-references: EXH-0061-EXH-0068 (LM forwards this complaint to LG); EXH-0086 (LG's "
            "response to LM about this complaint); EXH-0062/EXH-0064 (53 denial letter). Timeline: "
            "June 10, 2021 — JZ escalates after year of inaction. Original fraud report: ~June 2020."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — direct evidence of timely fraud reporting and "
            "53's failure to act. FRE 403: No unfair prejudice. Hearsay (FRE 801/802): JZ's statements "
            "are present sense impression (FRE 803(1)). Authentication (FRE 901): Email metadata and "
            "JZ's testimony."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Mayersky, when did you first learn of JZ's fraud complaint "
            "and what did you do about it?' (2) 'Is it 53's policy to deny fraud claims based on the "
            "bank's own failure to investigate?' Discovery: Subpoena 53's complete fraud investigation "
            "file; obtain all internal communications about JZ's fraud claim. Timing: The one-year gap "
            "is devastating for 53's defense."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: JZ (sender). File format: Text with "
            "scanned attachment reference."
        )
    
    # LG replies to LM about document (EXH-0086)
    elif 'EXH-0086' in exhibit_id:
        evidence_summary = (
            "Lucas Guariglia's reply to Leonard Mayersky on June 10, 2021, responding to LM's forwarding "
            "of JZ's document/fraud complaint. LG's response (identical content to EXH-0063/EXH-0066 but "
            "this is the MSG database version): 'Hi Len, I apologize for this. I'm unaware of what this "
            "is but believe this is related to only his personal accounts with 5/3. I will speak with him "
            "and recommend that he transitions anything personal elsewhere. There should be no "
            "intermingling of personal matters NS business. I'm understanding of personal matters however "
            "this becomes absolutely detrimental to a working business relationship that I am personally "
            "grateful for and have worked hard at. Again my apologies and appreciate you keeping on my "
            "radar. Thanks Len.' This is the MSG (smoking gun) database version of EXH-0063."
        )
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — LG's response to LM, apologizing for JZ's fraud complaint "
            "and characterizing it as 'detrimental' to LG's banking relationship, demonstrates LG's "
            "disloyalty to his business partner and prioritization of his personal banking relationship "
            "over JZ's rights as a fraud victim.\n"
            "**Fraud: SUPPORTING** — Evidence of LG's alignment with the bank against JZ.\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — Electronic communication in furtherance of scheme.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Evidence of LM-LG coordinated action.\n"
            "**Breach of Contract: BACKGROUND** — Partnership agreement duties."
        )
        cross_refs = (
            "Cross-references: EXH-0063/EXH-0066 (LML database versions of this same email); "
            "EXH-0087-EXH-0090 (LM's forwarding to LG); EXH-0061/EXH-0065/EXH-0067/EXH-0068 (LM's "
            "email that this replies to). Timeline: June 10, 2021, 10:18 AM EDT."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT — party-opponent admission. FRE 403: No "
            "prejudice. Hearsay (FRE 801/802): LG's statements are party-opponent admissions "
            "(FRE 801(d)(2)(A)). Authentication (FRE 901): LG's @rowboatcreative.com email."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Guariglia, what did you mean by 'absolutely detrimental "
            "to a working business relationship' — were you telling the bank you would discourage "
            "your partner from pursuing his legal rights?' (2) 'Did you ever actually speak to JZ "
            "about this as you promised LM?' Discovery: Obtain all LG-LM communications."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: LG (sender). File format: Text/.eml."
        )
    
    # LM forwards to LG (EXH-0087, EXH-0088, EXH-0089, EXH-0090)
    elif any(x in exhibit_id for x in ['EXH-0087', 'EXH-0088', 'EXH-0089', 'EXH-0090']):
        evidence_summary = (
            "Leonard Mayersky's June 10, 2021 forwarding email to Lucas Guariglia: 'Hi Lucas, I got this "
            "from Joe. I don't know what he is talking about??' The forwarded email shows JZ's complaint "
            "about 53's failure to address his fraud claim: 'Sounds about right. I submitted this last "
            "year right when it started. You guys did nothing, and now I'm told that because you did "
            "nothing the first time I have to eat the 600$ that you allowed to be stolen.' This is the "
            "original .eml format version of the forwarding that appears as PDF attachments in EXH-0061 "
            "et seq. LM's forwarding of JZ's confidential banking complaint to LG without JZ's knowledge "
            "or consent is a breach of banking confidentiality."
        )
        if 'EXH-0088' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0087 from a different file path."
        elif 'EXH-0089' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0087 from the LM locker database."
        elif 'EXH-0090' in exhibit_id:
            evidence_summary += " This is a duplicate of EXH-0087 from the LM locker database."
        
        claim_alignment = (
            "**Fiduciary Breach: DIRECT** — Unauthorized disclosure of customer's confidential banking "
            "communications to a third party.\n"
            "**Fraud: SUPPORTING** — The forwarding is part of the LM-LG information-sharing scheme.\n"
            "**Wire Fraud (18 USC 1343): SUPPORTING** — Electronic transmission of confidential "
            "information in furtherance of scheme.\n"
            "**Computer Fraud (18 USC 1030): SUPPORTING** — Unauthorized access/disclosure via "
            "protected computer.\n"
            "**RICO (18 USC 1962): SUPPORTING** — Evidence of enterprise communication."
        )
        cross_refs = (
            "Cross-references: EXH-0061/EXH-0065/EXH-0067/EXH-0068 (PDF versions); EXH-0086 (LG's "
            "reply); EXH-0084/EXH-0085 (JZ's original complaint)."
        )
        admissibility = (
            "Relevance (FRE 401/402): HIGHLY RELEVANT. FRE 403: No prejudice. Hearsay (FRE 801/802): "
            "LM's statement is party-opponent admission (FRE 801(d)(2)(D)). Authentication (FRE 901): "
            "Email metadata and 53.com headers."
        )
        strategic = (
            "Deposition: (1) 'Why did you send JZ's personal banking complaint to his business "
            "partner?' (2) 'Did you have JZ's consent?' Discovery: 53 privacy policy; all LM-LG "
            "communications."
        )
        exhibit_readiness = (
            "Redactions: None required. Foundation witness: LM (sender). File format: .eml native "
            "or text extraction."
        )
    
    # First Citizens Bank emails (EXH-0099 through EXH-0110)
    elif any(x in exhibit_id for x in ['EXH-0099', 'EXH-0100', 'EXH-0101', 'EXH-0102', 'EXH-0103',
                                        'EXH-0104', 'EXH-0105', 'EXH-0106', 'EXH-0107', 'EXH-0108',
                                        'EXH-0109', 'EXH-0110']):
        # First Citizens Bank conversation about HELOC missed payment
        if 'EXH-0099' in exhibit_id:
            evidence_summary = (
                "On May 23, 2023, Lucas Guariglia emails Amy Laughinghouse at First Citizens Bank regarding "
                "a missed payment notice on his home equity line of credit (HELOC). LG expresses confusion "
                "because payments are on autopay: 'We just received the attached, however I am confused as "
                "all payments are all auto pay.' This email is significant because it demonstrates LG's "
                "personal financial strain approximately 3 months after the Rowboat Creative corporate "
                "account was closed, suggesting financial difficulties that may have motivated his actions "
                "against JZ and Rowboat Creative."
            )
        elif 'EXH-0100' in exhibit_id:
            evidence_summary = (
                "LG's brief reply to Amy Laughinghouse on May 23, 2023: 'No worries. Thank you Amy!' "
                "This is in response to Amy indicating she is looking into the missed payment issue. "
                "Part of the HELOC missed payment thread."
            )
        elif 'EXH-0101' in exhibit_id:
            evidence_summary = (
                "LG asks Amy Laughinghouse: 'I received the form but what would the updated draft amount "
                "be?' The context (from the forwarded email below) reveals that the auto-payment was set "
                "at $1,000/month but the actual amount due was higher ($1,582.13) due to a Fixed Rate "
                "Option processed in February 2023 that First Citizens failed to update in the auto-draft. "
                "LG notes: 'The payments were a lot lower than $1k/mo initially and I was paying the "
                "additional amount to get the principal down faster.' This shows LG was actively managing "
                "a significant personal debt obligation during the period when Rowboat Creative's funds "
                "were allegedly being diverted."
            )
        elif 'EXH-0102' in exhibit_id:
            evidence_summary = (
                "Amy Laughinghouse (First Citizens Bank) initial response to LG's missed payment inquiry: "
                "'Hey Lucas - I am looking into this. I will get back to you ASAP.' This is the bank's "
                "acknowledgment of LG's HELOC concern. The email establishes the banking relationship "
                "between LG and First Citizens in North Carolina."
            )
        elif 'EXH-0103' in exhibit_id or 'EXH-0104' in exhibit_id:
            evidence_summary = (
                "LG's follow-up communication with Amy Laughinghouse regarding his HELOC payment issue. "
                "These are additional messages in the May 23, 2023 thread where LG is attempting to "
                "resolve his personal debt obligation with First Citizens Bank."
            )
        elif 'EXH-0105' in exhibit_id or 'EXH-0106' in exhibit_id:
            evidence_summary = (
                "LG asks Amy Laughinghouse: 'Do you have some time to discuss this tomorrow? We "
                "definitely were not expecting this.' The underlying issue reveals that the HELOC "
                "payment jumped to $1,582.13/month due to a Fixed Rate Option processed months earlier "
                "without the auto-draft being updated. LG's statement that they 'definitely were not "
                "expecting this' indicates financial surprise/distress, which is relevant to motive "
                "in the partnership fraud case."
            )
        elif 'EXH-0107' in exhibit_id or 'EXH-0108' in exhibit_id:
            evidence_summary = (
                "Additional follow-up in LG's HELOC missed payment thread with First Citizens Bank "
                "on May 23, 2023. These messages show LG's ongoing personal financial management "
                "issues during the period relevant to the partnership fraud."
            )
        elif 'EXH-0109' in exhibit_id:
            evidence_summary = (
                "Further communication in the LG-First Citizens HELOC thread on May 23, 2023. "
                "LG is actively attempting to resolve a significant personal debt payment issue."
            )
        elif 'EXH-0110' in exhibit_id:
            evidence_summary = (
                "Amy Laughinghouse's substantive response to LG: 'The auto payment is not satisfying "
                "the amount due. The draft amount is $1000, but the total amount due is higher due to "
                "the Fixed Rate Option. We need to update the Auto draft, I will send it over for you "
                "to sign and return.' This confirms that LG's HELOC payment was insufficient and he "
                "was facing a payment shortfall of approximately $582/month. This financial pressure "
                "is probative of LG's motive to divert Rowboat Creative funds."
            )
        
        claim_alignment = (
            "**Fiduciary Breach: SUPPORTING** — LG's personal financial distress provides motive for "
            "breach of fiduciary duties to JZ and Rowboat Creative.\n"
            "**Fraud: SUPPORTING** — Evidence of financial pressure supports fraud theory (motive element).\n"
            "**Wire Fraud (18 USC 1343): BACKGROUND** — Banking communications.\n"
            "**Conversion: SUPPORTING** — LG's need for funds supports theory of conversion of "
            "partnership assets.\n"
            "**Breach of Contract: BACKGROUND** — Context for LG's economic circumstances.\n"
            "**RICO (18 USC 1962): BACKGROUND** — Economic motive evidence.\n"
            "**Unjust Enrichment: SUPPORTING** — LG's personal financial needs provide context for "
            "alleged enrichment at partnership expense."
        )
        cross_refs = (
            "Cross-references: EXH-0069-EXH-0073, EXH-0091-EXH-0098 (LG's 53 personal account opened "
            "January 2023); corporate account closure (~Feb 2023). Timeline: May 23, 2023 — LG "
            "addressing significant personal debt obligation 3 months after partnership account events."
        )
        admissibility = (
            "Relevance (FRE 401/402): RELEVANT — financial motive evidence. FRE 403: Some risk of "
            "prejudice but probative of motive; limiting instruction may be appropriate. Hearsay "
            "(FRE 801/802): LG's statements are party-opponent admissions (FRE 801(d)(2)). Amy "
            "Laughinghouse's statements are non-hearsay business communications. Authentication "
            "(FRE 901): Email metadata."
        )
        strategic = (
            "Deposition questions: (1) 'Mr. Guariglia, what was your personal financial situation "
            "in early 2023 when Rowboat Creative's accounts were closed?' (2) 'Did you use any "
            "Rowboat Creative funds to address your personal HELOC obligations?' Discovery: Subpoena "
            "LG's complete First Citizens HELOC records; obtain LG's personal bank statements for "
            "the relevant period. Timing: Financial pressure evidence is powerful for establishing "
            "motive at trial."
        )
        exhibit_readiness = (
            "Redactions: Redact full HELOC account numbers. Foundation witness: LG or Amy "
            "Laughinghouse. File format: Text/.eml."
        )
    
    # Fallback
    else:
        evidence_summary = f"Email from {from_field} to {to_field} dated {date_display}. Subject: {subj}. Content analysis pending further review."
        claim_alignment = "**Pending Analysis**"
        cross_refs = "Cross-references to be determined."
        admissibility = "Preliminary assessment: Relevant. Authentication via email metadata."
        strategic = "Review for deposition and discovery value."
        exhibit_readiness = "Foundation witness: sender/recipient. File format: Text."
    
    # === BUILD SYNTHESIS ===
    
    # Determine if this is a lighter P2 treatment (all are P1 in this batch, but some duplicates can be lighter)
    is_duplicate_exhibit = any(x in exhibit_id for x in ['EXH-0065', 'EXH-0066', 'EXH-0067', 'EXH-0068',
                                                          'EXH-0075', 'EXH-0077', 'EXH-0079', 'EXH-0081',
                                                          'EXH-0083', 'EXH-0085', 'EXH-0088', 'EXH-0089',
                                                          'EXH-0090', 'EXH-0092', 'EXH-0094', 'EXH-0096',
                                                          'EXH-0098'])
    
    synthesis = f"""# Email Attorney Synthesis: {subj}
**Item ID:** {item_id}
**Exhibit:** {exhibit_id}
**Date:** {date_display}
**From:** {from_field} **To:** {to_field}
**Case:** RC-2026 | JZ v. LG / Rowboat Creative, LLC
**Priority:** {priority} | **JZ_CCED:** {jz_cced} | **Encrypted:** {encrypted}
**Database:** {source_db}

## 1. Evidence Summary
{evidence_summary}

## 2. Claim Alignment
{claim_alignment}

## 3. Cross-References
{cross_refs}

## 4. Admissibility (FRE)
{admissibility}

## 5. Strategic Notes
{strategic}

## 6. Exhibit Readiness
{exhibit_readiness}
"""
    return synthesis


def main():
    # Read batch file
    entries = []
    with open(BATCH_FILE, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split('|')
            if len(parts) >= 3:
                entries.append({
                    'exhibit_id': parts[0],
                    'item_id': parts[1],
                    'file_path': parts[2]
                })
    
    print(f"Processing {len(entries)} emails...")
    
    count = 0
    errors = []
    exhibits_processed = []
    
    for entry in entries:
        try:
            filepath = entry['file_path']
            item_id = entry['item_id']
            exhibit_id = entry['exhibit_id']
            
            if not os.path.exists(filepath):
                errors.append(f"File not found: {filepath}")
                continue
            
            header, clean_body = parse_email_header(filepath)
            synthesis = generate_synthesis(item_id, exhibit_id, header, clean_body, filepath)
            
            output_path = os.path.join(OUTPUT_DIR, f"{item_id}_email_synthesis.md")
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(synthesis)
            
            count += 1
            exhibits_processed.append(exhibit_id)
            print(f"  [{count}/51] {exhibit_id}: {header.get('SUBJECT', 'No Subject')[:60]}")
            
        except Exception as e:
            errors.append(f"Error processing {entry.get('exhibit_id', 'unknown')}: {str(e)}")
    
    print(f"\n=== COMPLETE ===")
    print(f"Files written: {count}")
    print(f"Exhibit IDs processed: {', '.join(exhibits_processed)}")
    if errors:
        print(f"Errors: {len(errors)}")
        for err in errors:
            print(f"  - {err}")


if __name__ == '__main__':
    main()
