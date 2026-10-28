import net from 'net';

const ABSTRACT_SOCKET = '\0chrome_devtools_remote';

export function getTargets(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const s = net.connect({ path: ABSTRACT_SOCKET }, () => {
      s.write('GET /json HTTP/1.1\r\nHost: localhost\r\n\r\n');
    });
    let raw = '';
    s.on('data', (chunk) => {
      raw += chunk.toString();
      const splitIdx = raw.indexOf('\r\n\r\n');
      if (splitIdx !== -1) {
        const body = raw.slice(splitIdx + 4);
        try {
          const json = JSON.parse(body);
          s.destroy();
          resolve(json);
        } catch {
          // waiting for full chunk
        }
      }
    });
    s.on('error', reject);
    setTimeout(() => {
      s.destroy();
      const splitIdx = raw.indexOf('\r\n\r\n');
      if (splitIdx !== -1) {
        try {
          resolve(JSON.parse(raw.slice(splitIdx + 4)));
          return;
        } catch {}
      }
      reject(new Error('Timeout waiting for devtools data'));
    }, 2000);
  });
}

async function main() {
  const targets = await getTargets();
  const pages = targets.filter((t) => t.type === 'page');
  console.log(
    `Successfully connected! Found ${pages.length} open tabs in Cromite:\n`,
  );
  pages.forEach((p, idx) => {
    console.log(`${idx + 1}. [ID: ${p.id}] ${p.title}`);
    console.log(`   URL: ${p.url}\n`);
  });
}

main().catch((err) => {
  console.error('Connection failed:', err.message);
  process.exit(1);
});
