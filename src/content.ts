import { renderDashboard } from "./pages/app";
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

  if (vtopContext.authId && vtopContext.csrf) {
    console.log("[VTOP Remastered] Session Active.");
    renderDashboard();
  } else if (vtopContext.csrf) {
    console.log("[VTOP Remastered] Directing to Login.");
    removeSplashScreen();
    renderLoginPage();
  } else {
    console.warn("[VTOP Remastered] Unknown State. Forcing Login Attempt.");
    removeSplashScreen();
    renderLoginPage();
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
