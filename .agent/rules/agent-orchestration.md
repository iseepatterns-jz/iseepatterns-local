# Agent Orchestration

Rules for using specialized agents in lawmodel1 development.

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design and scalability | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality and maintainability | After writing/modifying code |
| security-reviewer | Vulnerability detection | Before commits, sensitive code |
| build-error-resolver | Fix build/type errors | When build fails |
| doc-updater | Documentation and codemaps | Updating docs |

## When to Use Agents (Proactively, No User Prompt Needed)

1. Complex feature requests → **planner** agent
2. Code just written/modified → **code-reviewer** agent
3. Bug fix or new feature → **tdd-guide** agent
4. Architectural decision → **architect** agent
5. Security-sensitive code → **security-reviewer** agent

## Parallel Execution

ALWAYS use parallel execution for independent operations — launch multiple agents simultaneously when tasks don't depend on each other.

## Core Principles

1. **Plan Before Execute** — plan complex features before writing code
2. **Test-Driven** — write tests before implementation, 80%+ coverage target
3. **Security-First** — validate all inputs, never compromise on security
4. **Immutability** — always create new objects, never mutate existing ones
5. **Research Before Building** — check existing implementations and docs first

## Testing Requirements

Minimum coverage target: 80%

TDD workflow (mandatory for new features):
1. Write test first (RED) — test should FAIL
2. Write minimal implementation (GREEN) — test should PASS
3. Refactor (IMPROVE) — verify coverage

## Success Metrics

- All tests pass with 80%+ coverage
- No security vulnerabilities
- Code is readable and maintainable
- Performance is acceptable
- User requirements are met
