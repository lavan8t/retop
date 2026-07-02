console.log("retop: Injected Script Loaded");

// Inject recaptcha script if not present
if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
  console.log("retop: Injecting ReCaptcha script");
  const script = document.createElement("script");
  script.src = "https://www.google.com/recaptcha/api.js";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

(window as any).onVtopCaptchaSuccess = function (token: string) {
  console.log("Captcha Solved in Main World");
  window.dispatchEvent(
    new CustomEvent("vtop-captcha-solved", { detail: token }),
  );
};

let checkCaptcha: number;

const initCaptcha = (key: string) => {
  if (!key) return;

  let container = document.getElementById("retop-captcha-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "retop-captcha-container";
    document.body.appendChild(container);
  }

  checkCaptcha = setInterval(() => {
    if ((window as any).grecaptcha && (window as any).grecaptcha.render) {
      clearInterval(checkCaptcha);
      if (!container.hasAttribute("data-rendered")) {
        container.setAttribute("data-rendered", "true");
        try {
          (window as any).grecaptcha.render("retop-captcha-container", {
            sitekey: key,
            callback: "onVtopCaptchaSuccess",
            size: "invisible",
          });
          console.log("ReCaptcha Rendered Successfully");
        } catch (err) {
          console.error("Captcha Render Failed:", err);
        }
      }
    }
  }, 100);
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
