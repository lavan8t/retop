import { describe, expect, it } from 'bun:test';
import { isOtpRequiredMessage } from '../vtopClient';

describe('login OTP detection', () => {
  it('recognises VTOP verification prompts', () => {
    expect(
      isOtpRequiredMessage(
        'Additional verification required. OTP sent to your registered email.',
      ),
    ).toBe(true);
    expect(
      isOtpRequiredMessage('An OTP has been sent to your registered email'),
    ).toBe(true);
    expect(isOtpRequiredMessage('Please enter the verification code')).toBe(
      true,
    );
  });

  it('ignores unrelated login errors', () => {
    expect(isOtpRequiredMessage('Invalid username or password.')).toBe(false);
    expect(isOtpRequiredMessage('Invalid CAPTCHA. Please try again.')).toBe(
      false,
    );
    expect(isOtpRequiredMessage('')).toBe(false);
  });
});
