import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
const allowedFiles = [
  'index.html', 'Login.html', 'Scanner.html', 'Analysis.html',
  'Explanation.html', 'User.html', 'code.html', '404.html',
  'api-client.js', 'auth.js', 'navigation.js', 'config.json',
  'site-interactions.js', 'supabase-config.js'
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of allowedFiles) {
  const src = path.join(root, file);
  if (fs.existsSync(src) && fs.statSync(src).isFile()) {
    fs.copyFileSync(src, path.join(out, file));
  }
}
fs.writeFileSync(path.join(out, '_redirects'), [
  '/login          /Login.html       200',
  '/scanner        /Scanner.html     200',
  '/analysis       /Analysis.html    200',
  '/explanation    /Explanation.html 200',
  '/user-profile   /User.html        200',
  '/code           /code.html        200',
  '/.env           /404.html         404',
  '/server.js      /404.html         404',
  '/package.json   /404.html         404',
  ''
].join('\n'));
console.log('Build successful: static site files copied to dist/.');
console.log('Important: Netlify deploys the frontend only; server.js APIs require a separate backend deployment.');
