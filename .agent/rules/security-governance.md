# Security Governance

Security rules tailored for a legal/forensic accounting application handling sensitive evidence.

## Mandatory Pre-Commit Checks

- [ ] No hardcoded secrets (API keys, DB paths with credentials, Ollama tokens)
- [ ] All user inputs validated (especially financial amounts, dates, account identifiers)
- [ ] SQL injection prevention — use parameterized queries, NEVER string interpolation for SQL
- [ ] Error messages must NOT leak case-sensitive information (names, amounts, evidence details)
- [ ] No evidence data in git commits (`.gitignore` must cover all `data/` directories)

## SQL Safety (Critical)

lawmodel1 uses raw SQLite queries extensively. Rules:
- **Always use parameterized queries** (`?` placeholders) for any user-provided values
- **Never interpolate** variables into SQL strings
- **Validate column names** against schema before using in ORDER BY or WHERE clauses
- **Use transactions** for any multi-step database modifications

## Evidence Data Protection

- Never expose raw evidence data through API endpoints without authentication
- All evidence API routes must validate request origin
- Financial data routes must sanitize output (no leaking internal IDs or system paths)
- Chat/message data must be filtered by whitelist before display

## Secret Management

- Store API keys and sensitive config in `.env` (already in `.gitignore`)
- Validate required environment variables at app startup
- Never log sensitive values — use `[REDACTED]` in error messages
- Rotate any accidentally committed secrets immediately
