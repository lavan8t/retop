/**
 * Login takeover — deferred ESM entry loaded by src/content.ts.
 *
 * Runs after the bootstrapper already cancelled the native document and attached
 * the shadow root, so this file only has to style it and render the shared
 * VtopLoginCard. Same component the offline PWA and the standalone extension
 * page use: one validation implementation, one CAPTCHA solver, one login client.
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VtopLoginCard } from '../components/auth/VtopLoginCard';
import { AsciiPanel } from '../components/asciiArt';
import {
  initializeContainer,
  getAppRoot,
  adoptExtensionStyles,
  setUIVisibility,
  injectGlobalFonts,
} from '../utils/bridge';
import { applyTheme, useSettingsStore } from '../utils/settings-store';
import { getExtUrl } from '../utils/url';
import { installErrorNet } from '../utils/teardown';
import { setStorageData } from '../utils/storageAdapter';
import { getVtopBaseUrl } from '../utils/vtopClient';
import type { CachedUser } from '../utils/syncOrchestrator';
import type { VtopClient } from '../utils/vtopClient';

const GSF: React.CSSProperties = {
  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
};

const isChennaiHost = () => window.location.hostname.includes('vtopcc');
/** Page-level marker that turns retop off. Read by the document_start bootstrap. */
const DISABLED_KEY = 'retop_disabled';
/** sessionStorage markers read by src/content.ts on the next load. */
const BYPASS_KEY = 'retop-login-bypass';
const FORGOT_KEY = 'retop-forgot-intent';
// Campus locked by host: vtopcc = Chennai, vtop.vit.ac.in = Vellore. No switching.

/**
 * VTOP's reCAPTCHA cannot be solved for the user, so hand the whole login page
 * back to VTOP instead of leaving a form that can never submit.
 */
const useNativeLogin = () => {
  try {
    sessionStorage.setItem(BYPASS_KEY, '1');
  } catch {}
  window.location.assign('/vtop/login');
};

/**
 * Forgot password/username are POST-only handlers on VTOP's own login page, not
 * routes. Mark the intent, let the native page load, and content.ts clicks the
 * matching link there.
 */
const useNativeRecovery = (kind: 'password' | 'username') => {
  try {
    sessionStorage.setItem(FORGOT_KEY, kind);
    sessionStorage.setItem(BYPASS_KEY, '1');
  } catch {}
  window.location.assign('/vtop/login');
};

/**
 * Tenant mark in the corner. The VIT campus header now sits where the card
 * title used to be, so all that is left here is the retop wordmark — and a way
 * out: tapping it turns retop off and hands VTOP back to the student.
 */
const BrandHeader: React.FC = () => {
  const disableRetop = () => {
    // The page-level marker is what the document_start bootstrapper reads, so
    // the very next load is plain VTOP.
    try {
      localStorage.setItem(DISABLED_KEY, '1');
    } catch {}

    let reloaded = false;
    const reload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    try {
      // Wait for the background to store the switch before the page goes away.
      chrome.runtime.sendMessage({ action: 'SET_DISABLED' }, () => reload());
      chrome.runtime.sendMessage(
        { action: 'OPEN_DISABLE' },
        () => void chrome.runtime.lastError,
      );
    } catch {}

    setTimeout(reload, 800);
  };

  return (
    <button
      type="button"
      onClick={disableRetop}
      title="Turn retop off and use VTOP"
      className="fixed top-0 right-0 z-10 px-6 sm:px-10 py-3 select-none text-(--text-main) cursor-pointer bg-transparent border-0"
      style={{ ...GSF, opacity: 0.5 }}
    >
      <span
        className="lowercase"
        style={{
          fontSize: '1.5rem',
          lineHeight: 1,
          fontVariationSettings:
            '"wdth" 151, "wght" 700, "GRAD" 100, "ROND" 100, "slnt" -10',
        }}
      >
        re
      </span>
      <span
        className="lowercase"
        style={{
          fontSize: '1.5rem',
          lineHeight: 1,
          fontVariationSettings:
            '"wdth" 120, "wght" 700, "GRAD" 100, "ROND" 100, "slnt" -10',
        }}
      >
        top
      </span>
    </button>
  );
};

