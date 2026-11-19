import { describe, expect, it } from 'bun:test';
import {
  normalizeCaptcha,
  normalizeUsername,
  routeServerError,
  validateLogin,
} from '../loginValidation';

const VALID_USERNAME = '22BCE123456';
const VALID_PASSWORD = 'STRONGPWD1';
const VALID_CAPTCHA = 'AB12CD';

describe('login input normalization', () => {
  it('strips whitespace and uppercases the username', () => {
    expect(normalizeUsername(' 22bce 123456 ')).toBe('22BCE123456');
    expect(normalizeUsername('22 BCE 123456')).toBe('22BCE123456');
    expect(normalizeUsername(null)).toBe('');
  });

  it('uppercases the captcha and ignores input longer than six characters', () => {
    expect(normalizeCaptcha('ab12cd')).toBe('AB12CD');
    expect(normalizeCaptcha(' ab12cd ')).toBe('');
    expect(normalizeCaptcha('abcdefg')).toBe('');
    expect(normalizeCaptcha(null)).toBe('');
  });
});

describe('validateLogin', () => {
  const valid = {
    username: VALID_USERNAME,
    password: VALID_PASSWORD,
    captcha: VALID_CAPTCHA,
  };

  it('returns null for a fully valid submission', () => {
    expect(validateLogin(valid)).toBeNull();
  });

  it('accepts a mixed-case password meeting the strong rules', () => {
    expect(validateLogin({ ...valid, password: 'StrongPass1' })).toBeNull();
  });

  it('accepts a short uppercase-only password without special rules', () => {
    expect(validateLogin({ ...valid, password: 'ABCDEF' })).toBeNull();
  });

  it('treats password length as verbatim, not trimmed', () => {
    expect(validateLogin({ ...valid, password: ' ABCDEF ' })).toBeNull();
    expect(validateLogin({ ...valid, password: '   ' })).toEqual({
      field: 'password',
      message: 'Please enter your password',
    });
  });

  it('validates a normalized (stripped, uppercased) username', () => {
    expect(validateLogin({ ...valid, username: ' 22bce123456 ' })).toBeNull();
  });

  it('rejects a blank username first', () => {
    expect(validateLogin({ ...valid, username: '   ' })).toEqual({
      field: 'username',
      message: 'Please enter your username',
    });
  });

  it('rejects a registration number with the dedicated message', () => {
    expect(validateLogin({ ...valid, username: '22BCE12345' })).toEqual({
      field: 'username',
      message: 'Please enter your username, not your registration number',
    });
    expect(validateLogin({ ...valid, username: '22ABCD1234' })).toEqual({
      field: 'username',
      message: 'Please enter your username, not your registration number',
    });
  });

  it('rejects usernames with non-alphanumeric characters', () => {
    expect(validateLogin({ ...valid, username: '22BCE12345-' })).toEqual({
      field: 'username',
      message: 'Invalid username',
    });
  });

  it('rejects usernames outside 10..15 characters', () => {
    expect(validateLogin({ ...valid, username: '22BCE123' })).toEqual({
      field: 'username',
      message: 'Invalid username',
    });
    expect(validateLogin({ ...valid, username: '22BCE12345678901' })).toEqual({
      field: 'username',
      message: 'Invalid username',
    });
    expect(validateLogin({ ...valid, username: '22BCE123456' })).toBeNull();
  });

  it('rejects a blank password', () => {
    expect(validateLogin({ ...valid, password: '' })).toEqual({
      field: 'password',
      message: 'Please enter your password',
    });
  });

  it('enforces strong rules when a password contains a lowercase letter', () => {
    const base = { ...valid };
    expect(validateLogin({ ...base, password: 'abcdefghij' })).toEqual({
      field: 'password',
      message: 'Invalid password',
    });
    expect(validateLogin({ ...base, password: 'ABCDEFGHIJ' })).toBeNull();
    expect(validateLogin({ ...base, password: 'PasswordNoDigit' })).toEqual({
      field: 'password',
      message: 'Invalid password',
    });
    expect(validateLogin({ ...base, password: 'password1' })).toEqual({
      field: 'password',
      message: 'Invalid password',
    });
    expect(validateLogin({ ...base, password: 'Short1a' })).toEqual({
      field: 'password',
      message: 'Invalid password',
    });
    expect(
      validateLogin({
        ...base,
        password: 'ThisIsAVeryLongPasswordBeyondThirty1a',
      }),
    ).toEqual({ field: 'password', message: 'Invalid password' });
  });

  it('rejects a lowercase password containing the username case-insensitively', () => {
    expect(validateLogin({ ...valid, password: 'My22bce123456Pass1' })).toEqual(
      { field: 'password', message: 'Invalid password' },
    );
    expect(validateLogin({ ...valid, password: 'MyOtherPass1' })).toBeNull();
  });

  it('requires only length 6..30 when there is no lowercase letter', () => {
    expect(validateLogin({ ...valid, password: '12345' })).toEqual({
      field: 'password',
      message: 'Invalid password',
    });
    expect(
      validateLogin({
        ...valid,
        password: '1234567890123456789012345678901',
      }),
    ).toEqual({ field: 'password', message: 'Invalid password' });
    expect(validateLogin({ ...valid, password: '123456' })).toBeNull();
  });

  it('rejects a null or blank captcha', () => {
    expect(validateLogin({ ...valid, captcha: null })).toEqual({
      field: 'captcha',
      message: 'Please enter the CAPTCHA code',
    });
    expect(validateLogin({ ...valid, captcha: '   ' })).toEqual({
      field: 'captcha',
      message: 'Please enter the CAPTCHA code',
    });
  });

  it('does not require the captcha to be exactly six characters', () => {
    expect(validateLogin({ ...valid, captcha: 'ABC' })).toBeNull();
  });

  it('reports only the first failure in order', () => {
    expect(
      validateLogin({ username: '', password: '', captcha: null }),
    ).toEqual({ field: 'username', message: 'Please enter your username' });
    expect(
      validateLogin({ username: valid.username, password: '', captcha: null }),
    ).toEqual({ field: 'password', message: 'Please enter your password' });
    expect(
      validateLogin({
        username: valid.username,
        password: valid.password,
        captcha: null,
      }),
    ).toEqual({ field: 'captcha', message: 'Please enter the CAPTCHA code' });
  });
});

