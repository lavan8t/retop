import React from 'react';

const GSF: React.CSSProperties = {
  fontFamily: "'Google Sans Flex', system-ui, sans-serif",
};

/**
 * Last-resort shell for the login takeover. A render error must never hand the
 * page back to legacy VTOP: retop stays mounted with an in-place retry instead.
 */
export class LoginErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    // The card owns in-field errors; this is only the fallback shell. Stay on
    // retop rather than arming the bypass and reloading into native VTOP.
    console.error('[retop] Login error caught by boundary:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="h-full w-full bg-(--bg-main) text-(--text-main) flex items-center justify-center p-6"
          style={GSF}
        >
          <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-(--text-muted)">
              Something went wrong on the retop login screen.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-5 py-2 rounded-full bg-(--accent-base) text-(--text-inverse) text-xs font-bold cursor-pointer border-none"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
