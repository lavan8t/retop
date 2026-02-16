import { renderDashboard } from "./pages/dashboard";
import { renderLandingPage } from "./pages/landing";
import { renderLoginPage } from "./pages/login";
import {
  injectGlobalStyles,
  initializeContainer,
  injectSplashScreen,
  removeSplashScreen,
} from "./utils/bridge";

injectGlobalStyles();

const vtopContext = {
  csrf: "",
  authId: "",
};

const init = async () => {
  console.log("[VTOP Remastered] Initializing...");

  injectSplashScreen();
  await waitForTokens();
  initializeContainer();

  const hasCaptcha = !!document.querySelector(".g-recaptcha");

  if (vtopContext.authId && vtopContext.csrf) {
    console.log("[VTOP Remastered] Session Active.");
    renderDashboard();
  } else if (hasCaptcha && vtopContext.csrf) {
    console.log("[VTOP Remastered] Login Page Detected.");
    removeSplashScreen();
    renderLoginPage();
  } else if (vtopContext.csrf) {
    console.log("[VTOP Remastered] Landing Page Detected.");
    removeSplashScreen();
    renderLandingPage();
  } else {
    console.warn("[VTOP Remastered] Unknown State. Rendering Landing.");
    removeSplashScreen();
    renderLandingPage();
  }
};

function waitForTokens(): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
      attempts++;
      const csrfInput = document.querySelector(
        'input[name="_csrf"]',
      ) as HTMLInputElement;
      const authInput = document.getElementById(
        "authorizedIDX",
      ) as HTMLInputElement;

      if (csrfInput) vtopContext.csrf = csrfInput.value;
      if (authInput) vtopContext.authId = authInput.value;

      if (vtopContext.csrf || attempts >= maxAttempts) {
        clearInterval(interval);
        resolve(!!vtopContext.csrf);
      }
    }, 100);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
