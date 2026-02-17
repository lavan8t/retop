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
import { applyTheme } from "../utils/settings-store";

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
  const [isModernUI, setIsModernUI] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    captcha: "",
  });

  useEffect(() => {
    const initSession = async () => {
      await triggerStudentSetup(csrfToken);

      if (mode === "IMAGE") {
        refreshCaptcha();
      }
    };

    initSession();

    if (mode === "GOOGLE") {
      const handleSolved = (e: CustomEvent) => {
        submitLogin(e.detail);
      };
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
    const saved = localStorage.getItem("vtop-remastered-settings");
    if (saved) applyTheme(JSON.parse(saved));
  }, []);

  useEffect(() => {
    setUIVisibility(isModernUI);
  }, [isModernUI]);

  const refreshCaptcha = async () => {
    try {
      const res = await fetch(`/vtop/get/new/captcha?t=${Date.now()}`);
      const html = await res.text();
      const match = html.match(/src="([^"]+)"/);
      if (match) setCaptchaSrc(match[1]);
    } catch (e) {
      console.error("Failed to refresh captcha:", e);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submitLogin = (gResponseToken?: string) => {
    const { username, password, captcha } = formData;
    if (!username || !password) return;

    const payload: any = {
      _csrf: csrfToken,
      username: username,
      password: password,
    };

    if (mode === "GOOGLE") {
      if (gResponseToken) payload["gResponse"] = gResponseToken;
    } else if (mode === "IMAGE") {
      if (!captcha) return;
      payload["captchaCheck"] = captcha;
    }

    createHiddenForm("/vtop/login", payload).submit();
  };

  const handleAuthorize = () => {
    const { username, password, captcha } = formData;

    if (!username || !password) return;
    if (mode === "IMAGE" && !captcha) return;

    setIsLoading(true);

    if (mode === "GOOGLE") {
      window.dispatchEvent(new Event("vtop-invoke-captcha"));
    } else {
      submitLogin();
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-zinc-950 text-black dark:text-white overflow-hidden selection:bg-yellow-400 selection:text-black">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex w-[45%] bg-blue-500 border-r-[6px] border-black flex-col justify-center p-12 relative">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="relative z-10"
        >
          <div className="text-[10rem] font-expanded font-black leading-none text-white drop-shadow-[10px_10px_0px_#000]">
            re.
          </div>
          <div className="bg-yellow-400 text-black inline-block px-8 py-3 border-4 border-black rounded-4xl -rotate-2 shadow-[8px_8px_0px_0px_#000] mt-4">
            <span className="text-4xl font-expanded font-black uppercase italic tracking-tighter">
              retop
            </span>
          </div>
          <p className="mt-10 text-2xl font-expanded font-bold leading-[1.1] max-w-sm text-white/95 uppercase italic">
            Direct access to your academic terminal.
          </p>
        </motion.div>
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #000 2px, transparent 2px)",
            backgroundSize: "30px 30px",
          }}
        ></div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex-1 flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md bg-white dark:bg-zinc-950 border-[5px] border-black rounded-[3rem] p-8 shadow-[16px_16px_0px_0px_#000]"
        >
          <div className="mb-10">
            <h2 className="text-5xl font-expanded font-black uppercase tracking-tighter mb-2 italic">
              Terminal
            </h2>
            <div className="h-3 w-32 bg-pink-500 border-2 border-black rounded-full shadow-[4px_4px_0px_0px_#000]"></div>
          </div>

          <div className="space-y-8">
            <div className="relative">
              <label className="absolute -top-4 left-6 bg-yellow-400 border-2 border-black px-3 py-0.5 text-xs font-expanded font-black uppercase z-10 rounded-lg shadow-[3px_3px_0px_0px_#000]">
                Identity
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="REG NO."
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-[3px] border-black rounded-3xl p-4 pl-6 font-expanded font-black text-xl outline-none focus:bg-white dark:focus:bg-black transition-all uppercase placeholder-zinc-400"
                />
                <User className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-black dark:text-white" />
              </div>
            </div>

            <div className="relative">
              <label className="absolute -top-4 left-6 bg-pink-500 border-2 border-black px-3 py-0.5 text-xs font-expanded font-black uppercase z-10 text-white rounded-lg shadow-[3px_3px_0px_0px_#000]">
                Access
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-[3px] border-black rounded-3xl p-4 pl-6 font-expanded font-black text-xl outline-none focus:bg-white dark:focus:bg-black transition-all placeholder-zinc-400"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-black dark:text-white hover:scale-110 transition-transform"
                >
                  {showPassword ? (
                    <EyeOff className="w-6 h-6" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* ONLY SHOW CAPTCHA IF MODE IS IMAGE */}
            {mode === "IMAGE" && (
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <label className="absolute -top-4 left-6 bg-lime-400 border-2 border-black px-3 py-0.5 text-xs font-expanded font-black uppercase z-10 rounded-lg shadow-[3px_3px_0px_0px_#000]">
                    Captcha
                  </label>
                  <input
                    type="text"
                    placeholder="CODE"
                    value={formData.captcha}
                    onChange={(e) =>
                      handleInputChange("captcha", e.target.value)
                    }
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-[3px] border-black rounded-3xl p-4 pl-6 font-expanded font-black text-xl outline-none focus:bg-white uppercase"
                  />
                </div>
                <div className="w-36 h-20 border-[3px] border-black rounded-3xl overflow-hidden relative bg-white group shadow-[6px_6px_0px_0px_#000]">
                  {captchaSrc && (
                    <img
                      src={captchaSrc}
                      alt="captcha"
                      className="w-full h-full object-contain p-2"
                    />
                  )}
                  <button
                    onClick={refreshCaptcha}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <RefreshCw className="text-white w-8 h-8" />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleAuthorize}
              disabled={isLoading}
              className={`
                w-full border-[5px] border-black rounded-4xl py-5 text-3xl font-expanded font-black uppercase tracking-tighter
                flex items-center justify-center gap-4 transition-all relative
                ${
                  isLoading
                    ? "bg-zinc-400 cursor-not-allowed text-zinc-700 shadow-none"
                    : "bg-blue-500 hover:bg-blue-400 text-white shadow-[8px_8px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none"
                }
              `}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loader"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="w-8 h-8" />
                  </motion.div>
                ) : (
                  <>
                    <span>Authorize</span>
                    <ArrowRight className="w-8 h-8" />
                  </>
                )}
              </AnimatePresence>
            </button>
          </div>

          <div className="mt-10 flex items-center justify-between border-t-[3px] border-black pt-6">
            <button
              onClick={() => setIsModernUI(false)}
              className="bg-black text-white px-6 py-2 font-expanded font-black uppercase text-xs rounded-xl shadow-[4px_4px_0px_0px_#666] hover:bg-zinc-800 transition-all active:translate-y-1 active:shadow-none"
            >
              Legacy View
            </button>
            <div className="flex items-center gap-2 text-zinc-500 font-expanded font-black uppercase text-[10px] tracking-widest">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Secure retop Session</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
