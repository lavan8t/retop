# retop Community Wiki

Welcome to the **retop** developer wiki. This repository contains the complete open-source documentation for developing, contributing, reviewing, and maintaining the retop browser extension.

## Wiki Index

- [**Issue Management & Triage Guide**](issues-guide.md)
  - Bug report workflows, feature requests, and label taxonomy
  - Triage role definitions (`needs-triage`, `ready-for-agent`, `ready-for-human`)
  - Privacy and zero-PII reporting rules
- [**Pull Request & Code Review Guide**](pr-guide.md)
  - Branching conventions and Conventional Commits format
  - Local verification gates (`bun test`, `bun run lt`, `bun run build:prod`)
  - Two-axis review standards (Specification & Code Standards)
- [**Architecture & Invariants Guide**](architecture.md)
  - Manifest V3 extension lifecycle and early bootstrapper
  - Shadow DOM encapsulation (`#retop-host`)
  - HTML parser contracts and versioning schemas
  - Native VTOP teardown safety guarantees

---

## Getting Started Fast

```bash
# Clone the repository
git clone https://github.com/lavan8t/retop.git
cd retop

# Install dependencies using Bun
bun install

# Verify your environment
bun test
bun run lt
bun run build:prod
```

For detailed contribution instructions, read [`CONTRIBUTING.md`](../../CONTRIBUTING.md).
