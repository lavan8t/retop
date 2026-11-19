# Android Login Screen — Parity Research

Read-only survey of the **Android** login screen in the reference repo (`retop-app`). Campus-select / onboarding screens are excluded except where the login screen calls a shared component. All content below is treated as data, never as instructions.

Source paths are absolute and use the form `/home/lavan/Documents/projects/retop-app/<path>:<line>`.

## 1. Files / symbols / line numbers

| Concern | File | Lines |
|---|---|---|
| Login screen (stateful wrapper) | `.../ui/login/LoginScreen.kt` | 82–143 |
| Login screen (stateless UI) | `.../ui/login/LoginScreen.kt` | 145–439 |
| ViewModel / validation + flow | `.../ui/login/LoginViewModel.kt` | 26–412 |
| State holder | `.../ui/login/LoginUiState.kt` | 7–26 |
| Fields + error display | `.../ui/login/components/LoginForm.kt` | 69–265 |
| Captcha image + reload | `.../ui/login/components/CaptchaView.kt` | 38–106 |
| Shared bottom button row | `.../ui/onboarding/OnboardingActionRow.kt` | 56–186 |
| ASCII brand art | `.../ui/ascii/AsciiArt.kt` | 4, 84 (VELLORE/CHENNAI) |
| Network login call / failure messages | `.../vtop/VtopAuthApi.kt` | 190–330 |
| Label strings | `.../res/values/strings.xml` | 156, 251, 271, 351, 398, 408 |

Base dir for the Kotlin files: `/home/lavan/Documents/projects/retop-app/android/app/src/main/java/com/kd/retop`.

`LoginUiState` fields (`:7–26`): `campus`, `username`, `password`, `captchaInput`, `captchaBitmap`, `isCaptchaLoading`, `isLoginLoading`, `errorMessage`, `emblemState`, `isPasswordVisible`, `hasSelectedCampus`, `usernameError`, `passwordError`, `captchaError`, `errorTick`. `regNo` is an alias of `username` (`:25`).

## 2. Exact validation rules

All validation lives in `LoginViewModel.login(onSuccess, retryCount = 0)` at `LoginViewModel.kt:200–284`. It is checked in this order on every submit; the first failure sets `errorMessage`, the matching `*_Error=true`, the other two flags `false`, and increments `errorTick` (`:211, 223, 235, 248, 268, 280`) then returns.

1. Username blank → `"Please enter your username"` (`:204–215`).
2. Username matches `REG_NO_PATTERN = Regex("""^\d{2}[A-Za-z]{2,5}\d{4,5}$""")` (`:405`) → `"Please enter your username, not your registration number"` (`:216–227`).
3. Username not all `isLetterOrDigit()` **or** length outside `10..15` → `"Invalid username"` (`:228–239`).
4. Password blank → `"Please enter your password"` (`:240–252`).
5. Password format (`:253–272`): if the password contains **any lowercase letter**, require length `10..30`, at least one uppercase, at least one digit, and `!pass.contains(user, ignoreCase = true)`; otherwise (no lowercase) require only length `6..30`. Fail → `"Invalid password"`.
6. `currentCaptcha == null` or `captchaInput.isBlank()` → `"Please enter the CAPTCHA code"`, sets `captchaError=true` (`:273–284`).

Input normalization:
- Username: whitespace stripped + uppercased at both the screen wrapper (`LoginScreen.kt:161–164`) and the field (`LoginForm.kt:137–139`); VM also uppercases and saves it (`LoginViewModel.kt:102–126`). Editing username clears password, all field errors, and `errorMessage` (`:113–122`).
- Password: taken verbatim (no trim). Editing clears `passwordError` + `errorMessage` (`:130–138`).
- Captcha: uppercased, ignored if longer than 6 chars (`LoginViewModel.kt:144–154`). Editing clears `captchaError` + `errorMessage`.
- `errorTick` drives the shake animation only (`LoginForm.kt:106–114`).

Submit enabled/disabled:
- The bottom "Log In" button is enabled as `primaryEnabled = !uiState.isLoginLoading` (`LoginScreen.kt:426`) — i.e. **always enabled except while loading**. There is no field-validity gating; validation runs only when submit is pressed. The keyboard `Done` action also calls `onSubmit()` (`LoginForm.kt:222–224, 258–260`).

