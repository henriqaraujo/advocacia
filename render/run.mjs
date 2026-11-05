// Gera as imagens 3D do site: node render/run.mjs [cena ...]
// Requer: npm i (esbuild, three) e o Playwright com Chromium.
import { build } from 'esbuild';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

await build({ entryPoints: ['render/scenes.js'], bundle: true, format: 'iife', outfile: 'render/dist/scenes.js', target: 'es2019', minify: true });
fs.writeFileSync('render/dist/index.html', '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}canvas{display:block}</style><body><script src="scenes.js"></script></body>');

const jobs = {
  towers: [1000, 1250],
  house: [1000, 1250],
  gear: [1000, 1250],
  gavel: [1000, 1250],
  docs: [1000, 1250],
  books: [1100, 1500],
  columns: [2200, 1000],
  skyline: [2200, 900],
  map: [2000, 760],
};
const only = process.argv.slice(2);
const names = only.length ? only : Object.keys(jobs);

const server = http.createServer((req, res) => {
  const f = path.join('render/dist', req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } });
}).listen(8799);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
fs.mkdirSync('render/raw', { recursive: true });
for (const n of names) {
  const [w, h] = jobs[n];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log(n, 'erro:', e.message));
  await page.goto(`http://localhost:8799/?scene=${n}&w=${w}&h=${h}`);
  await page.waitForFunction('window.__done === true', null, { timeout: 120000 });
  await page.screenshot({ path: `render/raw/${n}.png` });
  await page.close();
  console.log('ok', n);
}
await browser.close();
server.close();
