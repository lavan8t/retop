# Native / legacy VTOP dark theme

`src/styles/vtop-dark.css` is applied to the **native VTOP document**, not to
retop's shadow root. It is a contrast inversion, not a component-level theme:

```css
html[data-theme='dark'] {
  filter: invert(1) hue-rotate(180deg);
}
```

## Rules

- Anything that must keep its original appearance inside the inverted page
  needs the opposite filter. Keep the counter-invert list in sync when adding a
  new body-level retop surface:
  `#retop-host`, `#retop-session-dialog`, `#retop-open-loader`,
  `#retop-native-portals`, the legacy menu search widgets.
- Prefer portaling UI into `getAppRoot()` (inside `#retop-host`) over
  `document.body`. `document.body` is outside the counter-inverted host, so the
  dialog/menu comes out with inverted colors. `AlertDialog` uses `getAppRoot()`.
- `color-scheme: dark` is scoped to native `select` / date-like inputs so their
  browser-rendered popups are dark. Do **not** add it to file inputs: the
  "Choose File" button becomes a bright block after the page inversion.
- The theme resolves in `applyTheme()`, which mirrors the result to
  `localStorage.retop_vtop_theme`. `content.ts` reads that key at document_start,
  sets `data-theme`, and injects `vtop-dark.css` before the dashboard entry
  loads. Without the mirror the native page paints light and flips dark after
  IndexedDB answers.
- The early pass only runs on authenticated routes. The login takeover calls
  `window.stop()`, which could cancel the stylesheet, and the login UI has its
  own theme.

## Known limitations

- The inversion shifts VTOP's semantic colors (danger red becomes a lighter
  red, warning amber becomes brown). A true palette would require replacing the
  inversion with class-level overrides.
- Browser popups for controls other than `select`/date inputs still follow the
  OS/browser theme.
- VTOP inline styles and images that are already dark can still look wrong;
  mark them `[data-no-invert]` or add a counter-invert rule.
