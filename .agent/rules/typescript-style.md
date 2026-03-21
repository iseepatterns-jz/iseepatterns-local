# TypeScript Style Guide

Applies to all `.ts`, `.tsx`, `.js`, `.jsx` files in the `app/` directory.

## Types and Interfaces

- Add parameter and return types to all exported functions
- Let TypeScript infer obvious local variable types
- Extract repeated inline shapes into named types/interfaces

```typescript
// WRONG: Exported without types
export function formatTransaction(tx) {
  return `${tx.date}: $${tx.amount}`
}

// CORRECT: Explicit types on exports
interface Transaction {
  date: string
  amount: number
  description: string
}

export function formatTransaction(tx: Transaction): string {
  return `${tx.date}: $${tx.amount}`
}
```

## Interface vs Type

- Use `interface` for object shapes that may be extended
- Use `type` for unions, intersections, and utility types
- Prefer string literal unions over `enum`

## Avoid `any`

- Use `unknown` for external/untrusted input, then narrow safely
- Use generics when type depends on caller
- If `any` is truly needed, add `// eslint-disable-next-line` with justification

## React Components

- Define props with named `interface` or `type`
- Type callback props explicitly
- Do not use `React.FC`

## API Route Patterns

- Use Zod for request body validation
- Return consistent response shapes: `{ success, data, error }`
- Type API responses explicitly

## No console.log in Production

- Use proper error boundaries and server-side logging
- `console.log` is acceptable only in temporary debug scripts in `/tmp/`
