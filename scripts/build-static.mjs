// Builds a fully static copy of the game into dist/ for GitHub Pages (or any static host).
// The browser runs the scoring rules itself via static/static-api.mjs, so no server is needed.
import { cp, mkdir, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { SITE } from '../src/config.mjs';
import { homePage, infoPage } from '../src/html.mjs';

SITE.origin = process.env.PAGES_ORIGIN || 'https://nothing17777.github.io/riftdive';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/content', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('src/content/bank.mjs', 'dist/content/bank.mjs');
await cp('static/static-api.mjs', 'dist/static-api.mjs');
await writeFile('dist/.nojekyll', '');

// Relative paths so the site works under /<repo>/ as well as at a domain root.
const relative = text => text
  .replaceAll('"/assets/', '"assets/').replaceAll("'/assets/", "'assets/").replaceAll('`/assets/', '`assets/')
  .replaceAll('"/style.css"', '"style.css"').replaceAll('"/app.mjs"', '"static-api.mjs"></script><script type="module" src="app.mjs"')
  .replaceAll('href="/privacy"', 'href="privacy.html"').replaceAll('href="/about"', 'href="about.html"').replaceAll('href="/"', 'href="./"');
await writeFile('dist/index.html', relative(homePage('en', { LOCAL_DEVELOPMENT: 'false' })));
await writeFile('dist/about.html', relative(infoPage('/about')));
await writeFile('dist/privacy.html', relative(infoPage('/privacy')));
for (const f of ['app.mjs', 'ocean.mjs', 'presentation.mjs', 'style.css']) await writeFile('dist/' + f, relative(await readFile('dist/' + f, 'utf8')).replaceAll("url('/assets/", "url('assets/"));
console.log('Static build ready in dist/ (' + (await readdir('dist')).length + ' entries), origin ' + SITE.origin);
