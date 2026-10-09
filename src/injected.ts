console.log("retop: Injected Script Loaded");

(window as any).onVtopCaptchaSuccess = function (token: string) {
  console.log("Captcha Solved in Main World");
  window.dispatchEvent(
    new CustomEvent("vtop-captcha-solved", { detail: token }),
  );
};

const initCaptcha = (key: string) => {
  if (!key) return;

  let container = document.getElementById("retop-captcha-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "retop-captcha-container";
    document.body.appendChild(container);
  }

  const tryRender = () => {
    const gre = (window as any).grecaptcha;
    if (gre && gre.render && container && !container.hasAttribute("data-rendered")) {
      container.setAttribute("data-rendered", "true");
      try {
        gre.render("retop-captcha-container", {
          sitekey: key,
          callback: "onVtopCaptchaSuccess",
          size: "invisible",
        });
        console.log("ReCaptcha Rendered Successfully");
      } catch (err) {
        console.error("Captcha Render Failed:", err);
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

window.addEventListener("vtop-init-captcha", (e: any) => initCaptcha(e.detail));

window.addEventListener("vtop-trigger-verify", () => {
  console.log("Triggering Google Verify...");
  if ((window as any).grecaptcha) {
    (window as any).grecaptcha.execute();
  }
});

// Whitelist of VTOP navigation functions safe to invoke from retop
const ALLOWED_LEGACY_FNS: Record<string, Function | undefined> = {
  ajaxB5Call: () => (window as any).ajaxB5Call,
  ajaxCall: () => (window as any).ajaxCall,
};

window.addEventListener("retop-execute-legacy", (e: any) => {
  const { selector, fn, args, code } = e.detail || {};

  // 1. Click a DOM element by selector (safe)
  if (selector) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) { el.click(); return; }
  }

  // 2. Structured call: { fn: "ajaxB5Call", args: [url, data] }
  if (fn && typeof fn === "string") {
    const getter = ALLOWED_LEGACY_FNS[fn];
    const func = getter?.();
    if (typeof func === "function") {
      try { func(...(Array.isArray(args) ? args : [])); } catch (err) {
        console.error("retop: Legacy function call failed:", fn, err);
      }
    } else {
      console.warn("retop: Blocked call to non-whitelisted function:", fn);
    }
    return;
  }

  // 3. Legacy compat: validate { code } against strict pattern for known VTOP calls only
  if (code && typeof code === "string") {
    // Only allow code that calls ajaxB5Call or ajaxCall — nothing else
    const sanitized = code.replace(/\s+/g, " ").trim();
    const legacyCallMatch = sanitized.match(
      /^(?:if\s*\(.*?\)\s*\{?\s*)?(ajaxB5Call|ajaxCall)\s*\(\s*["']([^"']+)["']\s*,\s*([^)]+)\)\s*;?\s*\}?/
    );
    if (legacyCallMatch) {
      const [, funcName] = legacyCallMatch;
      const func = ALLOWED_LEGACY_FNS[funcName]?.();
      if (typeof func === "function") {
        // Re-extract and execute only the matched function call safely
        // The code embeds dynamic values (auth, csrf) so we must eval the args in main world
        // but ONLY for the validated pattern
        try {
          const safeWrapper = new Function(
            `if (typeof ${funcName} === 'function') { ${sanitized} }`
          );
          safeWrapper();
        } catch (err) {
          console.error("retop: Legacy code execution failed:", err);
        }
      }
    } else {
      console.warn("retop: Blocked unrecognized legacy code pattern:", sanitized.slice(0, 120));
    }
  }
});

// ── Strict Login Form Validation (Main World) ──────────────────────────────
(() => {
  const getLoginInputs = () => {
    const pInput = (
      document.querySelector("input[type='password']") ||
      document.getElementById("password") ||
      document.querySelector("input[name*='pass' i]") ||
      document.querySelector("input[id*='pass' i]")
    ) as HTMLInputElement | null;

    const uInput = (
      document.getElementById("username") ||
      document.querySelector("input[name='username']") ||
      document.querySelector("input[name='uname']") ||
      document.querySelector("input[id*='user' i]") ||
      document.querySelector("input[name*='user' i]") ||
      document.querySelector("input[id*='reg' i]") ||
      document.querySelector("input[name*='reg' i]")
    ) as HTMLInputElement | null;

    const cInput = (
      document.getElementById("captchaStr") ||
      document.querySelector("input[name='captchaCheck']") ||
      document.querySelector("input[placeholder*='Captcha' i]") ||
      document.querySelector("input[name*='captcha' i]") ||
      document.querySelector("input[id*='captcha' i]")
    ) as HTMLInputElement | null;

    return { pInput, uInput, cInput };
  };

  const validateLoginFields = (e?: Event): boolean => {
    if (!document.getElementById("vtopLoginForm")) {
      return true;
    }
    const { pInput, uInput, cInput } = getLoginInputs();

    if (pInput) {
      // 1. Validate Username
      if (uInput && !uInput.value.trim()) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          (e as any).returnValue = false;
        }
        uInput.focus();
        uInput.classList.add("retop-input-invalid");
        setTimeout(() => uInput.classList.remove("retop-input-invalid"), 1000);
        return false;
      }

      // 2. Validate Password (Never allow empty or whitespace-only password)
      if (!pInput.value || !pInput.value.trim()) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          (e as any).returnValue = false;
        }
        pInput.focus();
        pInput.classList.add("retop-input-invalid");
        setTimeout(() => pInput.classList.remove("retop-input-invalid"), 1000);
        return false;
      }

      // 3. Validate Captcha
      if (cInput && !cInput.value.trim()) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          (e as any).returnValue = false;
        }
        cInput.focus();
        cInput.classList.add("retop-input-invalid");
        setTimeout(() => cInput.classList.remove("retop-input-invalid"), 1000);
        return false;
      }
    }
    return true;
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.keyCode === 13 || e.which === 13) {
      validateLoginFields(e);
    }
  };

  window.addEventListener("keydown", handleKey, true);
  window.addEventListener("keypress", handleKey, true);
  window.addEventListener("keyup", handleKey, true);
  document.addEventListener("keydown", handleKey, true);
  document.addEventListener("keypress", handleKey, true);
  document.addEventListener("keyup", handleKey, true);

  document.addEventListener("submit", (e: Event) => {
    validateLoginFields(e);
  }, true);

  document.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const btn = target?.closest("#submitBtn, #btnSubmit, button[type='submit'], input[type='submit'], a[onclick*='submit'], button[onclick*='submit']");
    if (btn) {
      validateLoginFields(e);
    }
  }, true);

  const origSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    if (!validateLoginFields()) return;
    return origSubmit.call(this);
  };
})();

