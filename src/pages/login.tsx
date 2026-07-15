import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ProgressActivity,
  VerifiedUser,
  ArrowForward,
  Visibility,
  VisibilityOff,
  Autorenew,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import {
  createHiddenForm,
  initializeContainer,
  setUIVisibility,
  getAppRoot,
  injectScriptFile,
} from "../utils/bridge";
import { useSettings, applyTheme } from "../utils/settings-store";
import { autoSolveCaptcha } from "../utils/captchaSolver";
import { useAppStore } from "../store/appStore";
import { LegacyReturnButton } from "../components/LegacyReturnButton";

const triggerStudentSetup = async (csrf: string) => {
  try {
    await fetch("/vtop/prelogin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ _csrf: csrf, flag: "VTOP" }),
    });
  } catch (e) {
    console.error("retop: Auto-student setup failed", e);
  }
};

export function renderLoginPage() {
  const csrfInput = document.querySelector<HTMLInputElement>(
    'input[name="_csrf"]',
  );
  const csrfToken = csrfInput?.value;
  if (!csrfToken) return;

  const imgEl = document.querySelector<HTMLImageElement>("#captchaBlock img");
  const reCaptchaEl = document.querySelector(".g-recaptcha");

  let mode: "IMAGE" | "GOOGLE" | "NONE" = "NONE";

  if (imgEl && imgEl.offsetParent !== null) {
    mode = "IMAGE";
  } else if (reCaptchaEl) {
    mode = "GOOGLE";
  }

  initializeContainer();
  const rootEl = getAppRoot();

  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(
      <LoginPage
        csrfToken={csrfToken}
        initialCaptcha={imgEl?.src}
        initialMode={mode}
      />,
    );

    if (mode === "GOOGLE") {
      injectScriptFile("dist/injected.js");
    }
  }
}

