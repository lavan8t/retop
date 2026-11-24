export type LoginField = 'username' | 'password' | 'captcha' | 'general';

export interface LoginValidationInput {
  username: string | null | undefined;
  password: string | null | undefined;
  captcha: string | null | undefined;
}

export interface LoginValidationError {
  field: 'username' | 'password' | 'captcha';
  message: string;
}

export const REG_NO_PATTERN = /^\d{2}[A-Za-z]{2,5}\d{4,5}$/;
const ALPHANUMERIC_PATTERN = /^[A-Za-z0-9]+$/;

export function normalizeUsername(value: string | null | undefined): string {
  return (value ?? '').replace(/\s/g, '').toUpperCase();
}

export function normalizeCaptcha(value: string | null | undefined): string {
  const upper = (value ?? '').toUpperCase();
  return upper.length > 6 ? '' : upper;
}

function isPasswordValid(password: string, username: string): boolean {
  if (/[a-z]/.test(password)) {
    return (
      password.length >= 10 &&
      password.length <= 30 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      !password.toLowerCase().includes(username.toLowerCase())
    );
  }
  return password.length >= 6 && password.length <= 30;
}

export function validateLogin(
  input: LoginValidationInput,
): LoginValidationError | null {
  const username = normalizeUsername(input.username);
  const password = input.password ?? '';
  const captcha = normalizeCaptcha(input.captcha);

  if (!username) {
    return { field: 'username', message: 'Please enter your username' };
  }
  if (REG_NO_PATTERN.test(username)) {
    return {
      field: 'username',
      message: 'Please enter your username, not your registration number',
    };
  }
  if (
    !ALPHANUMERIC_PATTERN.test(username) ||
    username.length < 10 ||
    username.length > 15
  ) {
    return { field: 'username', message: 'Invalid username' };
  }
  if (!password.trim()) {
    return { field: 'password', message: 'Please enter your password' };
  }
  if (!isPasswordValid(password, username)) {
    return { field: 'password', message: 'Invalid password' };
  }
  if (!captcha || !captcha.trim()) {
    return { field: 'captcha', message: 'Please enter the CAPTCHA code' };
  }
  return null;
}

export function routeServerError(
  message: string | null | undefined,
): LoginField[] {
  const lower = (message ?? '').toLowerCase();
  if (lower.includes('captcha')) return ['captcha'];
  if (
    lower.includes('credential') ||
    lower.includes('invalid username or password') ||
    lower.includes('invalid loginid/password')
  ) {
    return ['username', 'password'];
  }
  if (
    lower.includes('username') ||
    lower.includes('loginid') ||
    lower.includes('reg')
  ) {
    return ['username'];
  }
  if (lower.includes('password')) return ['password'];
  return ['general'];
}
