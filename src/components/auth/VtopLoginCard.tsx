import React, { useState, useEffect, useRef } from 'react';
import {
  Refresh,
  Visibility,
  VisibilityOff,
} from '@nine-thirty-five/material-symbols-react/rounded/700/filled';
import {
  VtopClient,
  VtopCampus,
  CaptchaData,
  RecaptchaRequiredError,
  RECAPTCHA_REQUIRED,
  type LoginResult,
} from '../../utils/vtopClient';
import {
  syncStudentData,
  CachedUser,
  SyncProgress,
} from '../../utils/syncOrchestrator';
import {
  getStorageData,
  setStorageData,
  removeStorageKeys,
} from '../../utils/storageAdapter';
import {
  normalizeCaptcha,
  normalizeUsername,
  routeServerError,
  validateLogin,
  type LoginField,
} from '../../utils/loginValidation';
import {
  loadRegularCaptcha,
  regularCaptchaRetryMessage,
  REGULAR_CAPTCHA_EXHAUSTED_MESSAGE,
} from '../../utils/regularCaptchaRetry';
import { M3eCheckbox } from '../attendance/m3eTags';

const REMEMBERED_USER_KEY = 'retop_remembered_username';

export interface VtopLoginCardProps {
  initialCampus?: VtopCampus;
  onLoginSuccess: (user: CachedUser, client: VtopClient) => void;
  onCancel?: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  /**
   * Download every module into the offline cache before handing over. Offline and
   * standalone surfaces need it; the live login takeover does not, because the
   * dashboard entry fetches the same data through VTOPNetwork anyway.
   */
  syncAfterLogin?: boolean;
}

