import { getExtUrl } from './utils/url';
import { entries as idbEntries, set as idbSet } from 'idb-keyval';
import { type PlannedDownload } from './utils/courseDownloads';
import {
  isPwaSyncKey,
  isTrustedPwaSyncSource,
  selectPwaSyncData,
} from './utils/pwaSyncAllowlist';
import {
  GCAL_ACCOUNT_KEY,
  GCAL_ENABLED_KEY,
  GCAL_HASH_KEY,
  GCAL_ID_MAP_KEY,
  GOOGLE_CALENDAR_SCOPE,
  syncDraftsToGoogleCalendar,
} from './utils/google-calendar';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open the web app as an onboarding screen on first install
    chrome.tabs.create({ url: 'https://getretop.web.app/?installed=true' });
  }
});

chrome.action.onClicked.addListener(() => {
  // No network: the toolbar is the app launcher. Open the offline page in its
  // own window so it behaves like an installed PWA.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    chrome.windows.create({
      url: chrome.runtime.getURL('offline.html'),
      type: 'popup',
      width: 1100,
      height: 820,
      focused: true,
    });
    return;
  }
  chrome.tabs.create({ url: 'https://vtop.vit.ac.in/vtop/' });
});

// ── Downloads: thin adapter over the deep course-download module ───────────
// It receives fully planned work and only hands each POST to chrome.downloads.
// Service workers cannot create blob URLs, so the download API posts directly.
const runPlannedDownloads = async (plans: PlannedDownload[]) => {
  let downloaded = 0;
  let skipped = 0;
  for (const plan of plans) {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.downloads.download(
          {
            url: plan.url,
            method: 'POST',
            headers: [
              {
                name: 'Content-Type',
                value: 'application/x-www-form-urlencoded',
              },
            ],
            body: plan.body,
            filename: plan.filename,
            conflictAction: 'uniquify',
          },
          () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          },
        );
      });
      downloaded += 1;
    } catch {
      skipped += 1;
    }
  }
  return { downloaded, skipped };
};

// Handle Google Drive sync and the pull-only Portal-to-PWA data relay.
const isBridgeSender = (sender: chrome.runtime.MessageSender): boolean => {
  const source =
    sender.origin && sender.origin !== 'null' ? sender.origin : sender.url;
  const ownExtensionUrl =
    typeof chrome !== 'undefined' ? chrome.runtime?.getURL?.('') : undefined;
  return isTrustedPwaSyncSource(source, ownExtensionUrl);
};

/**
 * Google access token for the Calendar API. The consent screen is only shown
 * by the explicit "Connect Google Account" action; syncing stays silent.
 */
const getGoogleAccessToken = async (interactive: boolean): Promise<string> => {
  const identity = chrome.identity;
  if (!identity?.getAuthToken) {
    throw new Error('Google sign-in is not available in this browser.');
  }

  const clientId = chrome.runtime.getManifest().oauth2?.client_id || '';
  if (!clientId || clientId.includes('REPLACE')) {
    throw new Error(
      'This build has no Google OAuth client configured yet. See GOOGLE_CALENDAR.md.',
    );
  }

  if (!interactive) {
    const cached = await identity.getAuthToken({
      scopes: [GOOGLE_CALENDAR_SCOPE],
      interactive: false,
    });
    if (!cached?.token) throw new Error('Connect Google Account to begin.');
    return cached.token;
  }

  // Focus a window first, otherwise Chrome can open the consent tab behind it.
  try {
    const windows = await chrome.windows.getAll();
    const first = windows?.find((w) => w.type === 'normal');
    if (first?.id !== undefined) {
      await chrome.windows.update(first.id, { focused: true });
    }
  } catch {
    // Focus is best-effort.
  }

  const granted = await identity.getAuthToken({
    scopes: [GOOGLE_CALENDAR_SCOPE],
    interactive: true,
  });
  if (!granted?.token)
    throw new Error('Google did not return an access token.');
  return granted.token;
};

const gcalStorageGet = (keys: string[]): Promise<Record<string, any>> =>
  new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => resolve(items || {}));
  });

const gcalStorageSet = (data: Record<string, any>): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError)
        reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });

type MessageHandler = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) => boolean | void;

// ── Focused message handlers ───────────────────────────────────────────────
const downloadHandler: MessageHandler = (message, _sender, sendResponse) => {
  const plans: PlannedDownload[] = Array.isArray(message.plans)
    ? message.plans
    : [];
  if (plans.length === 0) {
    sendResponse({ success: false, downloaded: 0, skipped: 0 });
    return true;
  }
  runPlannedDownloads(plans).then(
    (result) => sendResponse({ success: true, ...result }),
    () => sendResponse({ success: false, downloaded: 0, skipped: 0 }),
  );
  return true;
};

const setDisabledHandler: MessageHandler = (
  _message,
  _sender,
  sendResponse,
) => {
  chrome.storage.local.set({ retop_disabled: true }, () =>
    sendResponse({ success: true }),
  );
  return true;
};

