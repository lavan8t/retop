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
    const timer = setInterval(() => {
      if (tryRender()) clearInterval(timer);
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

window.addEventListener("retop-execute-legacy", (e: any) => {
  const { code, selector } = e.detail || {};
  if (selector) {
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
      el.click();
      return;
    }
  }
  if (code) {
    try {
      const fn = new Function(code);
      fn();
    } catch (err) {
      console.error("retop: Failed executing legacy action in main world:", err);
    }
  }
});