export const VtopLoginCard: React.FC<VtopLoginCardProps> = ({
  initialCampus = 'vellore',
  onLoginSuccess,
  onCancel,
  title = 'retop',
  subtitle = 'vtop login',
  syncAfterLogin = true,
}) => {
  const [campus, setCampus] = useState<VtopCampus>(initialCampus);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  // Kept in step with captchaInput at every write site: an effect-based sync
  // can overwrite a freshly solved answer on a later render.
  const captchaInputRef = useRef('');
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorFields, setErrorFields] = useState<LoginField[]>([]);

  const [usernameWiggle, setUsernameWiggle] = useState(false);
  const [passwordWiggle, setPasswordWiggle] = useState(false);
  const [captchaWiggle, setCaptchaWiggle] = useState(false);
  const [isTitleHovered, setIsTitleHovered] = useState(false);
  const [isSolvingCaptcha, setIsSolvingCaptcha] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(false);
  const [otpContext, setOtpContext] = useState<
    LoginResult['otpContext'] | null
  >(null);
  const [otpCode, setOtpCode] = useState('');

  const captchaImgRef = useRef<HTMLImageElement | null>(null);

  // Request sequencing to guarantee only the latest captcha response updates state
  const activeSeqRef = useRef<number>(0);
  const hasMountedRef = useRef<boolean>(false);
  const solvingJobRef = useRef<{ cancelled: boolean } | null>(null);

  // A refreshed image needs a fresh answer: install it in state, drop the old
  // answer from both state and ref, then let the auto-solve effect refill the
  // ref. The caller must use the returned answer for the next POST.
  const awaitSolvedCaptcha = async (next: CaptchaData): Promise<string> => {
    setCaptchaData(next);
    setCaptchaInput('');
    captchaInputRef.current = '';
    for (let i = 0; i < 30; i++) {
      const solved = normalizeCaptcha(captchaInputRef.current);
      if (solved.length >= 6) return solved;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return '';
  };

  // The effect below runs after commit, before a fresh image may have loaded,
  // so also solve on load. Whichever runs first fills the ref exactly once.
  const solveCaptchaImage = () => {
    const img = captchaImgRef.current;
    if (!captchaData?.captchaImage || !img) return;
    if (!img.complete || img.naturalWidth === 0) return;
    if (solvingJobRef.current) solvingJobRef.current.cancelled = true;
    const job = { cancelled: false };
    solvingJobRef.current = job;
    setIsSolvingCaptcha(true);

    import('../../utils/captchaSolver')
      .then(({ autoSolveCaptcha }) => autoSolveCaptcha(img))
      .then((solved) => {
        if (job.cancelled || !solved) return;
        captchaInputRef.current = solved;
        setCaptchaInput(solved);
      })
      .catch((e) => {
        if (!job.cancelled)
          console.warn('[VtopLoginCard] CAPTCHA auto-solve failed:', e);
      })
      .finally(() => {
        if (!job.cancelled) setIsSolvingCaptcha(false);
      });
  };

  type DisplayField = 'username' | 'password' | 'captcha';

  const displayFields = (fields: LoginField[]): DisplayField[] =>
    fields.map((field) => (field === 'general' ? 'password' : field));

  const wiggleField = (field: DisplayField) => {
    const setter =
      field === 'username'
        ? setUsernameWiggle
        : field === 'password'
          ? setPasswordWiggle
          : setCaptchaWiggle;
    setter(true);
    setTimeout(() => setter(false), 400);
  };

  const clearErrors = () => {
    setErrorMessage('');
    setErrorFields([]);
  };

  const showError = (message: string, fields: LoginField[]) => {
    setErrorMessage(message);
    setErrorFields(fields);
    displayFields(fields).forEach(wiggleField);
  };

  const clearFieldError = (field: DisplayField) => {
    setErrorMessage('');
    setErrorFields((prev) => prev.filter((f) => f !== field));
  };

  const completeLogin = async (result: LoginResult, loginUser: string) => {
    clearErrors();
    try {
      if (rememberUsername) {
        await setStorageData({ [REMEMBERED_USER_KEY]: loginUser });
      } else {
        await removeStorageKeys([REMEMBERED_USER_KEY]);
      }
    } catch {}

    if (!syncAfterLogin) {
      const regNo =
        result.user?.registrationNumber || result.client!.registrationNumber;
      onLoginSuccess(
        {
          regNo,
          username: regNo,
          name: result.user?.name || result.client!.studentName || regNo,
          lastActive: Date.now(),
          campus: result.client!.campus,
        },
        result.client!,
      );
      return;
    }

    setSyncProgress({
      step: 'Authenticating session...',
      progressPercent: 10,
    });
    const syncResult = await syncStudentData(result.client!, (progress) => {
      setSyncProgress(progress);
    });
    onLoginSuccess(syncResult.user, result.client!);
  };

  const isFieldError = (field: DisplayField) => errorFields.includes(field);
  const firstErrorField = displayFields(errorFields)[0] ?? null;

  const fieldErrorText = (field: DisplayField) =>
    errorMessage && firstErrorField === field ? (
      <p
        role="alert"
        className="text-xs text-left"
        style={{
          color: 'var(--color-error, #ef4444)',
          marginTop: '-0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        {errorMessage}
      </p>
    ) : null;

  // Fetch initial session & captcha
  const fetchInitialCaptcha = async (targetCampus: VtopCampus) => {
    const seq = ++activeSeqRef.current;
    setLoadingCaptcha(true);

    try {
      const data = await loadRegularCaptcha(
        () => VtopClient.getCaptcha(targetCampus),
        {
          onRetry: (retry) =>
            showError(regularCaptchaRetryMessage(retry), ['captcha']),
          onExhausted: () => {
            showError(REGULAR_CAPTCHA_EXHAUSTED_MESSAGE, ['general']);
          },
        },
      );
      if (!data || seq !== activeSeqRef.current) return;
      setCaptchaData(data);
      setCaptchaInput('');
      captchaInputRef.current = '';
    } catch (err: any) {
      if (seq !== activeSeqRef.current) return;
      console.error('[VtopLoginCard] Failed to fetch captcha:', err);
      showError(
        err?.message || 'Failed to load CAPTCHA from VTOP. Please retry.',
        ['general'],
      );
    } finally {
      if (seq === activeSeqRef.current) {
        setLoadingCaptcha(false);
      }
    }
  };

  // Refresh captcha for the existing session (does not reset session tokens).
  // Internal retries pass force so the submitting form can refresh too.
  const handleRefreshCaptcha = async (
    force = false,
  ): Promise<{ data: CaptchaData; answer: string } | null> => {
    if (!force && (loadingCaptcha || isSubmitting)) return null;

    if (captchaData?.jsessionid) {
      const seq = ++activeSeqRef.current;
      setLoadingCaptcha(true);

      try {
        const refreshed = await VtopClient.refreshCaptcha(
          campus,
          captchaData.jsessionid,
          captchaData.serverId,
          captchaData.csrf,
        );
        if (seq !== activeSeqRef.current) return null;
        const newData: CaptchaData = {
          captchaImage: refreshed.captchaImage,
          csrf: refreshed.csrf,
          jsessionid: refreshed.jsessionid,
          serverId: refreshed.serverId,
        };
        const answer = await awaitSolvedCaptcha(newData);
        return { data: newData, answer };
      } catch (e) {
        // Fallback to full initial handshake if session expired
        fetchInitialCaptcha(campus);
        return null;
      } finally {
        if (seq === activeSeqRef.current) {
          setLoadingCaptcha(false);
        }
      }
    } else {
      fetchInitialCaptcha(campus);
      return null;
    }
  };

  // Only run once on mount or when campus pill changes
  useEffect(() => {
    fetchInitialCaptcha(campus);
  }, [campus]);

  // Restore a username the user asked us to remember.
  useEffect(() => {
    let cancelled = false;
    getStorageData([REMEMBERED_USER_KEY])
      .then((data) => {
        const saved = data[REMEMBERED_USER_KEY];
        if (!cancelled && typeof saved === 'string' && saved) {
          setUsername(saved);
          setRememberUsername(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-solve the CAPTCHA, as the old enhanceLegacyLogin poll did. Re-runs on
  // every new image — VTOP rotates the CAPTCHA after each attempt — so a failed
  // login still lands with a freshly solved field.
  useEffect(() => {
    solveCaptchaImage();
    return () => {
      if (solvingJobRef.current) solvingJobRef.current.cancelled = true;
    };
  }, [captchaData?.captchaImage]);

  const handleCampusChange = (newCampus: VtopCampus) => {
    if (newCampus === campus || isSubmitting) return;
    setCampus(newCampus);
    setCaptchaData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = validateLogin({
      username,
      password,
      captcha: captchaData ? captchaInput : null,
    });
    if (validationError) {
      showError(validationError.message, [validationError.field]);
      return;
    }

    setIsSubmitting(true);
    clearErrors();
    setSyncProgress(null);

    const trimmedUser = normalizeUsername(username);
    const trimmedPass = password;

    const MAX_CAPTCHA_RETRIES = 2;
    let captchaRetries = 0;
    // validateLogin rejects a blank captcha, which covers a missing session.
    let activeCaptcha: CaptchaData = captchaData!;
    let needsFreshCaptcha = false;

    const attemptLogin = async (answer: string): Promise<void> => {
      try {
        const result = await loadRegularCaptcha(
          async () => {
            let postAnswer = answer;
            if (needsFreshCaptcha) {
              // A reCAPTCHA signal means the current image is unusable: take a
              // fresh full handshake and wait for its regular CAPTCHA instead.
              activeCaptcha = await VtopClient.getCaptcha(campus);
              postAnswer = await awaitSolvedCaptcha(activeCaptcha);
              needsFreshCaptcha = false;
            }
            const attempt = await VtopClient.login({
              campus,
              username: trimmedUser,
              password: trimmedPass,
              captcha: postAnswer,
              csrf: activeCaptcha.csrf,
              jsessionid: activeCaptcha.jsessionid,
              serverId: activeCaptcha.serverId,
            });
            if (attempt.message === RECAPTCHA_REQUIRED) {
              needsFreshCaptcha = true;
              throw new RecaptchaRequiredError();
            }
            return attempt;
          },
          {
            onRetry: (retry) =>
              showError(regularCaptchaRetryMessage(retry), ['captcha']),
            onExhausted: () => {
              showError(REGULAR_CAPTCHA_EXHAUSTED_MESSAGE, ['general']);
              setIsSubmitting(false);
            },
          },
        );
        if (!result) return;

        if (result.requiresOtp && result.otpContext) {
          setOtpContext(result.otpContext);
          setOtpCode('');
          clearErrors();
          setIsSubmitting(false);
          return;
        }

        const isCaptchaError = /captcha/i.test(result.message || '');

        if (!result.success || !result.client) {
          // Auto-retry up to 2 times on an invalid captcha.
          if (isCaptchaError && captchaRetries < MAX_CAPTCHA_RETRIES) {
            captchaRetries += 1;
            showError(
              `Invalid CAPTCHA. Retrying (${captchaRetries}/${MAX_CAPTCHA_RETRIES})...`,
              ['captcha'],
            );
            const refreshed = await handleRefreshCaptcha(true);
            if (refreshed) {
              activeCaptcha = refreshed.data;
              // handleRefreshCaptcha cleared the old answer and waited for the
              // solver, so POST the newly produced one, not the initial input.
              return attemptLogin(refreshed.answer);
            }
          }

          showError(
            result.message || 'Invalid credentials or CAPTCHA mismatch',
            routeServerError(result.message),
          );
          setIsSubmitting(false);
          handleRefreshCaptcha();
          return;
        }

        await completeLogin(result, trimmedUser);
      } catch (err: any) {
        console.error('[VtopLoginCard] Login error:', err);
        showError(
          err?.message || 'Login failed. Check your network connection.',
          ['general'],
        );
        setIsSubmitting(false);
        handleRefreshCaptcha();
      }
    };

    await attemptLogin(
      normalizeCaptcha(captchaInputRef.current) ||
        normalizeCaptcha(captchaInput),
    );
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpContext) return;
    if (!/^\d{6}$/.test(otpCode.trim())) {
      showError('Enter the 6-digit code sent to your email.', ['general']);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await VtopClient.submitLoginOtp({
        ...otpContext,
        otp: otpCode,
      });
      if (!result.success || !result.client) {
        showError(result.message || 'Verification failed.', ['general']);
        setIsSubmitting(false);
        return;
      }
      setOtpContext(null);
      setOtpCode('');
      await completeLogin(result, otpContext.username);
    } catch (err: any) {
      showError(err?.message || 'Verification failed.', ['general']);
      setIsSubmitting(false);
    }
  };

  return (
    <div id="loginBox" className="w-full max-w-md mx-auto select-none">
      {/* Card Header matching login-theme.css */}
      <div className="card-header loginBoxBorder mb-2 text-left">
        <h4
          style={{
            fontFamily: "'Google Sans Flex', system-ui, sans-serif",
            fontVariationSettings: isTitleHovered
              ? '"wdth" 151, "wght" 1, "GRAD" 100, "ROND" 100, "slnt" -10'
              : '"wdth" 151, "wght" 800, "GRAD" 100, "ROND" 100, "slnt" -10',
            transition:
              'font-variation-settings 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'default',
          }}
          onMouseEnter={() => setIsTitleHovered(true)}
          onMouseLeave={() => setIsTitleHovered(false)}
        >
          {title}
        </h4>
        {subtitle ? <p id="retop-welcome-text">{subtitle}</p> : null}
      </div>

      {otpContext ? (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="input-group">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="form-control"
              placeholder=" "
              autoFocus
              disabled={isSubmitting}
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                clearErrors();
              }}
            />
            <label>Verification code</label>
          </div>
          {errorMessage && (
            <p className="text-xs text-(--md-sys-color-error)">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || otpCode.length !== 6}
            className="btn btn-primary w-full"
          >
            {isSubmitting ? 'Verifying...' : 'Verify code'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setOtpContext(null);
              setOtpCode('');
              clearErrors();
              handleRefreshCaptcha();
            }}
            className="w-full text-xs text-(--text-muted) hover:text-(--text-main) font-medium cursor-pointer transition-colors"
          >
            Back to sign in
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input Group with Native Floating Label */}
          <div
            className={`input-group ${usernameWiggle ? 'retop-wiggle' : ''}`}
          >
            <input
              type="text"
              id="username"
              className="form-control"
              placeholder=" "
              disabled={isSubmitting}
              autoCapitalize="characters"
              autoComplete="username"
              spellCheck={false}
              autoCorrect="off"
              value={username}
              onChange={(e) => {
                setUsername(normalizeUsername(e.target.value));
                clearFieldError('username');
              }}
            />
            <label htmlFor="username" className="retop-floating-label">
              Username
            </label>
          </div>
          {fieldErrorText('username')}

          {/* Password Input Group with Native Floating Label & Visibility Toggle */}
          <div
            className={`input-group ${passwordWiggle ? 'retop-wiggle' : ''}`}
          >
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="form-control"
              placeholder=" "
              disabled={isSubmitting}
              autoComplete="current-password"
              spellCheck={false}
              autoCorrect="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
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
          {fieldErrorText('password')}

          {/* Remember username */}
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <M3eCheckbox
              checked={rememberUsername}
              disabled={isSubmitting}
              onChange={(e: any) => {
                const checked = e.target.checked;
                setRememberUsername(checked);
                if (!checked)
                  removeStorageKeys([REMEMBERED_USER_KEY]).catch(() => {});
              }}
              style={
                {
                  '--m3e-checkbox-container-size': '32px',
                  '--m3e-checkbox-icon-size': '16px',
                } as React.CSSProperties
              }
            />
            <span
              className="text-xs text-(--text-muted)"
              style={{ fontVariationSettings: '"wght" 400, "wdth" 100' }}
            >
              Remember username
            </span>
          </label>

          {/* CAPTCHA Container Matching login-theme.css #retop-captcha-container */}
          <div
            id="retop-captcha-container"
            className={`${captchaWiggle ? 'retop-wiggle' : ''} transition-all duration-300 ease-in-out overflow-hidden ${captchaInput.length >= 6 && !isFieldError('captcha') ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'}`}
          >
            {/* Captcha Image and Refresh Button */}
            <div id="captchaBlock">
              {captchaData?.captchaImage ? (
                <img
                  id="captchaImage"
                  ref={captchaImgRef}
                  src={captchaData.captchaImage}
                  alt="Captcha"
                  onLoad={solveCaptchaImage}
                />
              ) : (
                <div
                  className="h-12 w-28 bg-(--bg-card) border border-(--border-main) rounded flex items-center justify-center text-xs text-(--text-muted) font-semibold"
                  style={{ height: '48px' }}
                >
                  {loadingCaptcha ? 'Loading...' : 'No Captcha'}
                </div>
              )}
              <button
                type="button"
                id="captchaRefresh"
                className="retop-reload-btn"
                disabled={loadingCaptcha || isSubmitting || isSolvingCaptcha}
                onClick={() => handleRefreshCaptcha()}
                title="Refresh Captcha"
              >
                <Refresh
                  className={`w-5 h-5 ${loadingCaptcha ? 'animate-spin' : ''}`}
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
                disabled={isSubmitting}
                maxLength={6}
                autoComplete="off"
                spellCheck={false}
                autoCorrect="off"
                value={captchaInput}
                onChange={(e) => {
                  const next = normalizeCaptcha(e.target.value);
                  captchaInputRef.current = next;
                  setCaptchaInput(next);
                  clearFieldError('captcha');
                }}
              />
              <label htmlFor="captchaStr" className="retop-floating-label">
                Captcha
              </label>
            </div>
            {fieldErrorText('captcha')}
          </div>

          {/* Sync Progress Indicator */}
          {syncProgress && (
            <div className="p-3 bg-(--bg-card) border border-(--border-main) rounded-2xl space-y-2 text-left animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-(--text-main) flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin text-(--accent-base)" />
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
                    backgroundColor: 'var(--accent-base)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button matching .btn-primary in login-theme.css */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary cursor-pointer active:scale-98 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>
                    {syncProgress ? 'SYNCHRONIZING...' : 'LOGGING IN...'}
                  </span>
                </span>
              ) : (
                <span>Log In</span>
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
      )}
    </div>
  );
};