const isDisabledHandler: MessageHandler = (_message, _sender, sendResponse) => {
  chrome.storage.local.get(['retop_disabled'], (items) => {
    sendResponse({ success: true, disabled: !!items?.retop_disabled });
  });
  return true;
};

const clearDisabledHandler: MessageHandler = (
  _message,
  _sender,
  sendResponse,
) => {
  chrome.storage.local.remove(['retop_disabled'], () => {
    // Tell open VTOP tabs to drop their page marker and come back to retop.
    chrome.tabs.query(
      {
        url: [
          'https://vtop.vit.ac.in/*',
          'https://vtopcc.vit.ac.in/*',
          'https://vtop.vitap.ac.in/*',
        ],
      },
      (tabs) => {
        (tabs || []).forEach((tab) => {
          if (tab.id !== undefined) {
            chrome.tabs
              .sendMessage(tab.id, { type: 'RETOP_REENABLED' })
              .catch(() => {});
          }
        });
      },
    );
    sendResponse({ success: true });
  });
  return true;
};

const openDisableHandler: MessageHandler = (
  _message,
  _sender,
  sendResponse,
) => {
  chrome.tabs.create({ url: 'https://getretop.web.app/disable' });
  sendResponse({ success: true });
  return true;
};

const openOfflineHandler: MessageHandler = (
  _message,
  _sender,
  sendResponse,
) => {
  const url = chrome.runtime.getURL('offline.html');
  const win = chrome.windows?.create
    ? chrome.windows.create({
        url,
        type: 'popup',
        width: 1100,
        height: 820,
        focused: true,
      })
    : null;
  if (!win) chrome.tabs.create({ url });
  sendResponse({ success: true });
  return true;
};

const fetchBarcodeHandler: MessageHandler = (
  message,
  _sender,
  sendResponse,
) => {
  // The digital ID card renders its barcode from the TEC-IT service. The page
  // origin cannot reach it, so the request goes through the worker, which
  // holds the host permission.
  const url = String(message.url || '');
  if (!url.startsWith('https://barcode.tec-it.com/')) {
    sendResponse({ error: 'not allowed' });
    return true;
  }
  fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`barcode ${res.status}`);
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      sendResponse({ base64: btoa(binary) });
    })
    .catch((err) => sendResponse({ error: String(err) }));
  return true;
};

const googleCalendarStatusHandler: MessageHandler = (
  _message,
  _sender,
  sendResponse,
) => {
  (async () => {
    try {
      const stored = await gcalStorageGet([GCAL_ACCOUNT_KEY, GCAL_ENABLED_KEY]);
      const account = String(stored[GCAL_ACCOUNT_KEY] || '');
      sendResponse({ success: true, connected: !!account, account });
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || String(err) });
    }
  })();
  return true;
};

// Mirrors retop-app's Google Sign-In launcher: an explicit user action asks for
// the calendar.events scope, and only a personal Google account is accepted.
const googleCalendarConnectHandler: MessageHandler = (
  _message,
  _sender,
  sendResponse,
) => {
  (async () => {
    try {
      const token = await getGoogleAccessToken(true);
      let email = '';
      try {
        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) email = String(((await res.json()) as any)?.email || '');
      } catch {
        // The token is still usable; the account label is cosmetic.
      }
      const domain = email.split('@')[1]?.toLowerCase() || '';
      if (
        domain === 'vit.ac.in' ||
        domain === 'vitstudent.ac.in' ||
        domain === 'vitap.ac.in' ||
        domain === 'vitbhopal.ac.in' ||
        domain.endsWith('.vit.ac.in') ||
        domain.endsWith('.vitstudent.ac.in') ||
        domain.endsWith('.vitap.ac.in') ||
        domain.endsWith('.vitbhopal.ac.in')
      ) {
        throw new Error(
          `VIT student email (${email}) is not allowed. Please select a personal Google account (@gmail.com).`,
        );
      }
      await gcalStorageSet({
        [GCAL_ACCOUNT_KEY]: email,
        [GCAL_ENABLED_KEY]: true,
      });
      sendResponse({ success: true, connected: true, account: email });
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || String(err) });
    }
  })();
  return true;
};

const googleCalendarSyncHandler: MessageHandler = (
  message,
  _sender,
  sendResponse,
) => {
  (async () => {
    try {
      const token = await getGoogleAccessToken(false);
      const stored = await gcalStorageGet([
        GCAL_ID_MAP_KEY,
        GCAL_HASH_KEY,
        GCAL_ACCOUNT_KEY,
        GCAL_ENABLED_KEY,
      ]);
      if (!stored[GCAL_ACCOUNT_KEY] || stored[GCAL_ENABLED_KEY] !== true)
        throw new Error('Connect Google Account to begin.');
      const drafts = Array.isArray(message.drafts) ? message.drafts : [];
      if (!drafts.length) throw new Error('Connect Google Account to begin.');
      const result = await syncDraftsToGoogleCalendar({
        token,
        drafts,
        idMap: stored[GCAL_ID_MAP_KEY] || {},
        storedHash: String(stored[GCAL_HASH_KEY] || ''),
      });
      await gcalStorageSet({
        [GCAL_ID_MAP_KEY]: result.idMap,
        [GCAL_HASH_KEY]: result.sourceHash,
      });
      sendResponse({ success: true, ...result });
    } catch (err: any) {
      sendResponse({ success: false, error: String(err?.message || err) });
    }
  })();
  return true;
};

