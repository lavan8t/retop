# Issue Lifecycle & Triage Guide

This guide explains how issues are tracked, triaged, and resolved in **retop**.

---

## 1. Issue Types & Templates

When creating an issue, select the matching GitHub issue template:

- **Bug Report (`[BUG]`):** For broken portal parsing, styling regressions, session timeouts, or unexpected crashes.
- **Feature Request (`[FEAT]`):** For proposals expanding dashboard widgets, new university endpoint parsers, or theme options.
- **Refactoring Task (`[REFACTOR]`):** For architectural deepening, code simplification, or technical debt removal.
- **Documentation (`[DOCS]`):** For updating developer guides, wikis, or code comments.

---

## 2. Privacy & Zero-PII Policy

> [!IMPORTANT]
> **NEVER** post passwords, session cookies, registration numbers, student photographs, or personal grade transcripts on public issues or discussions.

- When attaching console errors or screenshots, **redact** all registration numbers (e.g. replace `22BCE1234` with `22XXX0000`).
- Mock HTML fragments should use placeholder data (e.g., student name `Alex Doe`).
- For sensitive security disclosures, follow [`SECURITY.md`](../../SECURITY.md) to report vulnerabilities privately.

---

## 3. Label Taxonomy

retop uses a canonical 5-role triage vocabulary:

| Label | Meaning | Action Needed |
| :--- | :--- | :--- |
| `needs-triage` | Newly filed issue awaiting maintainer review | Maintainer evaluates validity and duplicates |
| `needs-info` | Incomplete report or reproduction steps | Waiting on the author for logs / reproduction |
| `ready-for-agent` | Fully specified, tracer-bullet slice | Ready for automated coding agents to implement |
| `ready-for-human` | Requires human judgement, credentials, or UI feedback | Assigned to maintainers/human developers |
| `good first issue` | Well-scoped task with clean seams | Ideal entry point for new open-source contributors |
| `wontfix` | Out of project scope or non-reproducible | Issue is closed with rationale |

---

## 4. Good First Issues

If you are new to the codebase, filter open issues by the [`good first issue`](https://github.com/lavan8t/retop/labels/good%20first%20issue) label. These issues typically involve:
- Adding parser edge-case tests under `src/parsers/__tests__/`
- Refining Material Design 3 color tokens
- Improving offline PWA fallback states
