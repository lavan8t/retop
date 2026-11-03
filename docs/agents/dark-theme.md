# Native / legacy VTOP dark theme

`src/styles/vtop-dark.css` is applied to the **native VTOP document**, not to
retop's shadow root. It is a component-level theme, not a contrast inversion:

- near-black page canvas, layered surfaces for cards / headers / hover
- VTOP's blue and gold accents, desaturated for dark
- no page-level inversion, so images, charts, captchas and browser widgets keep
  their real colours. `filter: invert()` appears only to recolour two black
  Bootstrap icons (`.btn-close`, `.accordion-button::after`).

## Rules

- `#vtop-header` is **never** targeted. It keeps VTOP's blue header, logo,
  icons and dropdown in every theme. Do not add rules for it, including
  counter-invert/fallback colours.
- Most rules are scoped to `#vtop-body-content`, `#top-hmenu-bar` or `.modal`.
  The exceptions are body-level widgets that VTOP moves outside those roots
  (`blockUI`, jQuery-UI pickers, `.modal`) and `.bootstrap3-iso` legacy pages;
  those are scoped to the widget/page itself, never the header.
- Bootstrap tooltips and popovers are **not** themed: they are appended to
  `document.body` with no origin information, and header buttons use them.
  Leaving them native is what keeps the header untouched.
- Prefer overriding VTOP's own classes (`.customTable`, `.tableHeader`,
  `.list-group-item`, `.card`, `.panel`, `.box`, `.accordion`) over a global
  `*` selector. VTOP writes table header colours as inline
  `style="background-color:#3c8dbc"`, so cell rules need `!important` to win.
- Never style the header's `.dropdown-menu` through the global dropdown rules;
  it is inside `#vtop-header` and intentionally stays native.
- Theme only when `html` has `data-theme="dark"` or `"amoled"`. `"light"` must
  never match; use `html:is([data-theme='dark'], [data-theme='amoled'])`.
- `color-scheme: dark` is scoped to the content, menu and modals, so native
  `select`/date popups are dark without changing the header.
- The theme resolves in `applyTheme()`, which mirrors the result to
  `localStorage.retop_vtop_theme` through `src/utils/vtopThemeMirror.ts`.
  `content.ts` reads that key at document_start and injects `vtop-dark.css`
  before the dashboard entry loads. `content.ts` mirrors the literal because
  the bootstrapper must stay import free. If the key is missing, paint nothing:
  guessing `dark` makes light/none users flash dark and can leave them there.
- Teardown removes `data-theme` and `retop-dark-stylesheet`. `applyTheme()`
  returns early once `window.__retopAborted` is set so a late IDB read or a
  BroadcastChannel listener cannot re-darken a page handed back to VTOP.
- The early pass only runs on authenticated routes. The login takeover calls
  `window.stop()`, which could cancel the stylesheet, and the login UI has its
  own theme.

## Coverage notes

- Marks/attendance tables use `.customTable`, `.customTable-level1`,
  `.tableHeader`, `.tableHeader-level1` and inline row colours; all four are
  handled in the "VTOP legacy tables" section.
- Course Page Archive writes `background-color:#fff` inline on the `<table>`
  itself; `.table { background-color: transparent !important }` is the archive
  fix. Course Page sections use bare `<fieldset><legend>`, which are themed
  separately.
- Result / Grade View writes its blue header rows (`#3c8dbc`) and pale
  highlight rows (`#C0D8C0`) inline; the `th` and
  `tr[style*='background-color']` rules cover both.
- Modals live at body level; their headers can carry `.bg-info` injected by
  VTOP's dialog JS. `.bg-*` utilities are neutralised inside `.modal`.
- `blockUI` reparents `#popup` outside `#vtop-body-content`, so it has its own
  rule.
- jQuery-UI datepickers are appended to `document.body`; they are themed in
  the picker section.
- Browser popups for controls other than `select`/date inputs still follow the
  OS/browser theme.