const LoginPage = ({
  csrfToken,
  initialCaptcha,
  initialMode,
}: {
  csrfToken: string;
  initialCaptcha?: string;
  initialMode: "IMAGE" | "GOOGLE" | "NONE";
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [captchaSrc, setCaptchaSrc] = useState(initialCaptcha);
  const [showPassword, setShowPassword] = useState(false);

  const { isModernUI, setIsModernUI } = useAppStore();
  const { settings } = useSettings();

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });

  const [mode, setMode] = useState<"IMAGE" | "GOOGLE" | "NONE">(initialMode);
  const [siteKey, setSiteKey] = useState<string>("");
  const [errors, setErrors] = useState({
    username: false,
    password: false,
    captcha: false,
  });

  useEffect(() => {
    const initSession = async () => {
      await triggerStudentSetup(csrfToken);

      let currentMode = mode;

      // If we're on the open page, we must fetch the login page to discover the captcha mode
      if (window.location.pathname.includes("/vtop/open/page")) {
        try {
          const res = await fetch("/vtop/login");
          const html = await res.text();

          if (
            html.includes('class="g-recaptcha"') ||
            html.includes("data-sitekey")
          ) {
            currentMode = "GOOGLE";
            setMode("GOOGLE");

            // Extract sitekey
            const match = html.match(/data-sitekey="([^"]+)"/);
            if (match) {
              setSiteKey(match[1]);
              (window as any).__vtopCaptchaSitekey = match[1];
              window.dispatchEvent(
                new CustomEvent("vtop-init-captcha", { detail: match[1] }),
              );
            }

            // Inject injected.js for handling captcha
            if (!document.querySelector('script[src*="dist/injected.js"]')) {
              const s = document.createElement("script");
              s.src = chrome.runtime.getURL("dist/injected.js");
              document.head.appendChild(s);
            }
          } else {
            currentMode = "IMAGE";
            setMode("IMAGE");
          }
        } catch (e) {
          console.error("Failed to fetch login page for captcha mode", e);
        }
      } else if (currentMode === "GOOGLE") {
        // If we didn't fetch because we are on /vtop/login directly, we can read the sitekey from DOM
        const sk = document
          .querySelector(".g-recaptcha")
          ?.getAttribute("data-sitekey");
        if (sk) {
          (window as any).__vtopCaptchaSitekey = sk;
          window.dispatchEvent(
            new CustomEvent("vtop-init-captcha", { detail: sk }),
          );
        }
      }

      if (currentMode === "IMAGE") refreshCaptcha();
    };
    initSession();
  }, []); // Run only once to avoid infinite loops

  useEffect(() => {
    if (mode === "GOOGLE") {
      const handleSolved = (e: Event) => submitLogin((e as CustomEvent).detail);
      window.addEventListener("vtop-captcha-solved", handleSolved);
      return () =>
        window.removeEventListener("vtop-captcha-solved", handleSolved);
    }
  }, [mode]);

  useEffect(() => {
    const restoreHandler = () => setIsModernUI(true);
    window.addEventListener("vtop-restore-ui", restoreHandler);
    return () => window.removeEventListener("vtop-restore-ui", restoreHandler);
  }, []);

  useEffect(() => {
    setUIVisibility(isModernUI);
    sessionStorage.setItem("vtop-legacy-mode", (!isModernUI).toString());
  }, [isModernUI]);

  const refreshCaptcha = async () => {
    try {
      const res = await fetch(`/vtop/get/new/captcha?t=${Date.now()}`);
      const html = await res.text();
      const match = html.match(/src="([^"]+)"/);
      if (match) setCaptchaSrc(match[1]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submitLogin = async (gResponseToken?: string) => {
    const { username, password, captcha } = formData;
    if (!username || !password) return;

    if (window.location.pathname.includes("/vtop/open/page")) {
      setIsLoading(true);
      const payload = new URLSearchParams();
      payload.append("_csrf", csrfToken);
      payload.append("username", username);
      payload.append("password", password);

      if (mode === "GOOGLE" && gResponseToken)
        payload.append("gResponse", gResponseToken);
      else if (mode === "IMAGE" && captcha)
        payload.append("captchaStr", captcha);

      try {
        const res = await fetch("/vtop/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: payload,
        });

        const html = await res.text();
        const authMatch = html.match(
          /name="authorizedIDX" id="authorizedIDX" value="([^"]+)"/,
        );

        if (authMatch) {
          window.history.pushState({}, "", "/vtop/content");
          const evt = new CustomEvent("vtop-login-success", {
            detail: authMatch[1],
          });
          window.dispatchEvent(evt);
        } else {
          setIsLoading(false);
          setFormData((prev) => ({ ...prev, password: "", captcha: "" }));
          if (mode === "IMAGE") refreshCaptcha();
        }
      } catch (err) {
        setIsLoading(false);
        console.error(err);
      }
      return;
    }

    const payload: any = { _csrf: csrfToken, username, password };
    if (mode === "GOOGLE" && gResponseToken)
      payload["gResponse"] = gResponseToken;
    else if (mode === "IMAGE" && captcha) payload["captchaStr"] = captcha;
    createHiddenForm("/vtop/login", payload).submit();
  };

  const handleAuthorize = () => {
    const newErrors = {
      username: !formData.username,
      password: !formData.password,
      captcha: mode === "IMAGE" && !formData.captcha,
    };

    if (newErrors.username || newErrors.password || newErrors.captcha) {
      setErrors(newErrors);
      setTimeout(
        () => setErrors({ username: false, password: false, captcha: false }),
        400,
      );
      return;
    }

    setIsLoading(true);
    if (mode === "GOOGLE")
      window.dispatchEvent(new Event("vtop-trigger-verify"));
    else submitLogin();
  };

  const openOfflineMode = () => {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.getURL
    ) {
      window.open(chrome.runtime.getURL("dist/offline.html"), "_blank");
    }
  };

  return (
    <>
      <AnimatePresence>
        {isModernUI && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 min-h-screen flex items-center justify-center bg-black/40 backdrop-blur-md z-100 p-4 md:p-6 lg:p-8"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 35,
                stiffness: 300,
                mass: 0.8,
              }}
              className="w-full h-full flex overflow-hidden selection:bg-(--accent-base) selection:text-(--text-inverse) pointer-events-auto bg-(--bg-main) rounded-4xl gap-6"
            >
              <div className="hidden lg:flex w-full lg:w-[45%] xl:w-[40%] flex-col h-full relative z-30">
                <motion.div className="bg-(--bg-highlight) border-4 border-(--border-main) rounded-4xl flex flex-col justify-center items-center h-full w-full shrink-0 relative z-30 shadow-none overflow-hidden">
                  <div className="relative z-10 text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-(--accent-base) text-(--text-inverse) rounded-3xl border-4 border-(--border-main) flex items-center justify-center shadow-none mb-8">
                      <VerifiedUser className="w-12 h-12" />
                    </div>

                    <div className="text-[8rem] font-expanded font-black leading-none text-(--text-main) lowercase [text-shadow:6px_6px_0px_var(--shadow-main)]">
                      re.
                    </div>
                    <div className="bg-(--accent-base) text-(--text-inverse) inline-block px-8 py-3 border-4 border-(--border-main) rounded-4xl -rotate-2 shadow-none mt-4">
                      <span className="text-4xl font-expanded font-black uppercase italic">
                        top
                      </span>
                    </div>
                    <p className="mt-8 font-expanded font-bold text-(--text-muted) uppercase text-sm">
                      Student Portal
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="flex-1 h-full flex items-center justify-center lg:justify-start lg:pl-12">
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="w-full max-w-lg bg-(--bg-highlight) border-4 border-(--border-main) rounded-4xl p-8 shadow-none flex flex-col"
                >
                  <div className="mb-10">
                    <h2 className="text-4xl font-expanded font-black uppercase text-(--text-main) mb-3">
                      Access
                    </h2>
                    <div className="h-2 w-16 bg-(--accent-base) border-2 border-(--border-main) rounded-full shadow-none"></div>
                  </div>

                  <div className="space-y-6">
                    <motion.div
                      animate={
                        errors.username ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}
                      }
                      transition={{ duration: 0.4 }}
                      className="relative group"
                    >
                      <label className="absolute -top-3 left-4 bg-(--bg-surface) border-2 border-(--border-main) px-2 py-0.5 text-[10px] font-expanded font-black uppercase z-10 rounded-lg shadow-none text-(--text-main) group-focus-within:bg-(--accent-base) group-focus-within:text-(--text-inverse) transition-colors">
                        Identity
                      </label>
                      <input
                        type="text"
                        placeholder="REG NO."
                        value={formData.username}
                        onChange={(e) =>
                          handleInputChange("username", e.target.value)
                        }
                        className="w-full bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl p-4 pl-5 font-expanded font-black text-xl outline-none focus:shadow-[var(--brutal-shadow-hover)] focus:-translate-y-1 transition-all uppercase text-(--text-main) placeholder-(--text-muted)"
                      />
                    </motion.div>
                    <motion.div
                      animate={
                        errors.password ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}
                      }
                      transition={{ duration: 0.4 }}
                      className="relative group"
                    >
                      <label className="absolute -top-3 left-4 bg-(--bg-surface) border-2 border-(--border-main) px-2 py-0.5 text-[10px] font-expanded font-black uppercase z-10 rounded-lg shadow-none text-(--text-main) group-focus-within:bg-(--accent-base) group-focus-within:text-(--text-inverse) transition-colors">
                        Security
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className="w-full bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl p-4 pl-5 font-expanded font-black text-xl outline-none focus:shadow-[var(--brutal-shadow-hover)] focus:-translate-y-1 transition-all text-(--text-main) placeholder-(--text-muted) pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-(--text-muted) hover:text-(--text-main) transition-colors p-1 bg-(--bg-surface) rounded-lg border-2 border-transparent hover:border-(--border-dim)"
                      >
                        {showPassword ? (
                          <VisibilityOff className="w-5 h-5" />
                        ) : (
                          <Visibility className="w-5 h-5" />
                        )}
                      </button>
                    </motion.div>

                    {mode === "IMAGE" && (
                      <div className="flex gap-4">
                        <motion.div
                          animate={
                            errors.captcha
                              ? { x: [-10, 10, -8, 8, -5, 5, 0] }
                              : {}
                          }
                          transition={{ duration: 0.4 }}
                          className="relative group flex-1"
                        >
                          <label className="absolute -top-3 left-4 bg-(--bg-surface) border-2 border-(--border-main) px-2 py-0.5 text-[10px] font-expanded font-black uppercase z-10 rounded-lg shadow-none text-(--text-main) group-focus-within:bg-(--accent-base) group-focus-within:text-(--text-inverse) transition-colors">
                            Verification
                          </label>
                          <input
                            type="text"
                            placeholder="CAPTCHA"
                            value={formData.captcha}
                            onChange={(e) =>
                              handleInputChange("captcha", e.target.value)
                            }
                            className="w-full bg-(--bg-surface) border-4 border-(--border-main) rounded-2xl p-4 pl-5 font-expanded font-black text-xl outline-none uppercase focus:shadow-[var(--brutal-shadow-hover)] focus:-translate-y-1 transition-all text-(--text-main)"
                          />
                        </motion.div>
                        <div
                          className="w-30 bg-white border-4 border-(--border-main) rounded-2xl overflow-hidden shadow-none relative flex items-center justify-center shrink-0 group cursor-pointer active:translate-y-1 active:shadow-none transition-all"
                          onClick={refreshCaptcha}
                          title="Click to refresh captcha"
                        >
                          <img
                            src={captchaSrc}
                            className="w-full h-full object-contain"
                            alt="CAPTCHA"
                            crossOrigin="anonymous"
                            onLoad={async (e) => {
                              const val = await autoSolveCaptcha(
                                e.target as HTMLImageElement,
                              );
                              if (val) handleInputChange("captcha", val);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Autorenew className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleAuthorize}
                      disabled={isLoading}
                      className={`w-full border-4 border-(--border-main) rounded-2xl py-4 text-2xl font-expanded font-black uppercase flex items-center justify-center gap-3 transition-all duration-fast mt-2 ${isLoading ? "bg-(--bg-surface) text-(--text-muted) cursor-not-allowed" : "bg-(--accent-base) text-(--text-inverse) shadow-none hover:-translate-y-1 hover:shadow-[var(--brutal-shadow-xl)] active:translate-y-1 active:shadow-[var(--brutal-shadow-active)]"}`}
                    >
                      {isLoading ? (
                        <ProgressActivity className="animate-spin w-6 h-6" />
                      ) : (
                        <>
                          Authorize <ArrowForward className="w-6 h-6" />
                        </>
                      )}
                    </button>

                    <button
                      onClick={openOfflineMode}
                      className="w-full border-4 border-zinc-700 bg-zinc-800 rounded-2xl py-3 text-lg font-expanded font-black uppercase flex items-center justify-center gap-2 transition-all duration-fast text-zinc-300 hover:text-white hover:border-zinc-500 hover:-translate-y-1 hover:shadow-[var(--brutal-shadow-hover)] active:translate-y-0 active:shadow-[var(--brutal-shadow-active)] mt-4"
                    >
                      Access Offline Cache
                    </button>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setIsModernUI(false)}
                      className="text-[10px] font-expanded font-bold uppercase hover:text-(--accent-base) text-(--text-muted) transition-colors flex items-center gap-1 underline underline-offset-2"
                    >
                      Return to Legacy View
                    </button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isModernUI && (
          <LegacyReturnButton onClick={() => setIsModernUI(true)} />
        )}
      </AnimatePresence>
    </>
  );
};
