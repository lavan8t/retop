import { describe, expect, it, mock } from 'bun:test';
import { RecaptchaRequiredError } from '../vtopClient';
import {
  MAX_REGULAR_CAPTCHA_RETRIES,
  RECAPTCHA_RETRY_DELAY_MS,
  loadRegularCaptcha,
  regularCaptchaRetryMessage,
} from '../regularCaptchaRetry';

describe('regular captcha retry policy', () => {
  it('formats the parity feedback string without the raw token', () => {
    expect(regularCaptchaRetryMessage(1)).toBe(
      'VTOP is using reCAPTCHA. Trying a regular CAPTCHA (1/2)…',
    );
    expect(regularCaptchaRetryMessage(2)).toBe(
      'VTOP is using reCAPTCHA. Trying a regular CAPTCHA (2/2)…',
    );
    expect(regularCaptchaRetryMessage(1)).not.toContain('RECAPTCHA_REQUIRED');
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

  it('hands off exactly once after 2 retries (3 total attempts)', async () => {
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
    expect(attempt).toHaveBeenCalledTimes(MAX_REGULAR_CAPTCHA_RETRIES + 1);
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2);
    expect(sleep).toHaveBeenCalledTimes(2);
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
