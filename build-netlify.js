import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

function copyFileIfExists(sourceName, destinationName = sourceName) {
  const source = path.join(root, sourceName);
  const destination = path.join(out, destinationName);

  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    return false;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`Copied: ${sourceName} -> ${destinationName}`);
  return true;
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) return;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    // Never publish environment files or dependency folders.
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === '.env' ||
      entry.name.startsWith('.env.')
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// Support either common homepage filename.
const homepageCopied =
  copyFileIfExists('index.html', 'index.html') ||
  copyFileIfExists('Index.html', 'index.html');

if (!homepageCopied) {
  // Also support a homepage stored in public/index.html.
  const publicIndex = path.join(publicDir, 'index.html');

  if (fs.existsSync(publicIndex)) {
    fs.copyFileSync(publicIndex, path.join(out, 'index.html'));
    console.log('Copied: public/index.html -> index.html');
  } else {
    throw new Error(
      'Homepage not found. Add index.html, Index.html, or public/index.html.'
    );
  }
}

// Copy the known multi-page website files.
const files = [
  'Login.html',
  'Scanner.html',
  'Analysis.html',
  'Explanation.html',
  'User.html',
  'code.html',
  '404.html',
  'api-client.js',
  'auth.js',
  'navigation.js',
  'config.json',
  'site-interactions.js',
  'supabase-config.js'
];

for (const file of files) {
  copyFileIfExists(file);
}

// Include static assets stored in public/.
copyDirectory(publicDir, out);

// Add clean URL redirects.
const redirects = [
  '/login          /Login.html        200',
  '/scanner        /Scanner.html      200',
  '/analysis       /Analysis.html     200',
  '/explanation    /Explanation.html  200',
  '/user-profile   /User.html         200',
  '/code           /code.html         200',
  '/.env            /404.html          404',
  '/server.js       /404.html          404',
  '/package.json    /404.html          404',
  ''
];

fs.writeFileSync(
  path.join(out, '_redirects'),
  redirects.join('\n'),
  'utf8'
);

console.log('\nBuild successful: frontend files copied to dist/.');
console.log('Publish directory: dist/');
console.log('Backend APIs still require a separately deployed server.');