/** Bottom-left escape hatch: opens the extension's own offline app window. */
const OfflineLink: React.FC = () => {
  const openOffline = () => {
    const fallback = () => {
      try {
        window.open(getExtUrl('offline.html'), '_blank', 'noopener');
      } catch {
        window.open('https://getretop.web.app/', '_blank', 'noopener');
      }
    };

    let answered = false;
    const done = (ok: boolean) => {
      if (answered) return;
      answered = true;
      if (!ok) fallback();
    };

    try {
      chrome.runtime.sendMessage({ action: 'OPEN_OFFLINE' }, (res) => {
        done(!chrome.runtime.lastError && !!res?.success);
      });
    } catch {
      done(false);
    }

    // If the background never answers, still open the app window.
    setTimeout(() => done(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={openOffline}
      title="Open the offline retop app"
      className="fixed bottom-5 left-6 z-[99999] pointer-events-auto text-xs font-bold text-(--accent-base) hover:text-(--accent-hover) hover:underline underline-offset-4 transition-colors bg-transparent border-0 p-0 cursor-pointer"
      style={GSF}
    >
      No internet?
    </button>
  );
};

const SpotLightStrip: React.FC = () => {
  const [items, setItems] = useState<{ text: string; href: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    const base = getVtopBaseUrl(isChennaiHost() ? 'chennai' : 'vellore');

    // /vtop/get/spotlight 302s to the login page without a session, but
    // /vtop/open/page always renders the same announcements. Load that page
    // once the form fields are on screen, then scrape its download links.
    const load = async () => {
      try {
        const res = await fetch(`${base}/vtop/open/page`, {
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error(`open/page ${res.status}`);
        const doc = new DOMParser().parseFromString(
          await res.text(),
          'text/html',
        );
        const seen = new Set<string>();
        const found: { text: string; href: string }[] = [];
        doc
          .querySelectorAll(
            'a[onclick*="downloadSpotLightViewFile"], a[href*="downloadSpotLightViewFile"]',
          )
          .forEach((a) => {
            const raw =
              a.getAttribute('onclick') || a.getAttribute('href') || '';
            const id = raw.match(/downloadSpotLightViewFile\/(\d+)/)?.[1];
            if (!id || seen.has(id)) return;
            seen.add(id);
            found.push({
              text:
                a.querySelector('strong')?.textContent?.trim() ||
                a.textContent?.trim() ||
                'Announcement',
              href: `${base}/vtop/downloadSpotLightViewFile/${id}`,
            });
          });
        if (!cancelled)
          setItems(
            found.length
              ? found.slice(0, 6)
              : [{ text: 'No announcements', href: '#' }],
          );
      } catch {
        if (!cancelled)
          setItems([{ text: 'Spotlight unavailable', href: '#' }]);
      }
    };

    let tries = 0;
    const timer = setInterval(() => {
      if (getAppRoot()?.querySelector('input') || ++tries >= 50) {
        clearInterval(timer);
        load();
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="w-full px-4 sm:px-8 pb-20 lg:absolute lg:top-24 lg:right-12 lg:w-auto lg:max-w-xs lg:px-0 lg:pb-0 z-10 text-xs text-(--text-muted) space-y-2">
      <div
        className="text-(--text-main) uppercase mb-2 text-center text-base"
        style={{ fontVariationSettings: '"wght" 800, "wdth" 125' }}
      >
        Spotlight
      </div>
      <ul className="list-none m-0 p-0 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5 text-left">
            <span
              aria-hidden="true"
              className="shrink-0 leading-snug"
              style={{ fontVariationSettings: '"wght" 400, "wdth" 100' }}
            >
              •
            </span>
            <a
              href={item.href || '#'}
              className="hover:text-(--text-main) transition-colors leading-snug text-left flex-1"
              style={{ fontVariationSettings: '"wght" 400, "wdth" 100' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

const LoginTakeover: React.FC = () => {
  const handleLoginSuccess = async (user: CachedUser, client: VtopClient) => {
    const regNo = user.regNo || client.registrationNumber;
    const record = {
      retop_active_user: regNo,
      retop_lastAuthId: regNo,
      retop_last_campus: client.campus,
    };

    await setStorageData(record).catch(() => {});
    try {
      localStorage.setItem('retop_active_user', regNo);
      localStorage.setItem('retop_lastAuthId', regNo);
    } catch {}

    // After a successful login, return to the current page so the user doesn't
    // lose their place (e.g. timetable, attendance, grades). The session cookie
    // is already live on this same origin.
    const isLoginUrl = (url: string) =>
      [
        '/vtop/open/page',
        '/vtop/open/login',
        '/vtop/login',
        '/vtop/vtopLogin',
        '/vtop/prelogin',
        '/vtop/init/page',
      ].some((r) => url.includes(r));
    const currentUrl = window.location.href;
    const landing =
      currentUrl && !isLoginUrl(currentUrl)
        ? currentUrl
        : client.landingUrl || `${getVtopBaseUrl(client.campus)}/vtop/content`;
    window.location.assign(landing);
  };

  return (
    <div
      className="h-full w-full bg-(--bg-main) text-(--text-main) flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden overflow-x-hidden selection:bg-(--accent-base)/30 selection:text-(--text-main) relative"
      style={{
        ...GSF,
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
      }}
    >
      <BrandHeader />
      <OfflineLink />

      {/* ASCII art background: 80vw, centred at the bottom on small screens,
          full-width bottom-right on desktop. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex items-end justify-center lg:justify-end">
        <div className="w-[80vw] lg:w-full flex justify-center">
          <AsciiPanel
            campus={isChennaiHost() ? 'chennai' : 'vellore'}
            scale={1.3}
          />
        </div>
      </div>

      {/* Left half: form. Right half stays empty so the ASCII art fills it. */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center items-start px-4 pt-24 pb-16 sm:px-8 lg:px-16 min-h-screen">
        <div className="w-full max-w-md">
          <VtopLoginCard
            initialCampus={isChennaiHost() ? 'chennai' : 'vellore'}
            title={
              <span className="flex flex-col items-center gap-3">
                <img
                  src={getExtUrl('dist/assets/vitLogo.svg')}
                  alt="VIT"
                  style={{
                    height: '64px',
                    width: 'auto',
                    filter: 'invert(var(--vit-logo-invert))',
                  }}
                />
                <span
                  className="retop-campus-text"
                  style={{
                    fontFamily: "'Times New Roman', Times, serif",
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}
                >
                  {isChennaiHost() ? 'CHENNAI CAMPUS' : 'VELLORE CAMPUS'}
                </span>
              </span>
            }
            subtitle=""
            syncAfterLogin={false}
            onLoginSuccess={handleLoginSuccess}
            onRecaptchaRequired={useNativeLogin}
          />
        </div>
        <div className="retop-forgot-links flex gap-3 justify-start mt-4">
          <a
            href="/vtop/login"
            className="hover:text-(--text-main)"
            onClick={(e) => {
              e.preventDefault();
              useNativeRecovery('password');
            }}
          >
            Forgot Password?
          </a>
          <span className="text-(--text-muted)">|</span>
          <a
            href="/vtop/login"
            className="hover:text-(--text-main)"
            onClick={(e) => {
              e.preventDefault();
              useNativeRecovery('username');
            }}
          >
            Forgot Username?
          </a>
        </div>
      </div>

      {/* Spotlight: below the form on small screens, top-right on desktop. */}
      <SpotLightStrip />
    </div>
  );
};

class LoginErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.error('[retop] Login error caught by boundary:', err);
    try {
      sessionStorage.setItem('retop-login-bypass', '1');
    } catch {}
    window.location.reload();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export async function mountLoginTakeover(): Promise<void> {
  // Catch every uncaught error and unhandled rejection coming from the
  // extension, and hand VTOP back instead of leaving a half-built app on screen.
  installErrorNet();

  // Reuse the host and shadow root the bootstrapper already created, but skip
  // its <link> so both stylesheets can be installed before the first render.
  initializeContainer({ includeAppStylesheet: false });

  const rootEl = getAppRoot();
  if (!rootEl) {
    console.warn('[retop] Login takeover: shadow root unavailable');
    return;
  }

  // Paint the saved theme rather than the default. The dashboard entry does this
  // from IndexedDB; here the zustand persist store rehydrates from the same key.
  try {
    await useSettingsStore.persist.rehydrate();
    applyTheme(useSettingsStore.getState().settings);
  } catch (err) {
    console.warn('[retop] Login takeover: theme rehydrate failed:', err);
  }

  const shadow = rootEl.getRootNode() as ShadowRoot;
  // @font-face inside a shadow root's adopted stylesheet never loads: it does not
  // join the document's font set, so no woff2 is fetched and every rule falls back
  // to system-ui. The faces must be declared in the document head, which is what
  // the old injected login theme did via injectGlobalFonts().
  injectGlobalFonts();
  await adoptExtensionStyles(shadow, ['dist/style.css', 'dist/login.css']);

  // initializeContainer parks both host and root at pointer-events: none for the
  // dashboard case, where clicks must fall through to legacy VTOP. Here retop owns
  // the whole document, so hand the pointer events back.
  setUIVisibility(true);

  // Preserve the native VTOP page title instead of overwriting; retop works well.
  try {
    const originalTitle = document.title || 'VTOP';
    document.title = originalTitle.includes('VTOP')
      ? originalTitle
      : 'VTOP - ' + originalTitle;
  } catch {}

  createRoot(rootEl).render(
    <LoginErrorBoundary>
      <LoginTakeover />
    </LoginErrorBoundary>,
  );
}

mountLoginTakeover().catch((err) => {
  console.error('[retop] Login takeover mount failed:', err);
  // The bootstrapper already destroyed the native document, so un-mounting in
  // place would leave a blank page. Reload once with the bypass armed instead.
  try {
    sessionStorage.setItem('retop-login-bypass', '1');
  } catch {}
  window.location.reload();
});
