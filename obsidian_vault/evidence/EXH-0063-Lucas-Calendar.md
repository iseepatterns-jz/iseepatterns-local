---
type: evidence
exhibit: "EXH-0063"
title: "Lucas Guariglia Google Calendar — Cross-Reference with iMessage Timeline"
source: "mbox_metadata.db (Lucas@rowboatcreative.com Gmail)"
source_type: email-calendar
date: "2026-05-20"
evidence_type: "forensic-calendar-analysis"
topics:
  - ppp-eidl
  - partnership-proceedings
  - calendar-evidence
  - timeline
claims:
  - "C-006-PPP-Loan-Fraud"
  - "C-001-Breach-of-Fiduciary-Duty"
  - "C-004-Breach-of-Contract"
entities:
  - "Lucas Guariglia"
  - "Joseph Zangrilli"
  - "Rowboat Creative LLC"
  - "Suzanne Guariglia"
---

# EXH-0063: Lucas Guariglia Calendar Cross-Reference

## Overview

**786 calendar events** parsed from Lucas Guariglia's Google Calendar emails (2016–2022).
Extracted from `mbox_metadata.db` — the full Gmail export of `lucas@rowboatcreative.com`.
Only Google Calendar plain-text format was parseable (ICS/VCALENDAR MIME parts not in FTS).

## Key Finding: The One Overlap

- **March 26, 2020**: "Economic Injury Disaster Loans: Overview for Small Businesses" (11:00 AM – 12:00 PM)
- **Attendees**: Joseph Zangrilli, Lucas Guariglia
- **Significance**: This is the **only** calendar event crossing an iMessage critical date. Same date PPP/EIDL discussions peaked in JZ-LG iMessages (4/8 topic crossover).
- **Day prior (Mar 25)**: "S&S Meeting" — JZ + LG together

## Critical Finding: The 2023 Void

**Zero calendar events** on any 2023 iMessage critical date:

| Date | iMessage Activity | Lucas Calendar |
|------|-------------------|----------------|
| 2023-03-01 | 2/8 topics | No events |
| 2023-05-26 | 6/8 topics | No events |
| 2023-06-14 | 6/8 topics | No events |
| 2023-06-27 | 7/8 topics, major conflict | No events |
| 2023-07-11 | 6/8 topics, 776 messages | No events |
| 2023-12-08 | 7/8 topics | No events |

The monthly "ACCOUNTING REVIEW MEETING" (recurring, second Tuesday) was absent on all six dates. The partnership implosion played out entirely in iMessage — no structured business meetings were scheduled to address it.

## Joint Meeting Statistics

- **594 JZ-LG joint meetings** (2017–2022) — contradicting any claim that JZ was uninvolved
- **Top joint attendees**: Patrick Houdek (62), Jay Goebel (68), Jorge Gonzalez (53), Suzanne Ronayne (52), Rae Crist (28), Kevin Rotter (19)
- **52 events with Suzanne Ronayne** — confirming her RBC operational role

## By Year

| Year | Events |
|------|--------|
| 2016 | 1 |
| 2017 | 7 |
| 2018 | 85 |
| 2019 | 325 |
| 2020 | 172 |
| 2021 | 138 |
| 2022 | 58 |

Calendar data effectively ends mid-2022. Last dated event: July 30, 2022.

## Source Files

- `_analysis_outputs/lucas_calendar_vs_imessage_timeline.md`
- `_analysis_outputs/lucas_calendar_events.json` (786 parsed events)
