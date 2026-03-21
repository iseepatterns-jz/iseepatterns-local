# Coding Standards

Universal coding standards for lawmodel1 (Next.js frontend + Python FastAPI backend).

## Immutability

ALWAYS create new objects, NEVER mutate existing ones. This is especially critical for:
- Evidence data structures — never modify in place
- Financial transaction records — always create new records for corrections
- Database query results — treat as read-only

## File Organization

- Many small files over few large files
- 200-400 lines typical, 800 max
- Organize by feature/domain (financials, evidence-hub, conversations, coc)
- High cohesion, low coupling

## Error Handling

- Handle errors explicitly at every level
- Provide user-friendly messages in UI code (React components)
- Log detailed error context server-side (API routes, Python scripts)
- Never silently swallow errors — always log or re-throw
- Include context in error messages (which file, which record, which operation)

## Input Validation

- Validate all user input at API boundaries (route handlers)
- Use Zod schemas for TypeScript API route validation
- Use Pydantic models for Python FastAPI validation
- Fail fast with clear error messages
- Never trust external data without validation

## Code Quality Checklist

Before marking work complete:
- [ ] Functions are focused and small (<50 lines)
- [ ] Files are under 800 lines
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling at every level
- [ ] No hardcoded values (use constants or env vars)
- [ ] No mutation of existing objects
- [ ] TypeScript: no `any` types in application code
- [ ] Python: type annotations on all function signatures
