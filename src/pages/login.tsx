import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createHiddenForm,
  injectScriptFile,
  initializeContainer,
  setUIVisibility,
} from "../utils/bridge";
import {
  User,
  Loader2,
  ShieldCheck,
  Monitor,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { applyTheme, AppSettings } from "../utils/settings-store";

export function renderLoginPage() {
  const csrfInput = document.querySelector<HTMLInputElement>(
    'input[name="_csrf"]',
  );
  const captchaDiv = document.querySelector(".g-recaptcha");
  const csrfToken = csrfInput?.value;
  const captchaKey = captchaDiv?.getAttribute("data-sitekey");

  if (!csrfToken) return;

  initializeContainer();
  const rootEl = document.getElementById("vtop-remastered-root");

  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<LoginPage />);

    setTimeout(() => {
      const container = document.getElementById(
        "vtop-remastered-captcha-container",
      );
      if (container && captchaKey)
        container.setAttribute("data-sitekey", captchaKey);

      injectScriptFile("dist/injected.js");
      setupLoginListeners(csrfToken);
    }, 500);
  }
}

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModernUI, setIsModernUI] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vtop-remastered-settings");
      if (saved) {
        const settings: AppSettings = JSON.parse(saved);
        applyTheme(settings);
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch (e) {
      console.error("Failed to load theme:", e);
    }
  }, []);

  useEffect(() => {
    setUIVisibility(isModernUI);
  }, [isModernUI]);

  useEffect(() => {
    const restoreHandler = () => setIsModernUI(true);
    window.addEventListener("vtop-restore-ui", restoreHandler);
    return () => window.removeEventListener("vtop-restore-ui", restoreHandler);
  }, []);

  useEffect(() => {
    const handleTrigger = () => setIsLoading(true);
    window.addEventListener("vtop-trigger-verify", handleTrigger);
    return () =>
      window.removeEventListener("vtop-trigger-verify", handleTrigger);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 font-mono relative overflow-hidden text-zinc-200">
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900 border-4 border-zinc-800 rounded-[2.5rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)] relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_var(--text-main)] mb-6 transform -rotate-3 hover:rotate-0 transition-all duration-300">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-expanded font-black text-zinc-200 mb-2 tracking-tight">
            VTOP
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
            Student Access Terminal
          </p>
        </div>

        <div className="space-y-6">
          <div className="group">
            <label className="block text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 pl-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                name="username"
                autoComplete="username"
                className="w-full bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-4 pl-12 text-zinc-200 text-lg font-bold focus:outline-none focus:border-blue-500 focus:shadow-[0px_0px_0px_4px_rgba(59,130,246,0.1)] transition-all duration-300 uppercase placeholder-zinc-600"
                placeholder="REG NO."
                id="vtop-user-input"
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 pl-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                className="w-full bg-zinc-950 border-4 border-zinc-800 rounded-2xl p-4 pl-12 pr-12 text-zinc-200 text-lg font-bold focus:outline-none focus:border-blue-500 focus:shadow-[0px_0px_0px_4px_rgba(59,130,246,0.1)] transition-all duration-300 placeholder-zinc-600"
                placeholder="••••••••"
                id="vtop-pass-input"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-blue-500 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            id="vtop-login-btn"
            className={`
              w-full font-expanded font-black text-xl py-4 rounded-2xl border-4 border-black 
              shadow-[6px_6px_0px_0px_var(--text-main)] flex justify-center items-center gap-3 mt-8 
              transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
              active:scale-95 active:shadow-none active:translate-x-1 active:translate-y-1
              ${
                isLoading
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-600"
                  : "bg-blue-500 text-white hover:bg-blue-400 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_var(--text-main)]"
              }
            `}
          >
            {isLoading && <Loader2 className="w-6 h-6 animate-spin" />}
            <span>{isLoading ? "VERIFYING..." : "INITIATE SESSION"}</span>
          </button>
        </div>

        <div
          id="vtop-remastered-captcha-container"
          className="mt-6 flex justify-center opacity-0 pointer-events-none h-0 overflow-hidden"
        ></div>

        <div className="mt-8 text-center flex items-center justify-center gap-2 text-zinc-500">
          <ShieldCheck className="w-3 h-3" />
          <p className="text-[10px] font-bold uppercase tracking-widest">
            Secure Connection • VTOP Remastered
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsModernUI(false)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-zinc-900 border-2 border-zinc-800 rounded-full text-zinc-500 hover:text-white hover:border-yellow-500 hover:bg-zinc-950 hover:shadow-[0px_0px_15px_rgba(250,204,21,0.2)] transition-all active:scale-95 group z-[100]"
      >
        <Monitor className="w-4 h-4 group-hover:text-yellow-500" />
        <span className="text-xs font-bold uppercase">Legacy UI</span>
      </button>
    </div>
  );
};

function setupLoginListeners(csrfToken: string) {
  const checkBtn = setInterval(() => {
    const btn = document.getElementById("vtop-login-btn");
    if (btn) {
      clearInterval(checkBtn);
      btn.addEventListener("click", () => {
        const userInput = document.getElementById(
          "vtop-user-input",
        ) as HTMLInputElement;
        const passInput = document.getElementById(
          "vtop-pass-input",
        ) as HTMLInputElement;

        const user = userInput?.value || "";
        const pass = passInput?.value || "";

        if (!user || !pass) {
          alert("Please enter credentials");
          return;
        }

        window.dispatchEvent(new Event("vtop-trigger-verify"));
        window.dispatchEvent(new Event("vtop-invoke-captcha"));
      });
    }
  }, 100);

  window.addEventListener("vtop-captcha-solved", ((e: CustomEvent) => {
    const userInput = document.getElementById(
      "vtop-user-input",
    ) as HTMLInputElement;
    const passInput = document.getElementById(
      "vtop-pass-input",
    ) as HTMLInputElement;

    const user = userInput?.value || "";
    const pass = passInput?.value || "";

    const form = createHiddenForm("/vtop/login", {
      _csrf: csrfToken,
      username: user,
      password: pass,
      gResponse: e.detail,
    });
    form?.submit();
  }) as EventListener);
}
