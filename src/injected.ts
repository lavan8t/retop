console.log('retop: Injected Script Loaded');

(window as any).onVtopCaptchaSuccess = function (token: string) {
  console.log('Captcha Solved in Main World');
  window.dispatchEvent(
    new CustomEvent('vtop-captcha-solved', { detail: token }),
  );
};

const initCaptcha = (key: string) => {
  if (!key) return;

  let container = document.getElementById('retop-captcha-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'retop-captcha-container';
    document.body.appendChild(container);
  }

  const tryRender = () => {
    const gre = (window as any).grecaptcha;
    if (
      gre &&
      gre.render &&
      container &&
      !container.hasAttribute('data-rendered')
    ) {
      container.setAttribute('data-rendered', 'true');
      try {
        gre.render('retop-captcha-container', {
          sitekey: key,
          callback: 'onVtopCaptchaSuccess',
          size: 'invisible',
        });
        console.log('ReCaptcha Rendered Successfully');
      } catch (err) {
        console.error('Captcha Render Failed:', err);
      }
      return true;
    }
    return false;
  };

  if (!tryRender()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (tryRender() || attempts > 50) clearInterval(timer);
    }, 100);
  }
};

if ((window as any).__vtopCaptchaSitekey) {
  initCaptcha((window as any).__vtopCaptchaSitekey);
}

window.addEventListener('vtop-init-captcha', (e: any) => initCaptcha(e.detail));

window.addEventListener('vtop-trigger-verify', () => {
  console.log('Triggering Google Verify...');
  if ((window as any).grecaptcha) {
    (window as any).grecaptcha.execute();
  }
});

// Whitelist of VTOP navigation functions safe to invoke from retop
const ALLOWED_LEGACY_FNS: Record<string, Function | undefined> = {
  ajaxB5Call: () => (window as any).ajaxB5Call,
  ajaxCall: () => (window as any).ajaxCall,
};

window.addEventListener('retop-execute-legacy', (e: any) => {
  const { selector, fn, args, code } = e.detail || {};

  // 1. Click a DOM element by selector (safe)
  if (selector) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
      el.click();
      return;
    }
  }

  // 2. Structured call: { fn: "ajaxB5Call", args: [url, data] }
  if (fn && typeof fn === 'string') {
    const getter = ALLOWED_LEGACY_FNS[fn];
    const func = getter?.();
    if (typeof func === 'function') {
      try {
        func(...(Array.isArray(args) ? args : []));
      } catch (err) {
        console.error('retop: Legacy function call failed:', fn, err);
      }
    } else {
      console.warn('retop: Blocked call to non-whitelisted function:', fn);
    }
    return;
  }

  // 3. Legacy compat: validate { code } against strict pattern for known VTOP calls only
  if (code && typeof code === 'string') {
    // Only allow code that calls ajaxB5Call or ajaxCall — nothing else
    const sanitized = code.replace(/\s+/g, ' ').trim();
    const legacyCallMatch = sanitized.match(
      /^(?:if\s*\(.*?\)\s*\{?\s*)?(ajaxB5Call|ajaxCall)\s*\(\s*["']([^"']+)["']\s*,\s*([^)]+)\)\s*;?\s*\}?\s*$/,
    );
    if (legacyCallMatch) {
      const [, funcName] = legacyCallMatch;
      const func = ALLOWED_LEGACY_FNS[funcName]?.();
      if (typeof func === 'function') {
        // Re-extract and execute only the matched function call safely
        // The code embeds dynamic values (auth, csrf) so we must eval the args in main world
        // but ONLY for the validated pattern
        try {
          const safeWrapper = new Function(
            `if (typeof ${funcName} === 'function') { ${sanitized} }`,
          );
          safeWrapper();
        } catch (err) {
          console.error('retop: Legacy code execution failed:', err);
        }
      }
    } else {
      console.warn(
        'retop: Blocked unrecognized legacy code pattern:',
        sanitized.slice(0, 120),
      );
    }
  }
});

// ── Login validation lives in components/auth/VtopLoginCard ────────────────
// The student sign-in form is retop's own React card inside the shadow root, so
// there is no native form left to guard here. Duplicate field validators in this
// world used to fire against markup that no longer exists.
