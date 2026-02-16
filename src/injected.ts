console.log("VTOP Remastered: Injected Script Loaded");

(window as any).onVtopCaptchaSuccess = function (token: string) {
  console.log("Captcha Solved in Main World");
  window.dispatchEvent(
    new CustomEvent("vtop-captcha-solved", { detail: token }),
  );
};

const checkCaptcha = setInterval(() => {
  const container = document.getElementById(
    "vtop-remastered-captcha-container",
  );
  const key = container?.getAttribute("data-sitekey");

  if (
    (window as any).grecaptcha &&
    (window as any).grecaptcha.render &&
    container &&
    key
  ) {
    clearInterval(checkCaptcha);
    try {
      (window as any).grecaptcha.render("vtop-remastered-captcha-container", {
        sitekey: key,
        callback: "onVtopCaptchaSuccess",
        size: "invisible",
      });
      console.log("ReCaptcha Rendered Successfully");
    } catch (e) {
      console.error("Captcha Render Failed:", e);
    }
  }
}, 100);

window.addEventListener("vtop-trigger-verify", () => {
  console.log("Triggering Google Verify...");
  (window as any).grecaptcha.execute();
});
