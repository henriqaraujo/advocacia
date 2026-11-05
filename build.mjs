// Build do site Advocacia
// Uso: npm run build   (gera index.html, js/app.js e copia as fontes)
import { build } from 'esbuild';
import fs from 'node:fs';

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: 'js/app.js',
  target: 'es2019',
  legalComments: 'none',
});

// Fontes (arquivos locais, sem depender de Google Fonts)
fs.mkdirSync('fonts', { recursive: true });
const fontFiles = [
  ['node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2'],
  ['node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2'],
  ['node_modules/@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2'],
];
for (const [src] of fontFiles) fs.copyFileSync(src, 'fonts/' + src.split('/').pop());

// Icones Phosphor embutidos no HTML: {{icon:nome}} ou {{icon:nome:light}}
let html = fs.readFileSync('src/index.template.html', 'utf8');
html = html.replace(/\{\{icon:([a-z-]+)(?::([a-z]+))?\}\}/g, (_, name, weight = 'regular') => {
  const file = weight === 'regular' ? `${name}.svg` : `${name}-${weight}.svg`;
  const svg = fs.readFileSync(`node_modules/@phosphor-icons/core/assets/${weight}/${file}`, 'utf8').trim();
  return svg.replace('<svg', '<svg class="ico" aria-hidden="true" focusable="false"');
});
fs.writeFileSync('index.html', html);
console.log('ok');
