import React, { useState, useEffect, useRef } from "react";
import {
  Refresh,
  Visibility,
  VisibilityOff,
  Sync,
} from "@nine-thirty-five/material-symbols-react/rounded/700/filled";
import { VtopClient, VtopCampus, CaptchaData } from "../../utils/vtopClient";
import {
  syncStudentData,
  CachedUser,
  SyncProgress,
} from "../../utils/syncOrchestrator";

export interface VtopLoginCardProps {
  initialCampus?: VtopCampus;
  onLoginSuccess: (user: CachedUser, client: VtopClient) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export const VtopLoginCard: React.FC<VtopLoginCardProps> = ({
  initialCampus = "vellore",
  onLoginSuccess,
  onCancel,
  title = "retop",
  subtitle = "vtop login",
}) => {
  const [campus, setCampus] = useState<VtopCampus>(initialCampus);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState("");

  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [usernameWiggle, setUsernameWiggle] = useState(false);
  const [passwordWiggle, setPasswordWiggle] = useState(false);
  const [captchaWiggle, setCaptchaWiggle] = useState(false);
  const [isTitleHovered, setIsTitleHovered] = useState(false);

  // Request sequencing to guarantee only the latest captcha response updates state
  const activeSeqRef = useRef<number>(0);
  const hasMountedRef = useRef<boolean>(false);

  // Fetch initial session & captcha
  const fetchInitialCaptcha = async (targetCampus: VtopCampus) => {
    const seq = ++activeSeqRef.current;
    setLoadingCaptcha(true);
    setErrorMessage("");

    try {
      const data = await VtopClient.getCaptcha(targetCampus);
      if (seq !== activeSeqRef.current) return;
      setCaptchaData(data);
      setCaptchaInput("");
    } catch (err: any) {
      if (seq !== activeSeqRef.current) return;
      console.error("[VtopLoginCard] Failed to fetch captcha:", err);
      setErrorMessage(
        err?.message || "Failed to load CAPTCHA from VTOP. Please retry.",
      );
    } finally {
      if (seq === activeSeqRef.current) {
        setLoadingCaptcha(false);
      }
    }
  };

  // Refresh captcha for the existing session (does not reset session tokens)
  const handleRefreshCaptcha = async () => {
    if (loadingCaptcha || isSubmitting) return;

    if (captchaData?.jsessionid) {
      const seq = ++activeSeqRef.current;
      setLoadingCaptcha(true);
      setErrorMessage("");

      try {
        const refreshed = await VtopClient.refreshCaptcha(
          campus,
          captchaData.jsessionid,
          captchaData.serverId,
          captchaData.csrf,
        );
        if (seq !== activeSeqRef.current) return;
        setCaptchaData({
          captchaImage: refreshed.captchaImage,
          csrf: refreshed.csrf,
          jsessionid: refreshed.jsessionid,
          serverId: refreshed.serverId,
        });
        setCaptchaInput("");
      } catch (e) {
        // Fallback to full initial handshake if session expired
        fetchInitialCaptcha(campus);
      } finally {
        if (seq === activeSeqRef.current) {
          setLoadingCaptcha(false);
        }
      }
    } else {
      fetchInitialCaptcha(campus);
    }
  };

  // Only run once on mount or when campus pill changes
  useEffect(() => {
    fetchInitialCaptcha(campus);
  }, [campus]);

  const handleCampusChange = (newCampus: VtopCampus) => {
    if (newCampus === campus || isSubmitting) return;
    setCampus(newCampus);
    setCaptchaData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || loadingCaptcha) return;

    const trimmedUser = username.trim().toUpperCase();
    const trimmedPass = password;
    const trimmedCaptcha = captchaInput.trim().toUpperCase();

    if (!trimmedUser) {
      setUsernameWiggle(true);
      setTimeout(() => setUsernameWiggle(false), 400);
      setErrorMessage("Enter your registration number");
      return;
    }
    if (!trimmedPass) {
      setPasswordWiggle(true);
      setTimeout(() => setPasswordWiggle(false), 400);
      setErrorMessage("Enter your password");
      return;
    }
    if (trimmedCaptcha.length !== 6) {
      setCaptchaWiggle(true);
      setTimeout(() => setCaptchaWiggle(false), 400);
      setErrorMessage("Captcha must be 6 characters");
      return;
    }
    if (!captchaData) {
      setErrorMessage("Captcha session not ready. Refreshing...");
      fetchInitialCaptcha(campus);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSyncProgress(null);

    // Push login strictly with the current active captchaData
    const activeCaptcha = captchaData;

    try {
      const result = await VtopClient.login({
        campus,
        username: trimmedUser,
        password: trimmedPass,
        captcha: trimmedCaptcha,
        csrf: activeCaptcha.csrf,
        jsessionid: activeCaptcha.jsessionid,
        serverId: activeCaptcha.serverId,
      });

      if (!result.success || !result.client) {
        setCaptchaWiggle(true);
        setTimeout(() => setCaptchaWiggle(false), 400);
        setErrorMessage(
          result.message || "Invalid credentials or CAPTCHA mismatch",
        );
        setIsSubmitting(false);
        // Refresh captcha for next attempt
        handleRefreshCaptcha();
        return;
      }

      // Synchronize student data
      setSyncProgress({
        step: "Authenticating session...",
        progressPercent: 10,
      });

      const syncResult = await syncStudentData(result.client, (progress) => {
        setSyncProgress(progress);
      });

      onLoginSuccess(syncResult.user, result.client);
    } catch (err: any) {
      console.error("[VtopLoginCard] Login error:", err);
      setErrorMessage(
        err?.message || "Login failed. Check your network connection.",
      );
      setIsSubmitting(false);
      handleRefreshCaptcha();
    }
  };

  return (
    <div id="loginBox" className="w-full max-w-md mx-auto select-none">
      {/* Card Header matching login-theme.css */}
      <div className="card-header loginBoxBorder mb-4 text-left">
        <h4
          style={{
            fontFamily: "'Google Sans Flex', system-ui, sans-serif",
            fontVariationSettings: isTitleHovered
              ? '"wdth" 151, "wght" 1, "GRAD" 100, "ROND" 100, "slnt" -10'
              : '"wdth" 151, "wght" 800, "GRAD" 100, "ROND" 100, "slnt" -10',
            transition:
              "font-variation-settings 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            cursor: "default",
          }}
          onMouseEnter={() => setIsTitleHovered(true)}
          onMouseLeave={() => setIsTitleHovered(false)}
        >
          {title}
        </h4>
        <p id="retop-welcome-text">{subtitle}</p>
      </div>

      {/* Campus Selector Pills */}
      <div className="flex p-1 bg-(--bg-card) border border-(--border-main) rounded-full mb-6 max-w-70">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleCampusChange("vellore")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
            campus === "vellore"
              ? "bg-(--accent-base) text-white shadow-sm"
              : "text-(--text-muted) hover:text-(--text-main)"
          }`}
          style={{
            fontFamily: "'Google Sans Flex', system-ui, sans-serif",
          }}
        >
          VIT Vellore
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleCampusChange("chennai")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
            campus === "chennai"
              ? "bg-(--accent-base) text-white shadow-sm"
              : "text-(--text-muted) hover:text-(--text-main)"
          }`}
          style={{
            fontFamily: "'Google Sans Flex', system-ui, sans-serif",
          }}
        >
          VIT Chennai
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Input Group with Native Floating Label */}
        <div className={`input-group ${usernameWiggle ? "retop-wiggle" : ""}`}>
          <input
            type="text"
            id="username"
            className="form-control"
            placeholder=" "
            required
            disabled={isSubmitting}
            autoCapitalize="characters"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toUpperCase())}
          />
          <label htmlFor="username" className="retop-floating-label">
            Registration Number
          </label>
        </div>

        {/* Password Input Group with Native Floating Label & Visibility Toggle */}
        <div className={`input-group ${passwordWiggle ? "retop-wiggle" : ""}`}>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            className="form-control"
            placeholder=" "
            required
            disabled={isSubmitting}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label htmlFor="password" className="retop-floating-label">
            Password
          </label>
          <button
            type="button"
            id="passwordIcon"
            className="btn btn-light"
            onClick={() => setShowPassword((s) => !s)}
            tabIndex={-1}
          >
            {showPassword ? (
              <VisibilityOff className="w-5 h-5" />
            ) : (
              <Visibility className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* CAPTCHA Container Matching login-theme.css #retop-captcha-container */}
        <div
          id="retop-captcha-container"
          className={captchaWiggle ? "retop-wiggle" : ""}
        >
          {/* Captcha Image and Refresh Button */}
          <div id="captchaBlock">
            {captchaData?.captchaImage ? (
              <img
                id="captchaImage"
                src={captchaData.captchaImage}
                alt="Captcha"
              />
            ) : (
              <div
                className="h-12 w-28 bg-(--bg-card) border border-(--border-main) rounded flex items-center justify-center text-xs text-(--text-muted) font-semibold"
                style={{ height: "48px" }}
              >
                {loadingCaptcha ? "Loading..." : "No Captcha"}
              </div>
            )}
            <button
              type="button"
              id="captchaRefresh"
              className="retop-reload-btn"
              disabled={loadingCaptcha || isSubmitting}
              onClick={handleRefreshCaptcha}
              title="Refresh Captcha"
            >
              <Refresh
                className={`w-5 h-5 ${loadingCaptcha ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Captcha Input with Floating Label */}
          <div className="relative flex-1">
            <input
              type="text"
              id="captchaStr"
              className="form-control"
              placeholder=" "
              required
              disabled={isSubmitting}
              maxLength={6}
              autoComplete="off"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
            />
            <label htmlFor="captchaStr" className="retop-floating-label">
              Captcha
            </label>
          </div>
        </div>

        {/* Sync Progress Indicator */}
        {syncProgress && (
          <div className="p-3 bg-(--bg-card) border border-(--border-main) rounded-2xl space-y-2 text-left animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-(--text-main) flex items-center gap-1.5">
                <Sync className="w-3.5 h-3.5 animate-spin text-(--accent-base)" />
                {syncProgress.step}
              </span>
              <span className="text-(--accent-base)">
                {syncProgress.progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-(--bg-main) rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${syncProgress.progressPercent}%`,
                  backgroundColor: "var(--accent-base)",
                }}
              />
            </div>
          </div>
        )}

        {/* Submit Button matching .btn-primary in login-theme.css */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || loadingCaptcha || !captchaData}
            className="btn btn-primary cursor-pointer active:scale-98 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Sync className="w-4 h-4 animate-spin" />
                <span>
                  {syncProgress ? "SYNCHRONIZING..." : "LOGGING IN..."}
                </span>
              </span>
            ) : (
              <span>LOGIN</span>
            )}
          </button>
        </div>

        {onCancel && (
          <div className="text-center pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="text-xs text-(--text-muted) hover:text-(--text-main) font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </form>

      {/* Floating Error Toast */}
      {errorMessage && (
        <div className="retop-error-toast" onClick={() => setErrorMessage("")}>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