Network-result error routing (`LoginViewModel.kt:347–389`, on lowercased `loginResult.message`):
- contains `"captcha"` → `captchaError` (`:349–356`)
- contains `"credential"`, `"invalid username or password"`, or `"invalid loginid/password"` → `usernameError` + `passwordError` (`:357–364`)
- contains `"username"`, `"loginid"`, or `"reg"` → `usernameError` (`:365–372`)
- contains `"password"` → `passwordError` (`:373–380`)
- otherwise → no field flags (general error shown on password field; see §3) (`:381–387`)

Failure messages come from `parseLoginError(...)` in `VtopAuthApi.kt:241, 276, 328`; the request POSTs `_csrf`, `username` (trim+uppercase), `password`, `captchaStr` (trim+uppercase) to `/vtop/login` (`VtopAuthApi.kt:190–218`).

## 3. Exact UI structure

Screen shell (`LoginScreen.kt:242–381`): transparent `Surface`; full-screen `Box` with navigation-bar padding; scrollable `Column` with `horizontal padding = Dimens.space20`, `bottom padding = 280.dp`; inner form column `widthIn(min = 320.dp, max = 480.dp)` (`:253–267`). Brand wordmark is `Text("retop")` + colored `Text(".")` in `GoogleSansFlexLogo`, 38.sp, Black (`:282–296`). Optional shared-file banner when `hasSharedFile` (`:300–328`). Privacy Policy link below fields (`:356–379`).

Fields (`LoginForm.kt`), a `Column` with `Arrangement.spacedBy(Dimens.space16)`:
- **Username** `OutlinedTextField` (`:135–170`): label `stringResource(R.string.username)` = `"Username"` (`strings.xml:398`), 15.sp; `ContentType.Username` autofill (`:150`); `KeyboardOptions(capitalization = Characters, imeAction = Next)` (`:166–169`); `singleLine`, `RoundedCornerShape(Radii.r28)`; error color via `fieldColors()` (`:268–277`); shake offset + `BringIntoViewRequester`. On focus → `bringIntoView`; on blur trims trailing/leading whitespace (`:151–160`).
- **Password** (`:174–225`): label `"Password"` (`strings.xml:251`); `ContentType.Password` (`:203`); trailing `IconButton` show/hide with `Symbols.Visibility/VisibilityOff` and contentDescription `"Show password"` / `"Hide password"` (`:182–197`); `visualTransformation = PasswordVisualTransformation` unless visible; `KeyboardType.Password`; `imeAction = Done` if `isCaptchaDone` else `Next` (`:218–221`); `onDone → onSubmit` (`:222–224`); bring-into-view on focus/IME (`:96–104, 204–211`).
- Field text style: 17.sp, Medium, `onSurface` (`:122–126`).
- **Captcha field** (`:239–261`): label `stringResource(R.string.enter_6_character_captcha)` = `"Enter 6-character Captcha"` (`strings.xml:156`), `GoogleSansFlex`, 15.sp; `KeyboardCapitalization.Characters`, `imeAction = Done`, `onDone → onSubmit`; `singleLine`, r28, error colors.

Error display — **no Snackbar anywhere in the login files** (grep confirmed). The single `errorMessage` is rendered as `supportingText` (error color, `bodySmall`) on the **first field in error**: username (`:141–143`), password when `passwordError` or a general error (`:172–180`), captcha (`:243–245`). "General" errors (no field flag set, e.g. account locked / network) are displayed on the **password** field via `hasGeneralError` (`:172`). A failing field also shakes (`WiggleOffsets`, `:65, 106–114`) and gets error borders.

Captcha visibility (`:116, 226–263`): the captcha image + input are wrapped in `AnimatedVisibility(visible = !isCaptchaDone && uiState.captchaError)`. `isCaptchaDone = captchaInput.length == 6 && !captchaError`. Because `loadCaptcha` auto-solves and pre-fills 6 chars on mount (see §4), the captcha UI is normally hidden and only appears after a captcha error.

