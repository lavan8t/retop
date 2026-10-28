import net from 'net';

const SOCKET_PATH = '\0chrome_devtools_remote';

export function queryDevTools(endpoint = '/json'): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = net.connect({ path: SOCKET_PATH }, () => {
      client.write(`GET ${endpoint} HTTP/1.1\r\nHost: localhost\r\n\r\n`);
    });

    let raw = '';
    client.on('data', (chunk) => {
      raw += chunk.toString();
      const splitIdx = raw.indexOf('\r\n\r\n');
      if (splitIdx !== -1) {
        const body = raw.slice(splitIdx + 4);
        try {
          const parsed = JSON.parse(body);
          client.destroy();
          resolve(parsed);
        } catch {
          // chunk stream continuing
        }
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    setTimeout(() => {
      client.destroy();
      const splitIdx = raw.indexOf('\r\n\r\n');
      if (splitIdx !== -1) {
        try {
          resolve(JSON.parse(raw.slice(splitIdx + 4)));
          return;
        } catch {}
      }
      reject(new Error('Timeout waiting for response from Cromite socket'));
    }, 2000);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'list';

  if (cmd === 'list') {
    const tabs = await queryDevTools('/json');
    console.log(`\nConnected to Cromite DevTools (${tabs.length} targets):\n`);
    tabs
      .filter((t: any) => t.type === 'page')
      .forEach((t: any, i: number) => {
        console.log(`${i + 1}. [${t.id}] ${t.title}`);
        console.log(`   URL: ${t.url}`);
        console.log(`   WS:  ${t.webSocketDebuggerUrl}\n`);
      });
  }
}

main().catch((err) => {
  console.error('Cromite DevTools Error:', err.message);
  process.exit(1);
});
