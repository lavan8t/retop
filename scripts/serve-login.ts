/**
 * Login takeover harness — serves dist/ and a page that boots the real
 * dist/login.js takeover, so the shadow root, adopted stylesheets and theme
 * application are exercised exactly as in the extension.
 *
 * Usage: bun scripts/serve-login.ts [light|dark|amoled]
 */
const PORT = Number(process.env.PORT) || 3100;
const THEME = process.argv[2] || 'dark';
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

const THEMES = {
  light: { themeMode: 'light', pureBlack: false },
  dark: { themeMode: 'dark', pureBlack: false },
  amoled: { themeMode: 'dark', pureBlack: true },
};

const page = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>login harness</title></head>
<body style="margin:0">
<!-- Delays the load event so the headless screenshot waits for the render. -->
<img src="/slow.png" style="position:absolute;width:1px;height:1px;opacity:0" alt="">
<script>
  const base = location.origin + "/dist/";
  window.chrome = {
    runtime: {
      getURL: (p) => (p.startsWith("dist/") ? location.origin + "/" + p : base + p),
      getManifest: () => ({ content_scripts: [{ js: ["dist/content.js"] }] }),
      sendMessage: (m, cb) => { try { cb && cb({ success: true }); } catch (e) {} },
      onMessage: { addListener() {} },
      lastError: undefined,
    },
    storage: { local: { get: (_k, cb) => cb && cb({}), set: () => {}, remove: () => {} } },
  };

  const settings = Object.assign({
    defaultView: "modern", themeMode: "dark", vtopThemeMode: "same",
    accentColor: "orange", colorSchemeStyle: "vibrant",
    pureBlack: false, fontScale: 100, fontWeight: "bold",
    animationScale: "1x", timeFormat: "12h", pinnedLinks: [],
  }, ${JSON.stringify(THEMES[THEME])});

  // The settings store keeps its blob in IndexedDB, encoded as "enc_"+base64.
  const encoded = "enc_" + btoa(JSON.stringify({ state: { settings }, version: 0 }));

  function seed() {
    return new Promise((resolve) => {
      const req = indexedDB.open("keyval-store");
      req.onupgradeneeded = () => req.result.createObjectStore("keyval");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("keyval", "readwrite");
        tx.objectStore("keyval").put(encoded, "retop-settings");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      };
      req.onerror = () => resolve();
    });
  }

  seed().then(() => import("/dist/login.js")).then(() => {
    setTimeout(() => {
      const host = document.getElementById("retop-host");
      const sr = host && host.shadowRoot;
      const root = sr && sr.querySelector("#retop-root");
      const btn = sr && sr.querySelector(".btn-primary");
      const logo = sr && sr.querySelector("img[src*='vitLogo']");
      const out = [];
      if (root) {
        out.push("root data-theme = " + root.getAttribute("data-theme"));
        out.push("root inline --accent-base = " + root.style.getPropertyValue("--accent-base"));
        out.push("root inline --accent-on-dark = " + root.style.getPropertyValue("--accent-on-dark"));
        out.push("root inline --text-main = " + root.style.getPropertyValue("--text-main"));
        const cs = getComputedStyle(root);
        out.push("computed --bg-main = " + cs.getPropertyValue("--bg-main"));
        out.push("computed --text-main = " + cs.getPropertyValue("--text-main"));
        out.push("computed --accent-base = " + cs.getPropertyValue("--accent-base"));
        out.push("computed --accent-on-dark = " + cs.getPropertyValue("--accent-on-dark"));
        out.push("computed --vit-logo-invert = " + cs.getPropertyValue("--vit-logo-invert"));
      } else out.push("no #retop-root found");
      if (btn) {
        const b = getComputedStyle(btn);
        out.push("btn bg = " + b.backgroundColor + "  color = " + b.color);
      } else out.push("no .btn-primary");
      if (logo) out.push("logo filter = " + getComputedStyle(logo).filter);
      const pre = document.createElement("pre");
      pre.style.cssText = "position:fixed;inset:0;z-index:2147483647;margin:0;padding:8px;background:#fff;color:#000;font:12px monospace;white-space:pre-wrap;pointer-events:none";
      pre.textContent = out.join("\\n");
      // Inside the shadow root, so the host overlay cannot hide it.
      (root || document.body).appendChild(pre);
    }, 1500);
  }).catch((e) => {
    document.title = "ERROR " + e;
    const p = document.createElement("pre");
    p.style.cssText = "color:red;font:12px monospace";
    p.textContent = String(e && e.stack || e);
    document.body.appendChild(p);
  });
</script>
</body>
</html>`;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(page, { headers: { 'Content-Type': 'text/html' } });
    }
    // Holds the load event open long enough for the takeover to render.
    if (url.pathname === '/slow.png') {
      await new Promise((r) => setTimeout(r, 4000));
      return new Response(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
        { headers: { 'Content-Type': 'image/png' } },
      );
    }
    const file = Bun.file(ROOT + url.pathname);
    if (await file.exists()) return new Response(file);
    return new Response('Not Found', { status: 404 });
  },
});

console.log(
  `\n Login harness (${THEME}) at http://localhost:${server.port}/\n`,
);
