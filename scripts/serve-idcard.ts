const PORT = Number(process.env.PORT) || 3000;

async function buildClient() {
  const result = await Bun.build({
    entrypoints: ["src/dev-idcard.tsx"],
    outdir: "dist-dev",
    target: "browser",
    minify: false,
    sourcemap: "inline",
  });

  if (!result.success) {
    console.error("[dev-server] Build failed:", result.logs);
  }
}

await buildClient();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digital ID Card Studio</title>
  <link rel="stylesheet" href="/style.css">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/dev-idcard.js"></script>
</body>
</html>`;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      await buildClient();
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/dev-idcard.js") {
      await buildClient();
      const file = Bun.file("dist-dev/dev-idcard.js");
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "application/javascript" },
        });
      }
    }

    if (url.pathname === "/style.css") {
      const file = Bun.file("dist/style.css");
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "text/css" },
        });
      }
    }

    if (url.pathname.startsWith("/assets/")) {
      const file = Bun.file(`public${url.pathname}`);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`\n Studio ID Card server running at: http://localhost:${server.port}\n`);