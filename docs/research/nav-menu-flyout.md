# Research: M3E nav-menu flyout and real VTOP menu tree (ticket #14)

Question (#14): which M3E component and interaction pattern renders the left-rail
menu tree where hovering/tapping a rail category opens its links in a flyout to
the right of the rail, and tapping a submenu navigates?

Sources: M3E docs `https://matraic.github.io/m3e/components/{menu,nav-menu,nav-bar,nav-rail}.html`;
installed `@m3e/web` manifest + dist JS read **read-only** from the main checkout
because the worktree has no `node_modules` (`/home/lavan/Documents/projects/retop/node_modules/@m3e/web/dist/...`).
Version per `package.json:25` is `@m3e/web ^2.13.2`.

## 1. What the real data can express

- `QuickLink = {title, url, category, subheading?}` — a leaf with a URL, not a
  nested node (`/tmp/opencode/wt-nav-menu/src/types/vtop.ts:18-23`).
- `MenuCategory = {id, title, links: QuickLink[]}` — exactly **two levels**:
  category → flat link list (`/tmp/opencode/wt-nav-menu/src/types/vtop.ts:38-42`).
  `subheading` is an optional string hint, not a third level; it is populated
  only from nested VTOP accordion/section headers
  (`/tmp/opencode/wt-nav-menu/src/parsers/menu.ts:209-223`, `:330-350`).
- `scrapeMenu` pushes a category **only when `links.length > 0`**
  (`/tmp/opencode/wt-nav-menu/src/parsers/menu.ts:239-245`, `:283-293`,
  `:392-394`). Empty categories cannot come from the live scrape; they can only
  arrive via cached/offline data (`/tmp/opencode/wt-nav-menu/src/pages/app.tsx:762-773`).
- The app state is `MenuCategory[]` (`/tmp/opencode/wt-nav-menu/src/pages/app.tsx:224`),
  filled by a 2s poller that only accepts non-empty totals and otherwise reveals
  the legacy UI (`/tmp/opencode/wt-nav-menu/src/pages/app.tsx:789-838`), then passed
  to `ContentRouter` (`:1141`) and `TopBarSearch` (`:1192`).
- Link → view resolution already exists: `getDestinationView(link)` returns a
  `ViewType` or `'content'` (`/tmp/opencode/wt-nav-menu/src/utils/routes.ts:21-163`);
  navigation with legacy fallback lives in `handleLinkClick`
  (`/tmp/opencode/wt-nav-menu/src/pages/app.tsx:983-1015`).

Conclusion: the data supports one category → one flyout list of actionable links.
There is no recursive tree to render, so a `role="tree"` widget is not required.

## 2. Current rail and the existing flyout precedent

- The rail is `m3e-nav-rail mode="expanded"` with fixed `m3e-nav-item` destinations
  from `NAV_DESTINATIONS` (`/tmp/opencode/wt-nav-menu/src/components/layout/AppNavRail.tsx:89-95`,
  `:146-153`; `/tmp/opencode/wt-nav-menu/src/utils/routes.ts:175-186`), a profile
  button that already manages `aria-expanded`
  (`/tmp/opencode/wt-nav-menu/src/components/layout/AppNavRail.tsx:170-179`), and a
  compact `m3e-nav-bar` below `md` (`:195-217`). Its props expose only
  `onNavigate(view: ViewType)`, not a `QuickLink` handler (`:21-33`).
- There is already a hover/tap flyout pattern for the same `MenuCategory[]` in
  `TopBarSearch`: category controls set `aria-haspopup="menu"` /
  `aria-expanded` and open on `onMouseEnter` **and** `onClick`
  (`/tmp/opencode/wt-nav-menu/src/components/layout/TopBarSearch.tsx:1035-1081`);
  arrows/Enter/Escape browse the submenu (`:463-483`, `:515-532`); the flyout is
  positioned to the right of the trigger (`:1255-1312`) with a hover bridge
  (`:1314-1329`); item activation calls `onNavigate(link)` (`:1336-1375`).
- Empty categories are already filtered before that UI is built
  (`/tmp/opencode/wt-nav-menu/src/components/layout/TopBarSearch.tsx:354-370`) and
  the keyboard handler bails on `links.length === 0` (`:464-466`).
- `QuickLinksMenu` repeats the same idea with 300ms/450ms close delays
  (`/tmp/opencode/wt-nav-menu/src/components/home/QuickLinksMenu.tsx:78-113`) and
  Escape/arrow handling (`:226-254`).

## 3. M3E APIs (primary sources)

### `m3e-menu` / `m3e-menu-trigger` / `m3e-menu-item` — the flyout surface

- Docs: "presents a list of choices on a temporary surface, typically anchored to
  a trigger element" (`https://matraic.github.io/m3e/components/menu.html`).
- Manifest: `position-x` default `"after"`, `position-y` default `"below"`
  (`/home/lavan/Documents/projects/retop/node_modules/@m3e/web/dist/custom-elements.json:79036-79052`);
  `variant` default `"standard"` (`:79060`); imperative `show(trigger)` (`:78836`),
  `hide(restoreFocus)` (`:78855`), `hideAll()` (`:78876`), `toggle(trigger)` (`:78897`);
  `beforetoggle` / `toggle` events (`:79026`, `:79030`); built-in click-outside
  close (`:78760`); tags at `:79098` and module at `:78638`.
- Trigger: `m3e-menu-trigger for=...` with `attach()`/`detach()`
  (`.../custom-elements.json:77609`, `:77633`, `:77655`).
- Docs a11y: `role="menu"`; triggers augment their parent with `aria-haspopup`,
  `aria-controls`, `aria-expanded`; focus goes to the first enabled item on open
  and returns to the trigger on close; items are `role="menuitem"`.
- Source confirms Escape and Tab close (`.../dist/menu.js:505-512`), hover inside
  activates the menu (`:518-520`), and floating placement maps `after/below` to
  right-start/bottom-start (`:330-336`).

### `m3e-nav-menu` / `m3e-nav-menu-item` — an inline tree, not a flyout

- Docs: "hierarchical menu optimized for sidebars and drawers on larger devices";
  nesting child items expands in place. `https://matraic.github.io/m3e/components/nav-menu.html`.
- Manifest: item attrs `open` default false, `disabled`, `selected`
  (`.../custom-elements.json:82016`, `:82030`, `:82038`); events `opening`, `opened`,
  `closing`, `closed`, `click` (`:81995`, `:81998`, `:82003`, `:82007`, `:82011`);
  methods `expand`/`collapse` (`:82222`, `:82269`); tags at `:82077`, `:82447`,
  group at `:82585`. No overlay/position attributes exist on this element.
- Source: `role="tree"` (`.../dist/nav-menu.js:429`), items `role="treeitem"`
  (`:119`), `aria-current` on leaves and `aria-expanded` on expandable items
  (`:223`, `:233`), container `tabindex="0"` with `aria-activedescendant`
  (`:505`, `:540`), roving arrow-key handling (`:546-605`). Activation/expand is
  `@click` only (`:249`, `:281-303`); there is **no hover handler and no Escape
  case** in the component (Keyboard switch at `:551-604`).
- Docs for `m3e-nav-item` (used by the rail) note single-select with
  `beforeinput`/`input`/`change` and `aria-current`
  (`https://matraic.github.io/m3e/components/nav-bar.html`; manifest
  `.../custom-elements.json:81130`).

### Registration gap (blocks either M3E choice)

`src/m3e-inject.ts:13-33` imports nav-rail/nav-bar (`:25-26`) but **not** `@m3e/web/menu`
nor `@m3e/web/nav-menu`; `m3eTags.ts:24-29` aliases only the rail/bar tags, and
`m3e.d.ts:28-70` declares no menu tags. Whichever component is chosen must be
added to the MAIN-world injection bundle and to the tag aliases (or JSX
intrinsics) before React can mount it.

## 4. Recommendation

**Use one `m3e-menu` as the flyout; keep rail categories as plain buttons.** Do
not use `m3e-nav-menu` for this flyout, and do not hand-roll another fixed div.

1. **Component & placement.** Render a single
   `<m3e-menu id="rail-category-menu" position-x="after" position-y="below"
   variant="standard">` as a sibling *outside* `m3e-nav-rail` (avoids rail
   clipping), populated with one `m3e-menu-item` per `QuickLink` of the active
   category. `position-x="after"` places it right of the rail-anchored trigger;
   cap height with `--m3e-menu-container-max-height`. Reuse the same element for
   every category (cheap re-render, one Escape/click-outside owner).
2. **Trigger controls.** For each non-empty category render a `<button>` in the
   rail with `aria-haspopup="menu"`, `aria-controls="rail-category-menu"` and
   `aria-expanded={activeCategory === cat.id}`. Keep them as buttons, not
   `m3e-nav-item`: nav items are single-select and emit selection events that
   would fight the fixed destinations in `NAV_DESTINATIONS`.
3. **Event wiring.** One idempotent `openCategory(cat, button)`: if that category
   is already open, do nothing; otherwise set active state and call
   `menu.show(button)`. Call it from `onPointerEnter` (hover) **and** `onClick` /
   Enter / Space (tap and keyboard) — idempotence keeps touch devices that emit
   both enter and click from closing it. Close with `menu.hide(true)` on leaving
   rail+menu region using the existing 300/450ms grace pattern
   (`QuickLinksMenu.tsx:83-113`); Escape and click-outside are already handled by
   `m3e-menu` (`menu.js:505-512`; manifest `:78760`) — do **not** add a second
   global keydown handler. Sync `aria-expanded` from the menu's `toggle` event
   (manifest `:79030`) rather than from local guesses.
4. **Navigation.** On `m3e-menu-item` click, pass the `QuickLink` to a new
   `AppNavRailProps.onLinkClick` wired to `handleLinkClick`
   (`app.tsx:983-1015`), which already applies `getDestinationView` and the
   legacy fallback; then `hide(true)` and clear the active category. For links
   that are not retop views, `handleLinkClick` opens the native VTOP target.
5. **Empty categories.** Filter with `menu.filter(c => c.links?.length > 0)`
   before building triggers (matches `TopBarSearch.tsx:365-367`). A category with
   no links gets no trigger and never opens a menu; if every category is empty,
   the rail shows only the fixed `NAV_DESTINATIONS` and no empty `role="menu"` is
   ever rendered — otherwise `aria-expanded` would point at a nonexistent popup.
   Group by `subheading` only when present (using `m3e-menu-item-group`); there is
   no need for a third nesting level.
6. **Registration.** Add `import '@m3e/web/menu'` near `m3e-inject.ts:25-26` and
   `M3eMenu`/`M3eMenuItem`/`M3eMenuTrigger` aliases in `m3eTags.ts:24-29` (plus
   `m3e.d.ts` if literal tags are used). This also resolves map #13's open
   question: the flyout is an M3E `m3e-menu`, not `m3e-nav-menu` and not custom.

### Why not `m3e-nav-menu`

It is a sidebar/drawer **tree** that expands inline with click/keyboard only
(`nav-menu.js:249`, `:281-303`, `:546-605`), has no hover or Escape handling, and
would still need a custom positioned surface to appear to the right of the rail
plus a second keyboard owner. Its tree semantics (`role="tree"`,
`aria-activedescendant`) are more than this flat category → links data needs.
Revisit it only if the design later becomes a full navigation drawer.

## 5. Risks / not checked

- Verified from the installed manifest and dist JS, not from a live browser run;
  the exact floating placement against VTOP's injected DOM should be smoke-tested.
- `m3e-menu-trigger` was not used imperatively here; if the team prefers it, let
  it own `aria-*` and avoid double-toggling on click (hover still needs `show()`).
