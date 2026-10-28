# Pull Request & Code Review Guide

Guidelines for creating, verifying, and reviewing Pull Requests in **retop**.

---

## 1. Branching & Commit Conventions

### Branch Naming
- Features: `feat/short-description` (e.g. `feat/gcal-recurring-events`)
- Bug fixes: `fix/short-description` (e.g. `fix/da-upload-error-check`)
- Documentation: `docs/short-description`
- Refactoring: `refactor/short-description`

### Conventional Commits
All commits should follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat(scope): add new capability`
- `fix(scope): resolve bug or visual regression`
- `refactor(scope): restructure code without changing behavior`
- `test(scope): add or improve unit tests`
- `docs(scope): update README, wikis, or comments`
- `chore: bump dependencies or maintenance scripts`

---

## 2. Pre-Submission Verification Gate

Before opening or updating a PR, run the full verification gate locally:

```bash
# 1. Type check
bun run lt

# 2. Unit tests (all 50+ tests must pass)
bun test

# 3. Production build
bun run build:prod

# 4. Dependency security audit
bun run audit
```

If any check fails, resolve the issue before opening the PR.

---

## 3. Pull Request Requirements

Every Pull Request must satisfy these acceptance standards:

1. **Focused Scope:** Keep PRs centered on a single vertical slice or fix. Avoid bundling unrelated formatting or refactoring changes.
2. **Regression Proof:** Include automated unit tests under `src/**/__tests__/` whenever modifying parsers, storage logic, or session helpers.
3. **Shadow DOM Isolation:** Retop renders exclusively inside `#retop-host`. Never inject global styles directly into the host document without prior architectural discussion.
4. **Teardown Invariant:** Ensure changes do not prevent `dismantleRetopMods()` from restoring native VTOP if an error occurs.
5. **No Secrets / PII:** Ensure zero registration numbers, real emails, or private student information are included in test fixtures or code.

---

## 4. Continuous Integration (CI)

Our GitHub Actions workflow automatically runs on all PRs targeting `main`:
- **Concurrency:** Pushing updates to your branch automatically cancels obsolete in-flight runs to save resources.
- **Jobs:** Executes `typecheck`, `test`, `build:prod`, `firefox` XPI bundle verification, and `audit`.
- All checks must pass green before a PR can be merged.
