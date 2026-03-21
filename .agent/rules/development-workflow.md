# Development Workflow

The end-to-end development pipeline for lawmodel1 changes.

## 1. Research & Context (Mandatory First Step)

Before any implementation:
- Check KI summaries for existing knowledge on the topic
- Review prior conversation logs if this is follow-up work
- Verify current database schemas (`PRAGMA table_info`)
- Check existing API routes and UI components that may be affected

## 2. Plan Before Code

For anything beyond a single-file fix:
- Break work into phases with clear dependencies
- Identify which databases/tables are affected
- Consider chain of custody implications for evidence changes
- Document the plan before writing code

## 3. Implement

- Follow coding-standards.md and language-specific style guides
- Write small, focused changes
- Test each change before moving to the next
- Use `/tmp/` for scratch scripts, never the project tree

## 4. Verify

- Run `npm run dev` and check the affected UI
- Test API endpoints with curl or scratch scripts
- Verify database integrity after schema changes
- Check that no evidence data was accidentally modified

## 5. Review & Commit

- Self-review: check for hardcoded values, `any` types, unhandled errors
- Follow git-workflow.md for commit format
- Never commit `data/` directory contents

## Agent Orchestration

Use agents when appropriate:
- Complex features → **planner** agent
- After writing/modifying code → **code-reviewer** agent
- Architectural decisions → **architect** agent
- Build failures → **build-error-resolver** agent
