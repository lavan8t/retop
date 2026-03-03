import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import {
  createHiddenForm,
  initializeContainer,
  setUIVisibility,
  getAppRoot,
  injectScriptFile,
} from "../utils/bridge";
import { useSettings } from "../utils/settings-store";
import { LegacyReturnButton } from "../components/LegacyReturnButton";

const triggerStudentSetup = async (csrf: string) => {
  try {
    await fetch("/vtop/prelogin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ _csrf: csrf, flag: "VTOP" }),
    });
  } catch (e) {
    console.error("VTOP Remastered: Auto-student setup failed", e);
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
        mode={mode}
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
  mode,
}: {
  csrfToken: string;
  initialCaptcha?: string;
  mode: "IMAGE" | "GOOGLE" | "NONE";
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [captchaSrc, setCaptchaSrc] = useState(initialCaptcha);
  const [showPassword, setShowPassword] = useState(false);

  const [isModernUI, setIsModernUI] = useState(() => {
    return sessionStorage.getItem("vtop-legacy-mode") !== "true";
  });

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });

  useEffect(() => {
    const initSession = async () => {
      await triggerStudentSetup(csrfToken);
      if (mode === "IMAGE") refreshCaptcha();
    };
    initSession();

    if (mode === "GOOGLE") {
      const handleSolved = (e: CustomEvent) => submitLogin(e.detail);
      window.addEventListener(
        "vtop-captcha-solved",
        handleSolved as EventListener,
      );
      return () =>
        window.removeEventListener(
          "vtop-captcha-solved",
          handleSolved as EventListener,
        );
    }
  }, [csrfToken, mode]);

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

  const submitLogin = (gResponseToken?: string) => {
    const { username, password, captcha } = formData;
    if (!username || !password) return;
    const payload: any = { _csrf: csrfToken, username, password };
    if (mode === "GOOGLE" && gResponseToken)
      payload["gResponse"] = gResponseToken;
    else if (mode === "IMAGE" && captcha) payload["captchaCheck"] = captcha;
    createHiddenForm("/vtop/login", payload).submit();
  };

  const handleAuthorize = () => {
    if (!formData.username || !formData.password) return;
    setIsLoading(true);
    if (mode === "GOOGLE")
      window.dispatchEvent(new Event("vtop-invoke-captcha"));
    else submitLogin();
  };

  return (
    <>
      <AnimatePresence>
        {isModernUI && (
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
            className="fixed inset-0 min-h-screen flex overflow-hidden selection:bg-yellow-400 selection:text-black pointer-events-auto bg-(--bg-main) z-100"
          >
            <div className="hidden lg:flex w-[45%] bg-(--accent-base) border-r-[6px] border-(--border-main) flex-col justify-center p-12 relative">
              <div className="relative z-10">
                <div className="text-[10rem] font-expanded font-black leading-none text-white drop-shadow-[10px_10px_0px_var(--border-main)] lowercase">
                  re.
                </div>
                <div className="bg-yellow-400 text-black inline-block px-8 py-3 border-4 border-(--border-main) rounded-4xl -rotate-2 shadow-[8px_8px_0px_0px_var(--border-main)] mt-4">
                  <span className="text-4xl font-expanded font-black uppercase italic tracking-tighter">
                    retop
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-md bg-(--bg-surface) border-[5px] border-(--border-main) rounded-[3rem] p-8 shadow-[16px_16px_0px_0px_var(--border-main)]"
              >
                <div className="mb-10">
                  <h2 className="text-5xl font-expanded font-black lowercase tracking-tighter mb-2 italic">
                    re.
                  </h2>
                  <div className="h-3 w-24 bg-pink-500 border-2 border-(--border-main) rounded-full shadow-[4px_4px_0px_0px_var(--border-main)]"></div>
                </div>

                <div className="space-y-8">
                  <div className="relative">
                    <label className="absolute -top-4 left-6 bg-yellow-400 border-2 border-(--border-main) px-3 py-0.5 text-xs font-expanded font-black uppercase z-10 rounded-lg shadow-[3px_3px_0px_0px_var(--border-main)] text-black">
                      Identity
                    </label>
                    <input
                      type="text"
                      placeholder="REG NO."
                      value={formData.username}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                      className="w-full bg-(--bg-highlight) border-[3px] border-(--border-main) rounded-3xl p-4 pl-6 font-expanded font-black text-xl outline-none focus:bg-(--bg-surface) uppercase text-(--text-main) placeholder-(--text-muted)"
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-4 left-6 bg-pink-500 border-2 border-(--border-main) px-3 py-0.5 text-xs font-expanded font-black uppercase z-10 text-white rounded-lg shadow-[3px_3px_0px_0px_var(--border-main)]">
                      Access
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="w-full bg-(--bg-highlight) border-[3px] border-(--border-main) rounded-3xl p-4 pl-6 font-expanded font-black text-xl outline-none focus:bg-(--bg-surface) text-(--text-main) placeholder-(--text-muted)"
                    />
                  </div>

                  {mode === "IMAGE" && (
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="CAPTCHA"
                        value={formData.captcha}
                        onChange={(e) =>
                          handleInputChange("captcha", e.target.value)
                        }
                        className="flex-1 bg-(--bg-highlight) border-[3px] border-(--border-main) rounded-3xl p-4 font-expanded font-black text-xl outline-none uppercase"
                      />
                      <div className="w-32 h-20 bg-white border-[3px] border-(--border-main) rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_var(--border-main)]">
                        <img
                          src={captchaSrc}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleAuthorize}
                    disabled={isLoading}
                    className={`w-full border-[5px] border-(--border-main) rounded-4xl py-5 text-3xl font-expanded font-black uppercase tracking-tighter flex items-center justify-center gap-4 ${isLoading ? "bg-(--bg-highlight) text-(--text-muted)" : "bg-(--accent-base) text-white shadow-[8px_8px_0px_0px_var(--border-main)] active:translate-y-1 active:shadow-none"}`}
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        Authorize <ArrowRight />
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setIsModernUI(false)}
                  className="mt-8 text-xs font-expanded font-black uppercase underline text-(--text-muted)"
                >
                  Legacy View
                </button>
              </motion.div>
            </div>
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
