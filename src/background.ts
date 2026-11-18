import { getExtUrl } from './utils/url';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  buildDownloadBody,
  isPdfContentType,
  isVtopDownloadUrl,
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

// Per-download folder names for bulk course materials, keyed by the blob URL
// created for each file. Avoids the global lastDownloadInfo race when many
// downloads land at once.
const plannedFilenames = new Map<string, string>();

if (typeof chrome !== 'undefined' && chrome.downloads?.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    const planned = plannedFilenames.get(item.url);
    if (planned !== undefined) {
      plannedFilenames.delete(item.url);
      suggest({ filename: planned });
      return;
    }

    // Only VTOP downloads get retop folders; other pages are left alone.
    if (!isVtopDownloadUrl(item.url) && !isVtopDownloadUrl(item.finalUrl)) {
      suggest();
      return;
    }

    idbGet('lastDownloadInfo')
      .then((res: any) => {
        const info = res as
          | {
              timestamp: number;
              type: string;
              semester?: string;
              course?: string;
              faculty?: string;
            }
          | undefined;

        const sanitize = (str?: string) =>
          (str || '')
            .replace(/[\/\\?%*:|"<>]/g, '_')
            .replace(/\s+/g, ' ')
            .trim();

        const rawFileName = item.filename
          ? item.filename.replace(/^.*[\\\/]/, '')
          : 'download.pdf';
        const itemFileName = sanitize(rawFileName) || 'download.pdf';

        if (
          info &&
          info.type === 'course_page' &&
          Date.now() - info.timestamp < 30000
        ) {
          const sem = sanitize(info.semester) || 'General';
          const course = sanitize(info.course) || 'General';
          const faculty = sanitize(info.faculty) || 'Faculty';
          suggest({
            filename: `retop/coursepage/${sem}/${course}/${faculty}/${itemFileName}`,
          });
          return;
        }

        suggest();
      })
      .catch(() => {
        suggest();
      });

    return true; // indicates async response
  });
}

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ── Bulk course-material downloads ──────────────────────────────────────
  if (message.action === 'DOWNLOAD_COURSE_MATERIALS') {
    const data = message.data || {};
    const url = String(data.url || '');
    const items = Array.isArray(data.items) ? data.items : [];
    if (!isVtopDownloadUrl(url) || items.length === 0) {
      sendResponse({ success: false, downloaded: 0, skipped: 0 });
      return true;
    }

    (async () => {
      let downloaded = 0;
      let skipped = 0;
      for (const item of items) {
        try {
          const body = buildDownloadBody(
            String(item.fileId || ''),
            String(data.csrf || ''),
            String(data.authorizedId || ''),
          );
          const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body,
          });
          if (
            !response.ok ||
            !isPdfContentType(response.headers.get('Content-Type'))
          ) {
            skipped += 1;
            continue;
          }
          const blobUrl = URL.createObjectURL(await response.blob());
          plannedFilenames.set(
            blobUrl,
            String(item.filename || 'download.pdf'),
          );
          chrome.downloads.download(
            {
              url: blobUrl,
              filename: String(item.filename || 'download.pdf'),
              conflictAction: 'uniquify',
            },
            () => {
              if (chrome.runtime.lastError) {
                plannedFilenames.delete(blobUrl);
                URL.revokeObjectURL(blobUrl);
              }
            },
          );
          downloaded += 1;
        } catch {
          skipped += 1;
        }
      }
      sendResponse({ success: true, downloaded, skipped });
    })();
    return true;
  }

  // ── Turn retop off / on ───────────────────────────────────────────────────
  if (message.action === 'SET_DISABLED') {
    chrome.storage.local.set({ retop_disabled: true }, () =>
      sendResponse({ success: true }),
    );
    return true;
  }

  if (message.action === 'IS_DISABLED') {
    chrome.storage.local.get(['retop_disabled'], (items) => {
      sendResponse({ success: true, disabled: !!items?.retop_disabled });
    });
    return true;
  }

  if (message.action === 'CLEAR_DISABLED') {
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
  }

  if (message.action === 'OPEN_DISABLE') {
    chrome.tabs.create({ url: 'https://getretop.web.app/disable' });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'OPEN_OFFLINE' || message.type === 'OPEN_OFFLINE') {
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
  }

  if (message.action === 'FETCH_BARCODE') {
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
  }

  if (message.action === 'GOOGLE_CALENDAR_SYNC') {
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
  }

  if (
    message.action === 'PORTAL_SCRAPED_DATA' ||
    message.type === 'PORTAL_SCRAPED_DATA'
  ) {
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
  }

  if (
    message.action === 'GET_ALL_SYNC_DATA' ||
    message.type === 'GET_ALL_SYNC_DATA'
  ) {
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
  }

  if (message.action === 'GET_STORAGE' || message.type === 'GET_STORAGE') {
    const keys = message.keys;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(keys || null, (items) => {
        sendResponse({ success: true, data: items || {} });
      });
    } else {
      sendResponse({ success: false, data: {} });
    }
    return true;
  }

  if (message.action === 'SET_STORAGE' || message.type === 'SET_STORAGE') {
    const data = message.data;
    if (data && typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set(data, () => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
});
