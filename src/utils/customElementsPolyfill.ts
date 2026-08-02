// Ensure chrome and browser API namespaces are aliased across Firefox & Chrome
if (typeof window !== "undefined") {
  if (!(window as any).chrome && (window as any).browser) {
    (window as any).chrome = (window as any).browser;
  } else if (!(window as any).browser && (window as any).chrome) {
    (window as any).browser = (window as any).chrome;
  }
}

// Ensure window.customElements is defined and non-null in all Chrome extension contexts
if (typeof window !== "undefined") {
  if (!window.customElements || typeof window.customElements.define !== "function") {
    const registry = new Map<string, { constructor: any; options?: ElementDefinitionOptions }>();
    const safeRegistry = {
      define(name: string, constructor: any, options?: ElementDefinitionOptions) {
        try {
          if (window.customElements && typeof window.customElements.define === "function" && window.customElements !== (safeRegistry as any)) {
            window.customElements.define(name, constructor, options);
            return;
          }
        } catch (e) {}
        registry.set(name, { constructor, options });
      },
      get(name: string) {
        try {
          if (window.customElements && typeof window.customElements.get === "function" && window.customElements !== (safeRegistry as any)) {
            return window.customElements.get(name);
          }
        } catch (e) {}
        return registry.get(name)?.constructor;
      },
      whenDefined(name: string) {
        try {
          if (window.customElements && typeof window.customElements.whenDefined === "function" && window.customElements !== (safeRegistry as any)) {
            return window.customElements.whenDefined(name);
          }
        } catch (e) {}
        return Promise.resolve(registry.get(name)?.constructor);
      },
      upgrade(root: Node) {
        try {
          if (window.customElements && typeof window.customElements.upgrade === "function" && window.customElements !== (safeRegistry as any)) {
            window.customElements.upgrade(root);
          }
        } catch (e) {}
      },
    };

    try {
      Object.defineProperty(window, "customElements", {
        value: safeRegistry,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      (window as any).customElements = safeRegistry;
    }
  }
}

export {};
