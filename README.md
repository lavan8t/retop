# retop

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/assets/white-retop.svg">
  <img src="./public/assets/black-retop.svg" align="right" alt="retop logo" width="140">
</picture>

[![CI](https://github.com/lavan8t/retop/actions/workflows/ci.yml/badge.svg)](https://github.com/lavan8t/retop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4.svg?logo=google-chrome&logoColor=white)](manifest.json)

**retop** is a high-performance browser extension for Chromium and Firefox that transforms VIT University's legacy VTOP portal into a responsive, brutalist Material 3-inspired interface. It runs on top of live student sessions by mounting an isolated Shadow DOM (`#retop-host`), intercepting server-rendered HTML pages, parsing them into typed structures, and delivering instant transitions with offline cache-first hydration.

---

## Highlights

- **Instant Login Takeover**: Cancels HTML streaming at `document_start` on VTOP login routes and paints its own sign-in card without ever downloading legacy Bootstrap markup.
- **Automated Login & Captcha**: Bypasses captchas via integrated bitmap pattern recognition or background reCAPTCHA handling.
- **Zero-Refresh Client Routing**: A fast client-side router operating inside Shadow DOM transitions instantly between modules (Timetables, Marks, Attendance, Digital Assignments).
- **Three-Tier Storage Model**: Hydrates views immediately from `chrome.storage.local`, `IndexedDB`, and `localStorage` with automatic TTL cache invalidation.
- **Academic Calendar & Schedule Sync**: Deeply integrates with the VTOP semester calendar, instructional days, and Saturday day-order overrides.
- **1-Click Google Calendar & iCal Export**: Syncs entire course timetables and exam schedules directly to Google Calendar or downloadable `.ics` files.
- **Universal Omnibox**: Press `/` from anywhere to launch fuzzy navigation to any menu, form, or document.
- **Native VTOP Dark Theme**: A component-level dark theme for classic VTOP pages (near-black layered surfaces, VTOP blue/gold accents) with no colour inversion, so images, charts and the native header keep their real appearance.
- **Zero-Damage Teardown**: An error-net monitors execution; if an uncaught error occurs, retop instantly removes all modifications and restores native VTOP cleanly.

---

## Key Modules

- **Dashboard**: Unified schedule calendar, attendance highlights, quick navigation, and upcoming assignments.
- **Timetable**: 3-way toggle between full grid, day list, and horizontal weekly swipe view.
- **Digital Assignments**: Direct file upload, submission status, and question paper downloads.
- **Attendance**: Circular SVG progress gauges with predictive attendance forecasting (classes needed to hit 75% / 80%).
- **Student Profile**: 3D-flipping digital student ID card and structured academic bento grid.
- **Marks & Curriculum**: Collapsible course assessments with weightage breakdowns and curriculum syllabus downloads.

---

## Quickstart for Contributors

### Prerequisites
- [Bun](https://bun.sh) (`v1.1+` required)
- Google Chrome, Brave, Edge, or Mozilla Firefox

### Setup & Development

```bash
# 1. Clone the repository
git clone https://github.com/lavan8t/retop.git
cd retop

# 2. Install dependencies
bun install

# 3. Run the development build
bun run build

# 4. Run test suite
bun test
```

### Loading the Extension into Browser

- **Google Chrome / Brave / Edge:**
  1. Open `chrome://extensions/`
  2. Enable **Developer mode** (top-right toggle).
  3. Click **Load unpacked** and select the [`dist/`](dist/) folder.
- **Mozilla Firefox:**
  1. Open `about:debugging#/runtime/this-firefox`
  2. Click **Load Temporary Add-on...**
  3. Select [`manifest.firefox.json`](manifest.firefox.json) in the project root.

---

## Development Scripts

| Command | Description |
| :--- | :--- |
| `bun test` | Runs the test suite across parser, calendar, and storage suites |
| `bun run lt` | Runs TypeScript compilation check without emitting files (`tsc --noEmit`) |
| `bun run build` | Builds the development extension bundle into `dist/` |
| `bun run build:prod` | Compiles an optimized, minified production build |
| `bun run audit` | Runs dependency vulnerability security audit |
| `bun run format:check` | Verifies code formatting across source files |
| `bun run serve:idcard` | Starts the standalone Digital ID card preview dev server |

---

## Contributing & Community Wiki

We welcome bug reports, feature proposals, and code contributions from everyone.

Before contributing, please read our dedicated guides in the [Community Wiki](docs/wiki/README.md):
- [**Issue Reporting & Triage Guide**](docs/wiki/issues-guide.md): Learn about our issue lifecycle, labels (`ready-for-agent`, `good first issue`), and zero-PII reporting rules.
- [**Pull Request & Review Guide**](docs/wiki/pr-guide.md): Conventional Commits standards, pre-submission checklists, and CI workflow details.
- [**Architecture & Invariants Guide**](docs/wiki/architecture.md): Deep dive into the bootstrapper lifecycle, Shadow DOM boundaries, and parser schema versioning.

### Good First Issues
Looking for a place to start? Browse our open [Good First Issues](https://github.com/lavan8t/retop/labels/good%20first%20issue) on GitHub!

---

## Privacy & Security

retop runs entirely in the student's browser. It has no external tracking servers and never collects credentials, passwords, or personal academic records. For security vulnerability disclosures, please review [`SECURITY.md`](SECURITY.md).

---

## License

Distributed under the [MIT License](LICENSE).
