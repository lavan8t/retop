import net from 'net';
import fs from 'fs';
import path from 'path';

const SOCKET_PATH = '\0chrome_devtools_remote';
const CAPTURE_DIR = path.resolve(process.cwd(), 'vtop_network_captures');

if (!fs.existsSync(CAPTURE_DIR)) {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
}

// Function to fetch target tabs
function getTargets(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const client = net.connect({ path: SOCKET_PATH }, () => {
      client.write('GET /json HTTP/1.1\r\nHost: localhost\r\n\r\n');
    });
    let raw = '';
    client.on('data', (d) => {
      raw += d.toString();
      const idx = raw.indexOf('\r\n\r\n');
      if (idx !== -1) {
        try {
          const json = JSON.parse(raw.slice(idx + 4));
          client.destroy();
          resolve(json);
        } catch {}
      }
    });
    client.on('error', reject);
    setTimeout(() => {
      client.destroy();
      const idx = raw.indexOf('\r\n\r\n');
      if (idx !== -1) {
        try {
          resolve(JSON.parse(raw.slice(idx + 4)));
          return;
        } catch {}
      }
      reject(new Error('Timeout connecting to devtools socket'));
    }, 3000);
  });
}

// Low-level WebSocket client over abstract Unix domain socket
class DevToolsWS {
  private socket: net.Socket;
  private reqId = 1;
  private callbacks = new Map<number, (res: any) => void>();
  public onEvent?: (method: string, params: any) => void;

  constructor(private wsPath: string) {
    this.socket = net.connect({ path: SOCKET_PATH });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = Buffer.from(Math.random().toString()).toString('base64');
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

      this.socket.on('data', (chunk) => {
        if (!upgraded) {
          buffer = Buffer.concat([buffer, chunk]);
          const headerEnd = buffer.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const head = buffer.slice(0, headerEnd).toString();
            if (head.includes('101 Switching Protocols')) {
              upgraded = true;
              buffer = buffer.slice(headerEnd + 4);
              resolve();
            } else {
              reject(new Error('WebSocket upgrade failed: ' + head));
            }
          }
          return;
        }

        // Process WebSocket Frames
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 2) {
          const firstByte = buffer[0];
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

          const text = payload.toString('utf8');
          try {
            const msg = JSON.parse(text);
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

      this.socket.on('error', reject);
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    const id = this.reqId++;
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      const json = JSON.stringify({ id, method, params });
      const payload = Buffer.from(json);
      const header = Buffer.alloc(6);
      header[0] = 0x81; // Text frame
      header[1] = 0x80 | payload.length; // Masked (client requirement)

      // Generate mask key
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
}

async function main() {
  console.log('Searching for active VTOP / Cromite tab...');
  const targets = await getTargets();
  const pages = targets.filter((t) => t.type === 'page');

  if (pages.length === 0) {
    console.error('No pages found in Cromite. Make sure Cromite is open.');
    process.exit(1);
  }

  // Find VTOP tab or pick the most recent page
  const vtopTab =
    pages.find(
      (p) => p.url.includes('vtop') || p.title.toLowerCase().includes('vtop'),
    ) || pages[0];
  console.log(`\nAttaching to Tab: [ID: ${vtopTab.id}] ${vtopTab.title}`);
  console.log(`URL: ${vtopTab.url}\n`);

  const wsPath =
    vtopTab.webSocketDebuggerUrl?.replace('ws://localhost', '') ||
    `/devtools/page/${vtopTab.id}`;
  const ws = new DevToolsWS(wsPath);

  await ws.connect();
  console.log('DevTools WebSocket connected!');

  // Enable Network monitoring
  await ws.send('Network.enable', {
    maxResourceBufferSize: 10000000,
    maxTotalBufferSize: 20000000,
  });
  await ws.send('Page.enable');

  console.log('\n=======================================================');
  console.log(' LIVE NETWORK MONITORING ACTIVE - READY FOR NAVIGATION ');
  console.log('=======================================================\n');

  const capturedRequests = new Map<
    string,
    { url: string; method: string; postData?: string }
  >();

  ws.onEvent = async (method, params) => {
    if (method === 'Network.requestWillBeSent') {
      const { requestId, request } = params;
      capturedRequests.set(requestId, {
        url: request.url,
        method: request.method,
        postData: request.postData,
      });

      if (
        request.url.includes('vtop') ||
        request.url.includes('studentsRecord') ||
        request.url.includes('process')
      ) {
        console.log(`\n[REQUEST] ${request.method} ${request.url}`);
        if (request.postData) {
          console.log(`  Payload: ${request.postData.slice(0, 200)}`);
        }
      }
    } else if (method === 'Network.responseReceived') {
      const { requestId, response } = params;
      const req = capturedRequests.get(requestId);
      const url = response.url || req?.url || '';

      if (
        url.includes('vtop') ||
        url.includes('studentsRecord') ||
        url.includes('examinations') ||
        url.includes('academics')
      ) {
        console.log(
          `[RESPONSE] ${response.status} ${url} (${response.mimeType})`,
        );

        // Fetch response body
        setTimeout(async () => {
          try {
            const bodyRes = await ws.send('Network.getResponseBody', {
              requestId,
            });
            if (bodyRes?.result?.body) {
              const safeName = url
                .split('?')[0]
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .slice(-60);
              const filename = `${Date.now()}_${safeName}.html`;
              const filePath = path.join(CAPTURE_DIR, filename);
              fs.writeFileSync(filePath, bodyRes.result.body);
              console.log(
                `  Saved payload to: vtop_network_captures/${filename} (${bodyRes.result.body.length} bytes)`,
              );
            }
          } catch (e: any) {
            // body might be stream or not available
          }
        }, 300);
      }
    }
  };
}

main().catch((err) => {
  console.error('Capture error:', err);
});
