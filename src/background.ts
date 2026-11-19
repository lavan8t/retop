import { getExtUrl } from './utils/url';
import { set as idbSet } from 'idb-keyval';
import {
  isPdfContentType,
  type PlannedDownload,
} from './utils/courseDownloads';
import {
  GOOGLE_CALENDAR_SCOPE,
  syncICalToGoogleCalendar,
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
// It receives fully planned work and only calls fetch + chrome.downloads.
const runPlannedDownloads = async (plans: PlannedDownload[]) => {
  let downloaded = 0;
  let skipped = 0;
  for (const plan of plans) {
    try {
      const response = await fetch(plan.url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams(plan.body),
      });
      if (
        !response.ok ||
        !isPdfContentType(response.headers.get('Content-Type'))
      ) {
        skipped += 1;
        continue;
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      chrome.downloads.download(
        {
          url: blobUrl,
          filename: plan.filename,
          conflictAction: 'uniquify',
        },
        () => {
          if (chrome.runtime.lastError) URL.revokeObjectURL(blobUrl);
        },
      );
      downloaded += 1;
    } catch {
      skipped += 1;
    }
  }
  return { downloaded, skipped };
};

// Handle Google Drive sync and Portal-to-PWA data relay
const isBridgeSender = (sender: chrome.runtime.MessageSender): boolean => {
  const source = sender.origin || sender.url || '';
  return source.startsWith('https://getretop.web.app');
};

/**
 * Google access token for the Calendar API.
 *
 * Chrome caches the token, so the common path is a silent (non-interactive)
 * request. Only the first sync after install/revoke shows the consent screen.
 */
const getGoogleAccessToken = async (): Promise<string> => {
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

  try {
    const cached = await identity.getAuthToken({
      scopes: [GOOGLE_CALENDAR_SCOPE],
      interactive: false,
    });
    if (cached?.token) return cached.token;
  } catch {
    // No cached grant — fall through to the consent screen.
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
      { url: ['https://vtop.vit.ac.in/*', 'https://vtopcc.vit.ac.in/*'] },
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

const googleCalendarSyncHandler: MessageHandler = (
  message,
  _sender,
  sendResponse,
) => {
  (async () => {
    try {
      const token = await getGoogleAccessToken();
      const result = await syncICalToGoogleCalendar({
        token,
        ics: String(message.ics || ''),
        regNo: String(message.regNo || ''),
      });
      sendResponse({ success: true, ...result });
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || String(err) });
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
    // 1. Persist to IndexedDB
    idbSet('retop_last_sync_payload', payload).catch(() => {});
    idbSet('retop_last_sync_time', Date.now()).catch(() => {});

    // 2. Relay incoming payload updates to any active tab running the PWA
    const pwaUrlPatterns = ['https://getretop.web.app/*'];
    chrome.tabs.query({ url: pwaUrlPatterns }, (tabs) => {
      if (tabs && tabs.length > 0) {
        for (const tab of tabs) {
          if (tab.id !== undefined) {
            chrome.tabs
              .sendMessage(tab.id, {
                type: 'RETOP_PWA_SYNC_PAYLOAD',
                payload,
              })
              .catch(() => {});
          }
        }
      }
    });
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
      // Only retop-owned keys cross into the page; never dump everything.
      const data: Record<string, any> = {};
      for (const [key, value] of Object.entries(items || {})) {
        if (key.startsWith('retop_')) data[key] = value;
      }
      sendResponse({ success: true, data });
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
