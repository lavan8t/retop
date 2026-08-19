---
trigger: always_on
description: Universal engineering rules, safety constraints, and coding standards for all projects.
---

# Global Agent Rules and Engineering Standards

Universal guidelines, constraints, and architecture standards for AI agents working across codebases.

---

## Absolute Rules

1. **User controls git.** Never run `git commit`, `git push`, `git rebase`, or create branches unless the user explicitly tells you to.
2. **Surgical edits over rewrites.** Touch only the lines that need to change. Do not regenerate whole files when updating a single function or block.
3. **No destructive actions.** Never delete user files, drop database tables, or discard uncommitted changes without explicit confirmation.
4. **Fix root causes, not symptoms.** Trace callers and error sources before editing. Fix issues where the data originates rather than adding defensive patches across consumers.

---

## Architecture and Implementation Standards

5. **Platform and standard library first.** Use native language features, runtime built-ins, and standard libraries before adding external packages. Check existing dependencies before adding new ones.
6. **Search before creating.** Check existing helpers, utilities, stores, hooks, and types before writing new code. Duplicate utility functions create maintenance debt.
7. **Delete dead code immediately.** Remove unused functions, dead variables, and abandoned imports. Do not leave commented-out code blocks in files.
8. **Strict data isolation.** Scope local cache entries and state objects by tenant, account, or user key. Never store shared state in un-scoped global keys that risk cross-account pollution.
9. **Cache-first data loading.** When local cache exists, hydrate the interface immediately. Do not show blank screens or block rendering while waiting on network responses.
10. **Type safety everywhere.** Use strict typing for all API contracts, database models, state stores, and function interfaces. Avoid `any` types.
11. **Defensive parsing at boundaries.** Validate and sanitize external data at input boundaries using schemas or explicit guards before consuming it in application logic.
12. **Resilient error handling.** Wrap asynchronous operations and critical UI boundaries with meaningful error fallbacks and recovery actions. Never catch errors silently with empty catch blocks.

---

## Common Traps to Prevent

1. **Keyboard shortcut conflicts.** Always verify that focus is not inside an `input`, `textarea`, `select`, or `contentEditable` element before intercepting global keyboard events.
2. **Data format collisions.** Check explicit file headers, magic bytes, or signatures before testing generic string prefixes when decoding raw data streams or URLs.
3. **Silent cache drift.** Tag cached data and serialized store states with schema version numbers so stale payloads invalidate automatically when formats change.

---

## Verification Checklist

Before reporting any task complete:
- Run the project build or verification script (if the build command like `bun run build` already runs `tsc --noEmit`, run only the composite build command).
- Run the test suite or execute relevant unit tests.
- Run project linters or formatters if configured.
- Confirm changes with direct terminal or test output before asserting success.

---

## Directives and Shortcuts

- **`/remember <rule>`** or **`remember: <rule>`** or **`/learn <rule>`**: Shortcut to record new constraints or architectural learnings into the rules file.
