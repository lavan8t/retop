# retop

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/assets/white-retop.svg">
  <img src="./public/assets/black-retop.svg" align="right" alt="retop logo" width="140">
</picture>

retop is a modern Chrome extension that completely transforms the legacy VIT University VTOP portal into a lightning-fast, brutalist Material 3-inspired dashboard. It runs seamlessly on top of the existing infrastructure by rendering entirely inside an isolated shadow DOM, meaning it intercepts and formats raw portal data without disrupting the core functionalities.

- **Instant Login Takeover**: On VTOP login routes the extension cancels the page load at `document_start` and paints its own sign-in card. VTOP's Bootstrap login page never downloads.
- **Automated Login & reCAPTCHA**: Instantly bypasses standard login captchas via bitmap matching or invisible reCAPTCHA v3 integration.
- **Zero-Refresh Navigation**: A fully state-based React router operates over the legacy pages, ensuring instant transitions across modules like Timetables, Marks, and Curriculum.
- **Aggressive Caching**: Your timetable, attendance, and calendar data are cached locally with a 24-hour TTL, allowing immediate dashboard rendering even on poor networks.
- **Intelligent Academic Calendar**: Deeply integrates with the VTOP calendar to visually track semester progress, identify instructional days, and accurately map Saturday day-order overrides.
- **iCal Timetable Export**: Export your entire semester timetable to Google Calendar or Apple Calendar in a single click, complete with holiday exclusions and day-order remappings.
- **Universal Omnibox**: Start typing anywhere or press `/` to pull up the omnibox and instantly jump to any module or category.
- **Dynamic Theming**: Supports Light, Dark, and AMOLED modes with 11 dynamic accent color presets. The theme engine runs on automated daylight detection and utilizes `color-mix()` for seamless UI styling.
- **Brutalist Aesthetics**: Built with Material Design 3 guidelines featuring heavy borders, vibrant micro-animations, and native View Transitions APIs for state changes.
- **One-Click Pause**: A minimal halt widget allows you to suspend the extension for an hour whenever access to the legacy interface is necessary.

<br />

## Key Modules

- **Dashboard**: A three-pane layout featuring a unified event calendar, recent quick links, attendance overviews, and upcoming digital assignments.
- **Timetable**: Offers a 3-way toggle between full grid, vertical day list, and a swipeable weekly view.
- **Digital Assignments**: Direct integration allows viewing and downloading question papers and submitted answers.
- **Attendance**: High-level visual tracking with SVG circular progress indicators and detailed per-class attendance histories.
- **Student Profile**: Renders basic and academic information as a 3D-flipping digital identity card and structured bento-box grids.
- **Marks & Curriculum**: Collapsible course assessments showing maximum marks, weightage, and percentage tracking alongside curriculum syllabus downloads.

<br />

## Architecture

A 2 KB `document_start` bootstrapper (`src/content.ts`) carries no static imports. It reads the saved role from `localStorage`, and on a VTOP login route calls `window.stop()` to cancel the HTML stream, mounts an empty `#retop-host` shadow root, then `import()`s `login.js` to render the sign-in card. On authenticated routes it cloaks the native document and imports `dashboard.js`, which mounts the React application into the same shadow DOM to prevent legacy CSS conflicts. An initialization script in the main world handles the legacy bridge. Network requests are handled by a custom `VTOPNetwork` wrapper that fetches HTML fragments in the background, parses them into typed structures, and stores them in ephemeral Zustand states.

`login.js`, `dashboard.js`, and the offline/standalone bundles are separate ES modules and must stay listed in `web_accessible_resources` in both manifests.

<br />

## How to Build

1. Clone the repository and navigate into the project directory:
   ```sh
   git clone https://github.com/lavan8t/retop.git
   cd retop
   ```
2. Install the dependencies (Bun is recommended, but npm/yarn also work):
   ```sh
   bun install
   ```
3. Build the extension for production:
   ```sh
   bun run build
   ```
4. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Toggle **Developer mode** on the top right.
   - Click **Load unpacked** and select the root directory of this project.

<br />

## Contributing

Contributions are welcome. If you find a bug or have a feature request, please open an issue first to discuss it. 

1. Fork the repository.
2. Create your feature branch (`git checkout -b feat/your-feature`).
3. Commit your changes adhering to the Conventional Commits specification.
4. Push to the branch (`git push origin feat/your-feature`).
5. Open a Pull Request.

Please ensure your code maintains the existing architectural boundaries, particularly concerning the Shadow DOM isolation and the network interceptor patterns.
