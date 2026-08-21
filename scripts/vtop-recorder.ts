import net from "net";
import fs from "fs";
import path from "path";

const SOCKET_PATH = "\0chrome_devtools_remote";
const CAPTURE_DIR = path.resolve(process.cwd(), "vtop_network_captures");

if (!fs.existsSync(CAPTURE_DIR)) {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
}

function log(msg: string) {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.resolve(process.cwd(), "scripts/recorder.log"), line + "\n");
}

function getTargets(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const client = net.connect({ path: SOCKET_PATH }, () => {
      client.write("GET /json HTTP/1.1\r\nHost: localhost\r\n\r\n");
    });
    let raw = "";
    client.on("data", (d) => {
      raw += d.toString();
      const idx = raw.indexOf("\r\n\r\n");
      if (idx !== -1) {
        try {
          const json = JSON.parse(raw.slice(idx + 4));
          client.destroy();
          resolve(json);
        } catch {}
      }
    });
    client.on("error", reject);
    setTimeout(() => {
      client.destroy();
      const idx = raw.indexOf("\r\n\r\n");
      if (idx !== -1) {
        try {
          resolve(JSON.parse(raw.slice(idx + 4)));
          return;
        } catch {}
      }
      reject(new Error("timeout"));
    }, 2000);
  });
}

class DevToolsWS {
  private socket: net.Socket;
  private reqId = 1;
  private callbacks = new Map<number, (res: any) => void>();
  public onEvent?: (method: string, params: any) => void;
  public isConnected = false;

  constructor(private wsPath: string) {
    this.socket = net.connect({ path: SOCKET_PATH });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = Buffer.from(Math.random().toString()).toString("base64");
      const req =
        `GET ${this.wsPath} HTTP/1.1\r\n` +
        `Host: localhost\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`;

      this.socket.write(req);

      let upgraded = false;
      let buffer = Buffer.alloc(0);

      this.socket.on("data", (chunk) => {
        if (!upgraded) {
          buffer = Buffer.concat([buffer, chunk]);
          const headerEnd = buffer.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            const head = buffer.slice(0, headerEnd).toString();
            if (head.includes("101 Switching Protocols")) {
              upgraded = true;
              this.isConnected = true;
              buffer = buffer.slice(headerEnd + 4);
              resolve();
            } else {
              reject(new Error("WebSocket upgrade failed"));
            }
          }
          return;
        }

        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 2) {
          const secondByte = buffer[1];
          const isMasked = (secondByte & 0x80) !== 0;
          let payloadLen = secondByte & 0x7f;
          let offset = 2;

          if (payloadLen === 126) {
            if (buffer.length < 4) break;
            payloadLen = buffer.readUInt16BE(2);
            offset = 4;
          } else if (payloadLen === 127) {
            if (buffer.length < 10) break;
            payloadLen = Number(buffer.readBigUInt64BE(2));
            offset = 10;
          }

          let maskKey: Buffer | null = null;
          if (isMasked) {
            if (buffer.length < offset + 4) break;
            maskKey = buffer.slice(offset, offset + 4);
            offset += 4;
          }

          if (buffer.length < offset + payloadLen) break;

          const payload = buffer.slice(offset, offset + payloadLen);
          if (isMasked && maskKey) {
            for (let i = 0; i < payload.length; i++) {
              payload[i] ^= maskKey[i % 4];
            }
          }

          buffer = buffer.slice(offset + payloadLen);

          try {
            const msg = JSON.parse(payload.toString("utf8"));
            if (msg.id && this.callbacks.has(msg.id)) {
              const cb = this.callbacks.get(msg.id)!;
              this.callbacks.delete(msg.id);
              cb(msg);
            } else if (msg.method && this.onEvent) {
              this.onEvent(msg.method, msg.params);
            }
          } catch {}
        }
      });

      this.socket.on("error", reject);
      this.socket.on("close", () => {
        this.isConnected = false;
      });
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    const id = this.reqId++;
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      const json = JSON.stringify({ id, method, params });
      const payload = Buffer.from(json);
      const header = Buffer.alloc(6);
      header[0] = 0x81;
      header[1] = 0x80 | payload.length;

      const mask = Buffer.from([
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
      ]);
      header[2] = mask[0];
      header[3] = mask[1];
      header[4] = mask[2];
      header[5] = mask[3];

      const maskedPayload = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i++) {
        maskedPayload[i] = payload[i] ^ mask[i % 4];
      }

      this.socket.write(Buffer.concat([header, maskedPayload]));
    });
  }

  close() {
    this.socket.destroy();
  }
}

