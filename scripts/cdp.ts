import http from "http";

export interface DevToolsTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export async function listTargets(): Promise<DevToolsTarget[]> {
  return new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:9222/json", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

export async function evalInTab(tabIdOrUrlMatch: string, expression: string): Promise<any> {
  const targets = await listTargets();
  const target = targets.find(
    (t) => t.type === "page" && (t.id === tabIdOrUrlMatch || t.url.includes(tabIdOrUrlMatch) || t.title.includes(tabIdOrUrlMatch))
  );

  if (!target || !target.webSocketDebuggerUrl) {
    throw new Error(`Target not found matching: ${tabIdOrUrlMatch}`);
  }

  // Replace host with 127.0.0.1:9222
  const wsUrl = target.webSocketDebuggerUrl.replace("ws://localhost", "ws://127.0.0.1:9222");
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          id,
          method: "Runtime.evaluate",
          params: { expression, returnByValue: true, awaitPromise: true },
        })
      );
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);
      if (msg.id === id) {
        ws.close();
        if (msg.error) reject(msg.error);
        else resolve(msg.result?.result?.value);
      }
    };
    ws.onerror = reject;
  });
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const cmd = args[0] || "list";

  if (cmd === "list") {
    const targets = await listTargets();
    console.log(`Found ${targets.length} targets:`);
    targets
      .filter((t) => t.type === "page")
      .forEach((t) => {
        console.log(`[${t.id}] ${t.title}\n  URL: ${t.url}\n`);
      });
  } else if (cmd === "eval") {
    const tabMatch = args[1];
    const code = args.slice(2).join(" ");
    if (!tabMatch || !code) {
      console.log("Usage: bun scripts/cdp.ts eval <tab_id_or_url> <code>");
      process.exit(1);
    }
    const result = await evalInTab(tabMatch, code);
    console.log("Result:", result);
  }
}
