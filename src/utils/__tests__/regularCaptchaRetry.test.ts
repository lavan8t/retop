import { describe, expect, it, mock } from 'bun:test';
import { RecaptchaRequiredError } from '../vtopClient';
import {
  MAX_REGULAR_CAPTCHA_RETRIES,
  RECAPTCHA_RETRY_DELAY_MS,
  REGULAR_CAPTCHA_EXHAUSTED_MESSAGE,
  loadRegularCaptcha,
  regularCaptchaRetryMessage,
} from '../regularCaptchaRetry';

describe('regular captcha retry policy', () => {
  it('formats the reload feedback string without the raw token', () => {
    expect(regularCaptchaRetryMessage(1)).toBe(
      'VTOP is still serving reCAPTCHA. Reloading in retop for the legacy CAPTCHA (1/5)…',
    );
    expect(regularCaptchaRetryMessage(MAX_REGULAR_CAPTCHA_RETRIES)).toBe(
      'VTOP is still serving reCAPTCHA. Reloading in retop for the legacy CAPTCHA (5/5)…',
    );
    expect(regularCaptchaRetryMessage(1)).not.toContain('RECAPTCHA_REQUIRED');
  });

  it('never sends the user to the old login page', () => {
    for (const message of [
      regularCaptchaRetryMessage(1),
      REGULAR_CAPTCHA_EXHAUSTED_MESSAGE,
    ]) {
      expect(message).not.toMatch(
        /sign in at|old login|native vtop|vtop\.vit\.ac\.in/i,
      );
    }
  });

  it('returns the first success without retrying or sleeping', async () => {
    const attempt = mock(() => Promise.resolve('captcha-a'));
    const sleep = mock(() => Promise.resolve());
    const onRetry = mock(() => {});
    const onExhausted = mock(() => {});

    const value = await loadRegularCaptcha(attempt, {
      sleep,
      onRetry,
      onExhausted,
    });

    expect(value).toBe('captcha-a');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it('retries a reCAPTCHA signal with feedback and 500ms spacing, then succeeds', async () => {
    const attempt = mock()
      .mockRejectedValueOnce(new RecaptchaRequiredError())
      .mockResolvedValueOnce('captcha-b');
    const sleep = mock(() => Promise.resolve());
    const onRetry = mock(() => {});
    const onExhausted = mock(() => {});

    const value = await loadRegularCaptcha(attempt, {
      sleep,
      onRetry,
      onExhausted,
    });

    expect(value).toBe('captcha-b');
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(RECAPTCHA_RETRY_DELAY_MS);
    expect(sleep).toHaveBeenCalledWith(500);
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it('stops after 5 bounded retries (6 total attempts) with no handoff callback', async () => {
    const attempt = mock(() => Promise.reject(new RecaptchaRequiredError()));
    const sleep = mock(() => Promise.resolve());
    const onRetry = mock(() => {});
    const onExhausted = mock(() => {});

    const value = await loadRegularCaptcha(attempt, {
      sleep,
      onRetry,
      onExhausted,
    });

    expect(value).toBeNull();
    expect(MAX_REGULAR_CAPTCHA_RETRIES).toBe(5);
    expect(attempt).toHaveBeenCalledTimes(MAX_REGULAR_CAPTCHA_RETRIES + 1);
    expect(attempt).toHaveBeenCalledTimes(6);
    expect(onRetry).toHaveBeenCalledTimes(5);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1);
    expect(onRetry).toHaveBeenNthCalledWith(5, 5);
    expect(sleep).toHaveBeenCalledTimes(5);
    // Exhaustion stays on retop: the only callback is the local UI message.
    expect(onExhausted).toHaveBeenCalledTimes(1);
  });

  it('never retries or hands off ordinary (non-reCAPTCHA) failures', async () => {
    const ordinary = new Error('Invalid CAPTCHA. Please try again.');
    const attempt = mock(() => Promise.reject(ordinary));
    const sleep = mock(() => Promise.resolve());
    const onRetry = mock(() => {});
    const onExhausted = mock(() => {});

    await expect(
      loadRegularCaptcha(attempt, { sleep, onRetry, onExhausted }),
    ).rejects.toBe(ordinary);

    expect(attempt).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
    expect(onExhausted).not.toHaveBeenCalled();
  });

  it('honors an injected retry budget and delay', async () => {
    const attempt = mock(() => Promise.reject(new RecaptchaRequiredError()));
    const sleep = mock(() => Promise.resolve());

    await loadRegularCaptcha(attempt, { maxRetries: 1, delayMs: 25, sleep });

    expect(attempt).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(25);
  });
});