const portalScrapedDataHandler: MessageHandler = (
  message,
  _sender,
  sendResponse,
) => {
  const payload = message.payload || message.data;
  if (payload) {
    // Persist only; the PWA hydrates by pulling, so there is no push relay.
    idbSet('retop_last_sync_payload', payload).catch(() => {});
    idbSet('retop_last_sync_time', Date.now()).catch(() => {});
  }
  sendResponse({ success: true });
  return true;
};

const getAllSyncDataHandler: MessageHandler = (
  _message,
  sender,
  sendResponse,
) => {
  if (!isBridgeSender(sender)) {
    sendResponse({ success: false, data: {} });
    return true;
  }
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(null, (items) => {
      void (async () => {
        // Settings also live in IDB-only storage; fill those gaps first.
        const all: Record<string, any> = { ...(items || {}) };
        try {
          for (const [key, value] of await idbEntries()) {
            const name = String(key);
            if (isPwaSyncKey(name) && all[name] === undefined)
              all[name] = value;
          }
        } catch {}
        sendResponse({ success: true, data: selectPwaSyncData(all) });
      })();
    });
  } else {
    sendResponse({ success: false, data: {} });
  }
  return true;
};

// M3E custom elements must be defined in the MAIN world (the isolated content
// script's `customElements` is null). Inject a standalone IIFE once per tab.
let m3eInjectWarned = false;
const warnM3eInject = (err: unknown) => {
  if (!m3eInjectWarned) {
    m3eInjectWarned = true;
    console.warn(
      '[retop] Could not register M3E components in the main world.',
      (err as any)?.message || err,
    );
  }
};

const injectM3eHandler: MessageHandler = (_message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  const scripting = (chrome as any).scripting;
  const hasPermission = (
    chrome.runtime.getManifest().permissions || []
  ).includes('scripting');
  if (tabId === undefined || !scripting?.executeScript || !hasPermission) {
    sendResponse({ success: false, error: 'M3E injection unavailable' });
    return true;
  }

  (async () => {
    try {
      // Idempotency: skip the download/eval entirely if the flag is already set.
      const [probe] = await scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => !!window.__retopM3eRegistered,
      });
      if (probe?.result) {
        sendResponse({ success: true, alreadyRegistered: true });
        return;
      }
      await scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        files: ['m3e-inject.js'],
      });
      sendResponse({ success: true });
    } catch (err: any) {
      // Firefox may reject `world: 'MAIN'`; degrade to plain HTML controls.
      warnM3eInject(err);
      sendResponse({ success: false, error: err?.message || String(err) });
    }
  })();
  return true;
};

const getStorageHandler: MessageHandler = (message, _sender, sendResponse) => {
  const keys = message.keys;
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(keys || null, (items) => {
      sendResponse({ success: true, data: items || {} });
    });
  } else {
    sendResponse({ success: false, data: {} });
  }
  return true;
};

const setStorageHandler: MessageHandler = (message, _sender, sendResponse) => {
  const data = message.data;
  if (data && typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set(data, () => {
      sendResponse({ success: true });
    });
  } else {
    sendResponse({ success: false });
  }
  return true;
};

// Thin dispatch adapter: each action group registers its handler once.
// Downloads are the first focused module; the remaining one-off actions keep
// their original payloads and behaviour.
const handlers = new Map<string, MessageHandler>();
const register = (actions: string[], handler: MessageHandler) => {
  for (const action of actions) handlers.set(action, handler);
};

register(['DOWNLOAD_COURSE_MATERIALS'], downloadHandler);
register(['SET_DISABLED'], setDisabledHandler);
register(['IS_DISABLED'], isDisabledHandler);
register(['CLEAR_DISABLED'], clearDisabledHandler);
register(['OPEN_DISABLE'], openDisableHandler);
register(['OPEN_OFFLINE'], openOfflineHandler);
register(['FETCH_BARCODE'], fetchBarcodeHandler);
register(['GOOGLE_CALENDAR_STATUS'], googleCalendarStatusHandler);
register(['GOOGLE_CALENDAR_CONNECT'], googleCalendarConnectHandler);
register(['GOOGLE_CALENDAR_SYNC'], googleCalendarSyncHandler);
register(['PORTAL_SCRAPED_DATA'], portalScrapedDataHandler);
register(['GET_ALL_SYNC_DATA'], getAllSyncDataHandler);
register(['GET_STORAGE'], getStorageHandler);
register(['SET_STORAGE'], setStorageHandler);
register(['INJECT_M3E'], injectM3eHandler);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = handlers.get(message.action) || handlers.get(message.type);
  return handler ? handler(message, sender, sendResponse) : undefined;
});
