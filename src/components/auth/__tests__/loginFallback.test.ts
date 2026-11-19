import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginErrorBoundary } from '../LoginErrorBoundary';
import { ErrorBoundary } from '../../common/ErrorBoundary';

/**
 * Plain class instances let us drive componentDidCatch/render without mounting
 * React. setState is stubbed so an unmounted instance updates state locally.
 */
const stubSetState = (instance: any) => {
  instance.setState = (partial: any) => {
    Object.assign(instance.state, partial);
  };
};

describe('LoginErrorBoundary keeps failures on retop', () => {
  let originalLocation: any;
  let reloads = 0;

  beforeEach(() => {
    sessionStorage.clear();
    reloads = 0;
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: () => void (reloads += 1) },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('does not arm the bypass or reload when the login tree throws', () => {
    const boundary = new LoginErrorBoundary({ children: null });
    stubSetState(boundary);

    boundary.componentDidCatch(new Error('render blew up'));

    expect(sessionStorage.getItem('retop-login-bypass')).toBeNull();
    expect(reloads).toBe(0);
  });

  it('renders an in-place retry shell instead of a blank page', () => {
    const boundary = new LoginErrorBoundary({ children: null });
    boundary.state = { hasError: true };
    stubSetState(boundary);

    const markup = renderToStaticMarkup(boundary.render() as any);

    expect(markup).toContain('Retry');
    expect(markup).toContain('Something went wrong on the retop login screen.');
  });

  it('clears the error and restores children on retry', () => {
    const boundary = new LoginErrorBoundary({ children: 'the card' });
    boundary.state = { hasError: true };
    stubSetState(boundary);

    const outer: any = boundary.render();
    const button = outer.props.children.props.children[1];
    button.props.onClick();
    expect(boundary.state.hasError).toBe(false);
    expect(boundary.render()).toBe('the card');
  });
});

describe('fullscreen ErrorBoundary teardown is scoped to the dashboard', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-retop-takeover');
    document.body.innerHTML = '';
    (window as any).__retopAborted = false;
  });

  const boundary = () => {
    const b = new ErrorBoundary({ children: null, variant: 'fullscreen' });
    b.state = { hasError: true, error: new Error('boom'), errorInfo: null };
    stubSetState(b);
    return b;
  };

  it('does not tear down and shows a retry card on the login takeover', () => {
    document.documentElement.setAttribute('data-retop-takeover', 'login');
    const b = boundary();

    b.componentDidCatch(new Error('boom'), {} as any);
    expect((window as any).__retopAborted).toBe(false);

    const markup = renderToStaticMarkup(b.render() as any);
    expect(markup).not.toBe('');
    expect(markup).toContain('Reload');
  });

  it('still tears down and renders nothing on the dashboard (unchanged)', () => {
    const b = boundary();

    b.componentDidCatch(new Error('boom'), {} as any);
    expect((window as any).__retopAborted).toBe(true);
    expect(b.render()).toBeNull();
  });
});