let activeWS: DevToolsWS | null = null;
let currentTabId = "";

async function attachToTab() {
  try {
    const targets = await getTargets();
    const pages = targets.filter((t) => t.type === "page");
    if (pages.length === 0) return;

    const vtopTab = pages.find((p) => p.url.includes("vtop") || p.title.toLowerCase().includes("vtop")) || pages[0];

    if (activeWS?.isConnected && currentTabId === vtopTab.id) {
      return; // already attached
    }

    if (activeWS) {
      activeWS.close();
      activeWS = null;
    }

    currentTabId = vtopTab.id;
    const wsPath = vtopTab.webSocketDebuggerUrl?.replace("ws://localhost", "") || `/devtools/page/${vtopTab.id}`;
    log(`Attaching to Tab [${vtopTab.id}]: ${vtopTab.title} (${vtopTab.url})`);

    const ws = new DevToolsWS(wsPath);
    await ws.connect();
    activeWS = ws;
    log(`WebSocket connected to Tab [${vtopTab.id}]`);

    await ws.send("Network.enable", { maxResourceBufferSize: 15000000, maxTotalBufferSize: 30000000 });
    await ws.send("Page.enable");
    await ws.send("Runtime.enable");

    // Also take a snapshot of current DOM
    try {
      const evalRes = await ws.send("Runtime.evaluate", {
        expression: "JSON.stringify({ url: window.location.href, title: document.title, html: document.documentElement.outerHTML })",
        returnByValue: true,
      });
      if (evalRes?.result?.result?.value) {
        const pageData = JSON.parse(evalRes.result.result.value);
        const name = `snapshot_${Date.now()}_${pageData.url.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-40)}.html`;
        fs.writeFileSync(path.join(CAPTURE_DIR, name), pageData.html);
        log(`Saved current DOM snapshot to: ${name} (${pageData.html.length} chars)`);
      }
    } catch {}

    const requests = new Map<string, { url: string; method: string }>();

    ws.onEvent = async (method, params) => {
      if (method === "Network.requestWillBeSent") {
        const { requestId, request } = params;
        requests.set(requestId, { url: request.url, method: request.method });
        if (request.url.includes("vtop") || request.url.includes("process") || request.url.includes("Student") || request.url.includes("studentsRecord")) {
          log(`--> [REQ] ${request.method} ${request.url}`);
        }
      } else if (method === "Network.responseReceived") {
        const { requestId, response } = params;
        const req = requests.get(requestId);
        const url = response.url || req?.url || "";

        if (url.includes("vtop") || url.includes("studentsRecord") || url.includes("examinations") || url.includes("academics")) {
          log(`<-- [RES] ${response.status} ${url} (${response.mimeType})`);
          setTimeout(async () => {
            try {
              const bodyRes = await ws.send("Network.getResponseBody", { requestId });
              if (bodyRes?.result?.body) {
                const safeName = url.split("?")[0].replace(/[^a-zA-Z0-9_-]/g, "_").slice(-50);
                const filename = `resp_${Date.now()}_${safeName}.html`;
                fs.writeFileSync(path.join(CAPTURE_DIR, filename), bodyRes.result.body);
                log(`✓ Saved response: ${filename} (${bodyRes.result.body.length} bytes)`);
              }
            } catch {}
          }, 300);
        }
      } else if (method === "Page.loadEventFired" || method === "Page.domContentEventFired") {
        try {
          const evalRes = await ws.send("Runtime.evaluate", {
            expression: "JSON.stringify({ url: window.location.href, title: document.title, html: document.documentElement.outerHTML })",
            returnByValue: true,
          });
          if (evalRes?.result?.result?.value) {
            const pageData = JSON.parse(evalRes.result.result.value);
            const name = `page_${Date.now()}_${pageData.url.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-40)}.html`;
            fs.writeFileSync(path.join(CAPTURE_DIR, name), pageData.html);
            log(`✓ Page DOM captured: ${name}`);
          }
        } catch {}
      }
    };
  } catch (e: any) {
    // idle / waiting for foreground
  }
}

log("Starting VTOP Network & DOM Recorder Daemon...");
setInterval(attachToTab, 2000);
attachToTab();
