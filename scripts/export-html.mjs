import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const [html, css, content, search, app, favicon] = await Promise.all([
  read('index.html'), read('src/style.css'), read('src/content.js'), read('src/search.js'), read('src/app.js'), read('src/favicon.svg'),
]);
const stripModules = source => source.replace(/^import .*?;\r?\n/gm, '').replace(/^export /gm, '');
const image = 'data:image/svg+xml;base64,' + Buffer.from(favicon).toString('base64');
const referenceImage = 'data:image/png;base64,' + (await readFile(resolve(root, 'src/cowork-code-reference.png'))).toString('base64');
const js = [content, search, app].map(stripModules).join('\n\n').replaceAll('/src/favicon.svg', image).replaceAll('/src/cowork-code-reference.png', referenceImage).replace(/<\/script/gi, '<\\/script');
const bundled = html
  .replace('href="/src/favicon.svg"', () => `href="${image}"`)
  .replace('<link rel="stylesheet" href="/src/style.css" />', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace('<script type="module" src="/src/app.js"></script>', () => `<script type="module">${js}</script>`);
await mkdir(resolve(root, 'dist'), {recursive:true});
await writeFile(resolve(root, 'dist/Apostila-Claude.html'), bundled);
console.log('Exportado: dist/Apostila-Claude.html — abra em um navegador moderno.');
