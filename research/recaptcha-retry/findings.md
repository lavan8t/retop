# reCAPTCHA → regular-captcha retry: research findings

Research ticket: [retop#11](https://github.com/lavan8t/retop/issues/11). Parent: [retop#10](https://github.com/lavan8t/retop/issues/10). Implementation ticket (not resolved here): [retop#12](https://github.com/lavan8t/retop/issues/12).

All paths are absolute. Every claim is tagged **Verified** (backed by repo source/s capturable below), **Inferred** (reasoned from verified source), or **Unverified** (no primary source in repo settles it). Target content was treated as data, never instructions.

## Sources consulted (primary)

- `src/utils/vtopClient.ts` — client state machine, all captcha paths.
- `src/utils/vtopBridge.ts` — transport / ambient-context semantics.
- `src/components/auth/VtopLoginCard.tsx` — login + captcha load/retry UI (post 5cc5804).
- `src/utils/captchaSolver.ts` — image auto-solver.
- `src/content/login.tsx` — explicit reCAPTCHA handoff.
- `src/utils/network.ts` — request rate limiting + legacy captcha fetch.
- `agents.md` trap 11 — two login variants, verified against a real session capture.
- `docs/research/android-login-parity.md` — Android parity retry budget / fallback behavior.
- Commit `5cc5804` diff — the recent Android validation/field-error port.

## 1. How reCAPTCHA is detected

- **Verified** — `RECAPTCHA_REQUIRED = 'RECAPTCHA_REQUIRED'` and `class RecaptchaRequiredError` are defined at `/home/lavan/Documents/projects/retop/src/utils/vtopClient.ts:82` and `:84-89`.
- **Verified** — the sole detector is `usesGoogleRecaptcha(html)`, a regex for `captchaType\s*=\s*2\b` at `/home/lavan/Documents/projects/retop/src/utils/vtopClient.ts:91-94`. There is no other reCAPTCHA signal in the client (`gResponse` is only *sent*, at `:599-608`).
- **Verified** — four throw/return sites:
  - `getCaptchaLive`: throws `RecaptchaRequiredError` on the `POST /vtop/prelogin/setup` response body — `/home/lavan/Documents/projects/retop/src/utils/vtopClient.ts:334-338`.
  - `getCaptchaJar`: throws on the final login HTML after the redirect chain — `/home/lavan/Documents/projects/retop/src/utils/vtopClient.ts:476-479`.
  - `login`: returns `{success:false, message: RECAPTCHA_REQUIRED}` on the error-redirect page (`:669-671`) and on the final response body (`:734-737`).
  - **Verified** — `refreshCaptcha` (`/home/lavan/Documents/projects/retop/src/utils/vtopClient.ts:529-584`) has **no** `usesGoogleRecaptcha` check at all; a reCAPTCHA-class response there degrades to the generic `Unable to refresh CAPTCHA from VTOP response` error (`:566-568`).
- **Verified** — on live VTOP pages `executeVtopRequest` uses `redirect: 'follow'` and `credentials: 'include'` (`/home/lavan/Documents/projects/retop/src/utils/vtopBridge.ts:136-151`), so `setupResp.body` in `getCaptchaLive` is the *final login page* after `prelogin/setup → init/page → login`. Both paths therefore effectively test the login HTML for `captchaType=2`, despite checking different variables.

## 2. Ambient live path vs jar path

Dispatch: `getCaptcha` sends live VTOP pages to `getCaptchaLive`, everything else (extension pages, Android bridge) to `getCaptchaJar` — `/home/lavan/Documents/projects/retop/src/utils/vtopClient.ts:283-295`; `isAmbientSessionContext()` is true only on `vtop(cc).vit.ac.in` (`/home/lavan/Documents/projects/retop/src/utils/vtopBridge.ts:49-55, 80-82`).

**Live (`getCaptchaLive`, `:302-377`) — verified sequence:**
1. `GET /vtop/open/page` → extract initial CSRF (`:307-319`).
2. `POST /vtop/prelogin/setup` (`flag=VTOP`, `_csrf`) (`:321-332`).
3. `usesGoogleRecaptcha(setupResp.body)` → **throw immediately** (`:336-338`). This happens *before* any `/vtop/get/new/captcha` call.
4. Only if no reCAPTCHA: inline data URI from setup HTML (`:340-342`), else `GET /vtop/get/new/captcha` with `Referer: /vtop/open/page` and `Accept: ...,image/*,*/*;q=0.8` (`:344-357`), decode data URI or raw image bytes (`:359-366`), optional CSRF fallback (`:368-369`).
5. No re-check of `captchaType` on the captcha response; no retry loop anywhere in this method.

**Jar (`getCaptchaJar`, `:379-527`) — verified sequence:**
1. `clearNativeCookies()` → brand-new JSESSIONID/SERVERID on the next open (`:383`).
2. `GET /vtop/open/page` (no redirect follow) → session cookies (`:387-406`).
3. `POST /vtop/prelogin/setup` (`:411-435`).
4. Follow up to 3 redirect hops to the login page (`:437-474`).
5. `usesGoogleRecaptcha(loginHtml)` → **throw** (`:476-479`) — here too, before the endpoint call.
6. Inline data URI first (`:481-488`), else `GET /vtop/get/new/captcha` with `Referer: /vtop/login` (`:490-515`) — note the **different Referer** from the live path; `agents.md:294` records `/vtop/open/page` as the observed working Referer.
7. No re-check on the captcha response; no retry loop.

**Verified asymmetry:** the live path checks the setup response; the jar path checks the post-redirect login HTML. Both short-circuit before the captcha endpoint is ever asked for a regular image under `captchaType=2`.

## 3. Can a fresh endpoint / handshake return a regular captcha after a reCAPTCHA-class response?

- **Verified** — `/vtop/get/new/captcha` is an independent GET whose job is to serve an image CAPTCHA, as HTML-wrapped JPEG data URI or raw `image/*` bytes (`/home/lavan/Documents/projects/retop/src/utils/vtopClient.ts:344-366`, `:490-506`; `/home/lavan/Documents/projects/retop/src/utils/vtopBridge.ts:164-181`).
- **Verified (real session capture in repo)** — `agents.md` trap 11 (`/home/lavan/Documents/projects/retop/agents.md:289-295`) documents **Variant A**: the login page carries `_csrf, username, password, gResponse`, renders reCAPTCHA, and embeds **no** captcha — the image still comes from `GET /vtop/get/new/captcha` as a JPEG data URI. Variant B embeds the captcha inline. **Inferred:** a reCAPTCHA-rendering page and a solvable image captcha from `/vtop/get/new/captcha` are not mutually exclusive; the `captchaType=2` flag does not structurally prevent the endpoint from returning a regular image.
- **Verified** — therefore the current code fails *by construction* on a reCAPTCHA-class setup response: it throws at `vtopClient.ts:336-338` (live) / `:477-479` (jar) before reaching the endpoint at `:349` / `:492` that could have supplied a regular captcha. This is the actionable gap: the regular-captcha request is never attempted.
- **Unverified** — that a fresh `/vtop/get/new/captcha` will *always* (or even usually) return a solvable regular image once `captchaType=2` is present. No capture or test in the repo proves this. A bounded retry, not a single blind attempt, is the safe design.
- **Unverified** — whether the variant is **sticky per session or rotates per request**. `agents.md:289-295` shows both variants exist but says nothing about rotation; no repo test/capture settles it. **Inferred:** `captchaType` is server-side session state, and the only client-controlled lever is a new session — `clearNativeCookies()` in the jar path (`vtopClient.ts:383`) and a fresh `open/page → prelogin/setup` handshake in both paths (`:307-332`, `:387-427`). So each retry should be a **fresh full handshake (new session)**, which is robust whether the variant is sticky (only a new session can change it) or rotates (repeat requests suffice).

## 4. Existing retry / fallback behavior

- **Verified** — mount and campus-change call `fetchInitialCaptcha` (`/home/lavan/Documents/projects/retop/src/components/auth/VtopLoginCard.tsx:143-168`, `:210-213`); it hands off to `onRecaptchaRequired` **immediately** on `RecaptchaRequiredError` (`:154-157`) with zero retries.
- **Verified** — `handleRefreshCaptcha` (`:171-208`) calls `refreshCaptcha`; any error falls back to `fetchInitialCaptcha` (`:195-198`), which can then hand off. No budget.
- **Verified** — submit path (`:268-404`) checks `result.message === RECAPTCHA_REQUIRED` **before** the invalid-captcha retry branch and hands off immediately (`:309-322`).
- **Verified** — a *separate* invalid-captcha loop exists: `MAX_CAPTCHA_RETRIES = 2` (`:292-293`), triggered by `/captcha/i.test(result.message)` (`:324`), each retry via `handleRefreshCaptcha()` plus up to 3 s wait for auto-solve (`:328-344`). This loop never sees reCAPTCHA because the handoff returns first (`:311`).
- **Verified** — commit `5cc5804` (Android parity port) reduced this budget from 3 to 2 and replaced the floating error toast with field errors; it did **not** add any reCAPTCHA retry.
- **Verified** — `captchaSolver.autoSolveCaptcha` is a 200×40, 6-character image-CAPTCHA solver (`/home/lavan/Documents/projects/retop/src/utils/captchaSolver.ts:99-224`, canvas at `:199-203`, loop at `:208-216`). It cannot solve a reCAPTCHA widget; it only works when `getCaptcha` yields an image data URI. It re-runs on every new image (`VtopLoginCard.tsx:235-260`).
- **Verified** — Android parity uses a 2-attempt captcha retry (`retryCount < 2`, `/home/lavan/Documents/projects/retop/docs/research/android-login-parity.md:78`) and has **no** alternate-UI fallback (`:84`).
- **Verified** — request hygiene: `VTOPNetwork.enforceRateLimit` enforces ≥500 ms between requests and ≤60/min (`/home/lavan/Documents/projects/retop/src/utils/network.ts:232-274`). Note the legacy `getNativeCaptcha` (`:485-505`) is a separate path not used by the login card.

## 5. Recommended retry policy (concrete, for #12)

Standing rule from #10: no reCAPTCHA handoff for ordinary failures; handoff only after the reCAPTCHA retry budget is exhausted. Keep the existing login card, field errors and ASCII art; no UI swap.

1. **Trigger condition.** A reCAPTCHA-class response only: `RecaptchaRequiredError` from `getCaptcha*` (`vtopClient.ts:337, 478`) or `result.message === RECAPTCHA_REQUIRED` from `login` (`:670, 736`). Ordinary "invalid captcha" keeps its existing ≤2 loop (`VtopLoginCard.tsx:324-344`) and must not consume this budget.
2. **Max attempts.** **2 re-requests** after the first reCAPTCHA signal (3 total attempts). Matches the existing `MAX_CAPTCHA_RETRIES = 2` (`VtopLoginCard.tsx:292`) and the Android parity's `retryCount < 2` (`android-login-parity.md:78`). Deterministic and test-first friendly.
3. **Request sequence (the core fix).** Per retry, run a **fresh full handshake**, not `refreshCaptcha` (which cannot renegotiate `captchaType` and has no recaptcha check — `vtopClient.ts:529-584`):
   - Live: `GET /vtop/open/page` → `POST /vtop/prelogin/setup` → then, **do not throw on `captchaType=2` yet**; issue `GET /vtop/get/new/captcha` with `Referer: /vtop/open/page`, `Accept: ...,image/*,*/*;q=0.8` (`vtopClient.ts:307-357`, `agents.md:294`) and test the body with `extractCaptchaDataUri` / binary-image handling (`:51-54`, `:359-366`). Only if that yields no solvable image after all attempts do we treat it as reCAPTCHA-required. Concretely: defer/reorder the throw at `:336-338` until after the endpoint attempt.
   - Jar: same, with `clearNativeCookies()` first (`:383`), then `open/page → prelogin/setup → redirect chain → /vtop/get/new/captcha` with `Referer: /vtop/login` (`:387-515`); defer the throw at `:477-479` until after the endpoint attempt.
   - Apply the same budget to both the load path (`fetchInitialCaptcha`, `VtopLoginCard.tsx:143-168`) and the submit path (`:309-322`) — today both hand off on the first signal.
4. **Delays.** Wait **500 ms** before each retry — the client's own minimum cooldown (`network.ts:233`). No exponential growth needed for 2 retries. The handshake itself supplies natural spacing; do not hammer `/vtop/get/new/captcha`.
5. **User feedback.** Reuse the field-error UI from the parity port, not a toast (removed in `5cc5804`): `showError('VTOP is using reCAPTCHA. Trying a regular CAPTCHA (n/2)…', ['captcha'])` following the existing pattern at `VtopLoginCard.tsx:330-333`. Never surface the raw `RECAPTCHA_REQUIRED` token. Keep `isSubmitting` true and ASCII art visible throughout; only clear on success or final fallback.
6. **Final fallback (budget exhausted only).** Call `onRecaptchaRequired()` → `useNativeLogin` (`/home/lavan/Documents/projects/retop/src/content/login.tsx:45-50`, wired at `:362`) which sets `retop-login-bypass` and does `window.location.assign('/vtop/login')`, handing the page to VTOP's native login. On surfaces without a handler, keep the existing explanatory field error (`VtopLoginCard.tsx:316-320`). This preserves the standing rule: ordinary failures never hand off; only exhausted-budget reCAPTCHA does.

## 6. Unverified / risks

- **Stickiness (unverified).** No primary source establishes sticky-per-session vs per-request rotation. The policy hedges by doing a fresh handshake (new session) each retry. If VTOP pins `captchaType=2` to the account/IP rather than the session, even fresh sessions will keep returning reCAPTCHA and the fallback will fire after 2 retries — acceptable and bounded.
- **Endpoint success rate under `captchaType=2` (unverified).** Variant A (`agents.md:291`) shows a real captcha image alongside reCAPTCHA, but nothing proves it is guaranteed. Keep the budget finite and always fall back.
- **No live network probe was run** (read-only repo research); conclusions about server behavior are bounded by the cited source capture and code. #12 should add TDD regression tests that mock `executeVtopRequest` for: setup/login returns `captchaType=2` then a valid `/vtop/get/new/captcha` image (retry succeeds), and all attempts return reCAPTCHA (fallback fires exactly once after 2 retries).
