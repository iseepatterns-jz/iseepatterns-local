# Git Workflow

## Commit Message Format

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

Examples:
- `feat: add automatch collision detection`
- `fix: restore Rosetta master description display`
- `refactor: extract financial matching into separate module`
- `docs: update evidence-hub API documentation`

## Branch Strategy

- `main` — stable, deployable code
- Feature branches for multi-step changes
- Name branches descriptively: `fix/automatch-collision`, `feat/chat-rebuild`

## Before Committing

1. Run the dev server and verify no regressions
2. Check that no evidence data files are staged (`git status`)
3. Verify `.gitignore` covers all `data/` directories
4. Write a meaningful commit message (not just "update" or "fix")

## Pull Request Workflow

1. Analyze full commit history with `git diff main...HEAD`
2. Write comprehensive PR summary
3. Include what was tested and how
4. Push with `-u` flag for new branches
