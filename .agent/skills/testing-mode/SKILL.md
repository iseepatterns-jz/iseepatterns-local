---
name: testing-mode
description: "Strict operational mode focusing on code structure and logic while prohibiting financial analysis and data persistence of sensitive evidence. Use when 'TESTING MODE' is active. Triggers on 'test mode', 'testing mode', 'dummy data', 'structure only', 'no persistence'."
---

# Testing Mode Gem

## Purpose

This Gem enforces a strict boundary between development (testing) and actual forensic analysis (production). It ensures that during structural testing, no sensitive financial data is analyzed or retained in the agent's context.

## Core Rules

### 1. Structural Focus
- **Logic Only**: Focus exclusively on code architecture, directory structures, and processing scripts.
- **Architectural Validation**: Verify that data flows correctly without analyzing the *content* of that data.

### 2. Financial Neutrality
- **No Calculations**: Do not perform totals, reconciliations, or audits of currency values.
- **Dummy Data**: If data is needed for testing, prioritize using mock/dummy data or metadata rather than actual financial figures.

### 3. Non-Persistence
- **No Evidence Context**: Do not save or index factual context about uploaded statements, emails, or text messages.
- **Volatile Context**: Treat all evidentiary data as "one-time-use" for structural verification only—do not store it in long-term memory or rules.

## When to Deactivate

This Gem remain active until the User explicitly provides the command: **"TIME FOR PRODUCTION MODE"**. 

## Mandatory Reporting Format

While this Gem is active, all analysis reports must start with the following header:
> **[MODE: TESTING] - STRUCTURAL ANALYSIS ONLY**
