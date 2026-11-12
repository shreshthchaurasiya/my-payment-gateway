const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const stageDir = path.join(rootDir, '.stage_hostinger');
const zipOutPath = path.join(rootDir, 'youpi-gateway.zip');

console.log('============================================================');
console.log('📦 BUILDING YOUPI PG V2 FOR HOSTINGER (gateway.adshree.com)');
console.log('============================================================');

// 1. Clean previous build
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
if (fs.existsSync(zipOutPath)) {
  fs.rmSync(zipOutPath, { force: true });
}

fs.mkdirSync(stageDir, { recursive: true });

// 2. Define top-level files to copy
const filesToCopy = [
  'server.js',
  'package.json',
  'package-lock.json',
  'README.md',
  'ARCHITECTURE.md',
  'AGENTS.md',
  '.env.example',
  'hostinger.env',
  'hostinger-full.env'
];

for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(stageDir, file));
    console.log(`[✓] Copied file: ${file}`);
  }
}

// In Hostinger, copy hostinger.env as .env by default
if (fs.existsSync(path.join(rootDir, 'hostinger.env'))) {
  fs.copyFileSync(path.join(rootDir, 'hostinger.env'), path.join(stageDir, '.env'));
  console.log(`[✓] Generated production .env from hostinger.env`);
}

// 3. Define top-level directories to copy recursively
const dirsToCopy = ['apps', 'packages', 'scripts'];

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',
  '.impeccable',
  '.system_generated',
  '.berry-sessions',
  'browser-sessions',
  '.user_uploaded',
  '.stage_hostinger',
  'dist'
]);

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      // Exclude logs and active databases
      if (
        entry.name.endsWith('.sqlite') ||
        entry.name.endsWith('.sqlite-journal') ||
        entry.name.endsWith('.db') ||
        entry.name.endsWith('.log') ||
        entry.name === 'whatsapp_session.json'
      ) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

for (const dir of dirsToCopy) {
  const src = path.join(rootDir, dir);
  if (fs.existsSync(src)) {
    console.log(`[+] Copying directory: ${dir}/...`);
    copyDirRecursive(src, path.join(stageDir, dir));
  }
}

// 4. Ensure data/ directory exists and bundle active database
const dataDir = path.join(stageDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const activeDbPath = path.join(rootDir, 'data', 'youpi_pg.sqlite');
if (fs.existsSync(activeDbPath)) {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(activeDbPath);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
  } catch {}
  fs.copyFileSync(activeDbPath, path.join(dataDir, 'youpi_pg.sqlite'));
  console.log(`[✓] Checkpointed and packaged active youpi_pg.sqlite database directly into zip!`);
} else {
  fs.writeFileSync(path.join(dataDir, '.gitkeep'), '# SQLite database persistence directory\n');
  console.log(`[✓] Created empty data/ directory for SQLite persistence`);
}

// 5. Build zip using system zip command
console.log('[+] Creating youpi-gateway.zip archive...');
try {
  // cd into staging directory so files are stored relative to root (server.js at root)
  execSync(`zip -r -q "${zipOutPath}" .`, { cwd: stageDir });
} catch (err) {
  console.error('[-] Failed to create zip archive:', err.message);
  process.exit(1);
}

// 6. Clean up staging directory
fs.rmSync(stageDir, { recursive: true, force: true });

// 7. Verify generated zip
const stat = fs.statSync(zipOutPath);
const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
console.log('============================================================');
console.log(`🎉 SUCCESS: Created ${zipOutPath} (${sizeMB} MB)`);
console.log('============================================================');

// Quick validation of zip root
try {
  const list = execSync(`unzip -l "${zipOutPath}" | head -n 25`, { encoding: 'utf8' });
  console.log('[Zip Contents Preview]:\n' + list);
} catch {}