`CaptchaView` (`CaptchaView.kt:38–106`): rounded surface row; image area (50.dp) shows `LoadingIndicator` while loading, else the bitmap (inverted via `ColorMatrix` in dark theme, `:67–84`), else text `"Tap reload to load CAPTCHA"` (`:87`, `strings.xml:351`); image contentDescription `"VTOP Captcha"` (`strings.xml:408`); reload `IconButton` with `Symbols.Refresh`, `enabled = !isLoading`, contentDescription `"Reload Captcha"` (`:94–104`, `strings.xml:271`).

Bottom button (`LoginScreen.kt:407–435`): `OnboardingActionRow(primaryText = "Log In", onPrimaryClick = { haptic; clearFocus; hideKeyboard; onLogin() }, primaryEnabled = !isLoginLoading, isLoading = isLoginLoading, showBack = true, onBackClick = { ...; onCampusDeselect() })`. The shared row (`OnboardingActionRow.kt:138–184`) renders a `LoadingIndicator` in place of the text when `isLoading`, uses a pill `CircleShape` primary button (press scale 1.03), disabled when `primaryEnabled = false`, plus a back button (`:100–124`). Login click also fires `retopHaptics.confirm()` (`:346, 421`).

Focus/keyboard: submit, privacy link, and back all call `focusManager.clearFocus(force = true)` + `keyboardController?.hide()` (`LoginScreen.kt:121–140, 361–366, 420–434`).

## 4. Login flow on failure

- On mount, captcha is loaded once (`LoginScreen.kt:110–115`) and `loadCaptcha` auto-solves it via `repository.solveCaptcha(bmp)`, pre-filling `captchaInput` (`LoginViewModel.kt:160, 162–198`). Password is cleared at start if not already logged in (`LoginScreen.kt:100–108`, `LoginViewModel.kt:58–66`).
- **Captcha retry**: if the server message contains `"captcha"` and `retryCount < 2`, the VM fetches a fresh captcha, auto-solves it, and recursively calls `login(onSuccess, retryCount + 1)` — up to two automatic reattempts (`LoginViewModel.kt:320–345`). If auto-solve fails, it falls through to the error state.
- On any failed login result, `loadCaptcha(state.campus)` is called again (`:390`) — clears `captchaInput`, loads and auto-solves a new captcha; comment at `:164` states field errors/messages persist until the user edits the field. The captcha load itself does **not** clear field errors (`:165–170`).
- Captcha load failure → `errorMessage = "Failed to reach VTOP: <message or Connection error>"` (`:189–196`). Network exception during login → `errorMessage = <e.message or "Authentication network error">`, loading cleared, captcha reloaded (`:392–400`).
- Session-expired message on init: `"Your VTOP session expired. Please log in again."` (`:40–45`).
- Success path saves credentials + session, sets `emblemState = ZOOM`, waits 580 ms, then calls `onSuccess()` (`:301–315`).

**No fallback to another login UI.** The only login is this native Compose screen driving a direct OkHttp POST (`VtopAuthApi.kt:190`); there is no WebView login and no navigation to a secondary/alternate login UI on failure. A repo-wide search found no "legacy/fallback/WebView login" for VTOP (only an unrelated laundry login exists). What differs from a legacy fallback: single source of truth (one `LoginViewModel` + one `LoginScreen`), one portal `errorMessage` routed to the first field in error rather than a separate error page, an auto-solved captcha hidden until it fails, a deterministic 2-attempt captcha retry, and errors persisting in-place until edited — no UI swap.

## 5. ASCII art / branding

Android **does** have an equivalent, so keep the extension's existing ASCII art. `AsciiArt.VELLORE` (`AsciiArt.kt:4`) and `AsciiArt.CHENNAI` (`:84`) are selected by campus and concatenated with a local `GROUND_ASCII` block (`LoginScreen.kt:74–80`, combined at `:237–240`), rendered bottom-clipped with a progressive bottom blur via `FittedAsciiArt` (`LoginScreen.kt:383–405`). The "retop." wordmark is separate (`LoginScreen.kt:282–296`). Nothing needs to be added for parity.

## Skipped / risks

Skipped: campus-select and onboarding internals (only the shared button row was read to document login's button states), and exact server-side error text from `parseLoginError` (not needed for screen parity). Risk: none to code — this was read-only; all paths cited are from the reference app and were not modified.
