/**
 * Regular-captcha retry policy shared by the login card's load and submit paths.
 * A reCAPTCHA-class signal gets a bounded number of fresh full-handshake retries
 * before the caller hands the page back to VTOP.
 */

import { RecaptchaRequiredError } from './vtopClient';

export const MAX_REGULAR_CAPTCHA_RETRIES = 2;
export const RECAPTCHA_RETRY_DELAY_MS = 500;

export function regularCaptchaRetryMessage(retry: number): string {
  return `VTOP is using reCAPTCHA. Trying a regular CAPTCHA (${retry}/${MAX_REGULAR_CAPTCHA_RETRIES})…`;
}

export interface RegularCaptchaRetryOptions {
  maxRetries?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (retry: number) => void;
  onExhausted?: () => void;
}

/**
 * Runs `attempt` until it succeeds, retrying only on RecaptchaRequiredError.
 * Returns null after the budget is exhausted (onExhausted has fired); every
 * other error propagates untouched so ordinary CAPTCHA failures never hand off.
 */
export async function loadRegularCaptcha<T>(
  attempt: () => Promise<T>,
  options: RegularCaptchaRetryOptions = {},
): Promise<T | null> {
  const {
    maxRetries = MAX_REGULAR_CAPTCHA_RETRIES,
    delayMs = RECAPTCHA_RETRY_DELAY_MS,
    sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    onRetry,
    onExhausted,
  } = options;

  for (let retry = 0; ; retry++) {
    try {
      return await attempt();
    } catch (err) {
      if (!(err instanceof RecaptchaRequiredError)) throw err;
      if (retry >= maxRetries) {
        onExhausted?.();
        return null;
      }
      onRetry?.(retry + 1);
      await sleep(delayMs);
    }
  }
}
