# Python Style Guide

Applies to all `.py` files (FastAPI backend, forensic scripts, data processing).

## Standards

- Follow PEP 8 conventions
- Use type annotations on ALL function signatures
- Use docstrings for public functions (especially forensic/evidence scripts)

## Immutability

Prefer immutable data structures for evidence and financial data:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Transaction:
    date: str
    amount: float
    description: str
    source_file: str

from typing import NamedTuple

class EvidenceRecord(NamedTuple):
    message_id: str
    sender: str
    timestamp: str
    content: str
```

## Database Access

- Always use parameterized queries with `?` placeholders
- Wrap multi-step DB operations in transactions
- Close connections/cursors in `finally` blocks or use context managers
- Check schema before querying — never assume column names

```python
# WRONG
cursor.execute(f"SELECT * FROM messages WHERE sender = '{name}'")

# CORRECT
cursor.execute("SELECT * FROM messages WHERE sender = ?", (name,))
```

## Script Organization

- Forensic/analysis scripts: `/tmp/` for one-offs, `scripts/` for reusable
- Keep scripts focused — one script, one purpose
- Include `if __name__ == "__main__":` guard
- Log output to stdout, never modify evidence files in place

## Formatting

- `black` for code formatting
- `isort` for import sorting
- `ruff` for linting
