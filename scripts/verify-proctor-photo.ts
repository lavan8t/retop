/**
 * Verifies the proctor-photo guard against a real DOM.
 *
 * The parser needs DOMParser, which Bun's test runner does not provide, and rule
 * 9 says not to add a DOM-shim dependency just for this. So the parser is bundled
 * standalone and executed inside Chromium, where the DOM it actually targets
 * exists.
 *
 * Usage: bun run scripts/verify-proctor-photo.ts
 */
let chromium: (typeof import('playwright'))['chromium'] | undefined;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error(
    'playwright not installed: bun add -d playwright (optional dev dependency)',
  );
  process.exit(1);
}
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dir, '..');
const work = mkdtempSync(join(tmpdir(), 'retop-proctor-'));

const STUDENT_URI = `data:image/jpeg;base64,${'A'.repeat(200)}`;
const FACULTY_URI = `data:image/jpeg;base64,${'F'.repeat(200)}`;

const wrap = (proctorImg: string, studentImg = STUDENT_URI) => `
<html><body>
  <div id="collapseTwo"><img src="${studentImg}" /></div>
  <div id="collapseFour">
    <table><tr>
      <td>FACULTY NAME</td><td>DR. PROCTOR SMITH</td>
      <td>DESIGNATION</td><td>Associate Professor</td>
      <td>FACULTY ID</td><td>FAC9999</td>
    </tr></table>
    ${proctorImg}
  </div>
</body></html>`;

const CASES: { name: string; html: string; expect: string }[] = [
  {
    name: 'rejects a studentPhoto path in the proctor section',
    html: wrap(`<img src="/vtop/users/image/studentPhoto?id=21BCE0001" />`),
    expect: '',
  },
  {
    name: 'rejects the byte-identical inlined student photo',
    html: wrap(`<img src="${STUDENT_URI}" />`),
    expect: '',
  },
  {
    name: 'keeps a genuine inline faculty photo',
    html: wrap(`<img src="${FACULTY_URI}" />`),
    expect: FACULTY_URI,
  },
  {
    name: 'keeps a staffPhoto path for the resolver to fetch',
    html: wrap(`<img src="users/image/staffPhoto?id=FAC9999" />`),
    expect: '/vtop/users/image/staffPhoto?id=FAC9999',
  },
];

const bundle = await Bun.build({
  entrypoints: [join(ROOT, 'src/parsers/profile.ts')],
  target: 'browser',
  format: 'esm',
  minify: false,
});

if (!bundle.success) {
  console.error(bundle.logs);
  process.exit(1);
}

const modPath = join(work, 'profile.mjs');
const bundleText = await bundle.outputs[0]!.text();
writeFileSync(modPath, bundleText);

// Chromium refuses ES module imports from file:// URLs, so serve the bundle over
// loopback HTTP. This also gives the page a real origin for the fetch calls.
const server = Bun.serve({
  port: 0,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/profile.mjs') {
      return new Response(bundleText, {
        headers: { 'content-type': 'text/javascript' },
      });
    }
    return new Response('<!doctype html><title>harness</title>', {
      headers: { 'content-type': 'text/html' },
    });
  },
});
const modUrl = `${server.url.origin}/profile.mjs`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(server.url.origin, { waitUntil: 'domcontentloaded' });
let failed = 0;

for (const c of CASES) {
  const actual = await page.evaluate(
    async ({ modUrl, html }) => {
      const m = (await import(/* @vite-ignore */ modUrl)) as any;
      const p = m.parseStudentProfile(html);
      return {
        photoUrl: p.proctor.photoUrl,
        name: p.proctor.name,
        id: p.proctor.id,
      };
    },
    { modUrl, html: c.html },
  );

  const ok =
    actual.photoUrl === c.expect && actual.name === 'DR. PROCTOR SMITH';
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!ok) {
    console.log(`        expected ${JSON.stringify(c.expect)}`);
    console.log(`        actual   ${JSON.stringify(actual.photoUrl)}`);
  }
}

const resolver = await page.evaluate(
  async ({ modUrl }) => {
    const m = (await import(/* @vite-ignore */ modUrl)) as any;
    const STUDENT = `data:image/jpeg;base64,${'A'.repeat(200)}`;
    const FACULTY = `data:image/jpeg;base64,${'F'.repeat(200)}`;

    // No id and no usable src: nothing to fetch, must stay empty.
    const none = await m.resolveProctorPhoto({
      basic: { photoUrl: '' },
      proctor: { id: '', photoUrl: '', name: 'x' },
    });

    // Already a genuine inline photo: returned untouched, no fetch attempted.
    const real = await m.resolveProctorPhoto({
      basic: { photoUrl: STUDENT },
      proctor: { id: 'FAC1', photoUrl: FACULTY, name: 'x' },
    });

    return { none: none.proctor.photoUrl, real: real.proctor.photoUrl };
  },
  { modUrl },
);

const noFabricate = resolver.none === '';
if (!noFabricate) failed++;
console.log(
  `${noFabricate ? 'PASS' : 'FAIL'}  resolveProctorPhoto does not fabricate a photo without an id`,
);

const untouched = resolver.real === FACULTY_URI;
if (!untouched) failed++;
console.log(
  `${untouched ? 'PASS' : 'FAIL'}  resolveProctorPhoto leaves a genuine photo untouched`,
);

await browser.close();
server.stop(true);
rmSync(work, { recursive: true, force: true });

console.log(
  failed === 0
    ? '\nAll proctor photo checks passed.'
    : `\n${failed} check(s) failed.`,
);
process.exit(failed === 0 ? 0 : 1);