describe('routeServerError', () => {
  it('routes captcha mentions to the captcha field', () => {
    expect(routeServerError('Invalid CAPTCHA')).toEqual(['captcha']);
    expect(routeServerError('captcha mismatch')).toEqual(['captcha']);
  });

  it('routes credential failures to both username and password', () => {
    expect(routeServerError('Invalid credentials')).toEqual([
      'username',
      'password',
    ]);
    expect(routeServerError('Invalid Username Or Password')).toEqual([
      'username',
      'password',
    ]);
    expect(routeServerError('invalid loginid/password')).toEqual([
      'username',
      'password',
    ]);
  });

  it('routes username, loginid and reg mentions to the username field', () => {
    expect(routeServerError('Unknown username')).toEqual(['username']);
    expect(routeServerError('bad LOGINID')).toEqual(['username']);
    expect(routeServerError('registration not found')).toEqual(['username']);
  });

  it('routes password mentions to the password field', () => {
    expect(routeServerError('Wrong password')).toEqual(['password']);
  });

  it('routes unmatched messages to the general bucket', () => {
    expect(routeServerError('Account locked')).toEqual(['general']);
    expect(routeServerError(null)).toEqual(['general']);
    expect(routeServerError('')).toEqual(['general']);
  });

  it('applies captcha and credential rules before the field-name rules', () => {
    expect(
      routeServerError('Invalid username or password, captcha expired'),
    ).toEqual(['captcha']);
    expect(routeServerError('invalid loginid/password')).toEqual([
      'username',
      'password',
    ]);
  });
});
