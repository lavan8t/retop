# Google Calendar sync — setup

retop can push your schedule into a dedicated Google Calendar named
`retop - <your registration number>` (e.g. `retop - 22BCE1234`).

It writes the **same event set as the .ics export**: timetable classes (weekly
recurring, with holidays skipped and Saturday day-orders honoured), exam
entries, and university events. Re-running the sync updates the existing
events in place instead of duplicating them, and removes events that are no
longer part of the schedule.

The Google side needs a one-time setup. Everything else is already in the
codebase.

---

## 1. Create a Google Cloud project

1. Open <https://console.cloud.google.com/> and create (or pick) a project.
2. Make sure the project has a **billing account** attached — the Calendar API
   works on the free tier, but a project without billing cannot enable APIs.
3. **APIs & Services → Library → search "Google Calendar API" → Enable.**

## 2. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen.**
2. User type:
   - **Internal** if your account is a Google Workspace/edu account and you
     only need it for yourself, or
   - **External** for anything else.
3. Fill in the required fields: app name, user support email, developer email.
4. **Add or remove scopes → add
   `https://www.googleapis.com/auth/calendar`.**
5. Save.

> `https://www.googleapis.com/auth/calendar` is a **sensitive** scope, so an
> *External* app that is not verified shows users a "Google hasn't verified
> this app" warning screen. That is fine for a private build. To remove the
> warning for everyone, complete
> [OAuth verification](https://support.google.com/cloud/answer/13463073) and
> publish the extension.

## 3. Create the OAuth client

1. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
2. Application type:
   - **Chrome Extension** (if the console offers it) — enter the extension ID
     in the field below; or
   - **Web application** — leave the redirect field empty for now.
3. Copy the **Client ID**. It looks like
   `123456789012-abcdefghijklmnop.apps.googleusercontent.com`.

### The extension ID

| Situation | Where to find it |
|---|---|
| Published in the Web Store | Chrome Web Store Dashboard → your listing → the item ID, or `chrome://extensions` |
| Local / unpacked build | `chrome://extensions` → the ID of your loaded extension |

The ID is stable for a published extension, which is why the OAuth client can
be committed to the repository.

### Redirect URI (only for the "Web application" client type)

Add this to the client's **Authorized redirect URIs**:

```
https://<extension-id>.chromiumapp.org/
```

(For a "Chrome Extension" client, the extension ID you entered is the redirect
target and no URI needs to be added.)

## 4. Paste the client ID into the manifest

`manifest.json` (and `manifest.firefox.json` for the Firefox build):

```json
"oauth2": {
  "client_id": "123456789012-abcdefghijklmnop.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/calendar"]
}
```

Replace `REPLACE-ME.apps.googleusercontent.com` with your real client ID.

The manifest already carries the other two requirements:

- `"identity"` in `permissions` (needed by `chrome.identity.getAuthToken`)
- `https://www.googleapis.com/*` in `host_permissions` (needed by the Calendar
  API calls)

## 5. Reload and publish

1. Reload the extension from `chrome://extensions`.
2. Open **Settings → Sync → Google Calendar** and press
   **Sync to Google Calendar**.
3. Chrome shows the Google consent screen the first time. After that the token
   is cached and re-syncing is silent.
4. Publish a new version to the Web Store. Adding the `identity` permission
   and a new host permission triggers another review round, and the client ID
   lives in the manifest, so users only get the feature after the update lands.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "This build has no Google OAuth client configured yet." | `oauth2.client_id` in the manifest still says `REPLACE-ME`. |
| `Google Calendar 403: Request had insufficient authentication scopes` | The token was issued for different scopes. Sign out of the Google account in Chrome, revoke the extension under `chrome://extensions`, then sync again. |
| `Google Calendar 404: Not Found` on the calendar | The `retop - <regno>` calendar was deleted manually. The next sync recreates it. |
| The consent screen says the app is unverified | Expected for an External app with a sensitive scope that has not completed OAuth verification. |
| Nothing happens when pressing the button | The consent tab may have opened behind the browser window. Check your other windows. |

## Local development

An unpacked extension gets a new ID on every reload unless the manifest pins
it. Add the public key of a generated key pair to `manifest.json` to keep the
ID stable, and use that same ID in the OAuth client:

```json
"key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
```
