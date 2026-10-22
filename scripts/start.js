import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { runMigrations } from '../packages/db/src/migrate.js';
import { startControlCenter } from '../apps/control-center/src/index.js';
import { resolveRuntimeUrls } from '../packages/common/src/runtime-config.js';
import { startCloudflaredSafely } from '../packages/common/src/tunnel-command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Authoritative runtime mode enforcement (Part B1 & B4)
process.env.YOUPI_MODE = 'production';
process.env.NODE_ENV = 'production';

// In production, reliably ensure environment variables from .env are loaded
try {
  const rootEnv = path.resolve(rootDir, '.env');
  if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(rootEnv);
  }
} catch {}

console.log('====================================================');
console.log('🚀 Starting YOUPI PG V2 — Production Gateway');
console.log('====================================================');

// 1. Run database migrations & load persisted configuration (Part B3: never overwrite settings)
console.log('[1/3] Loading persisted production database & settings...');
const migrationResult = runMigrations();
const merchant = migrationResult.defaultMerchant;
const branding = merchant?.branding || {};

// 2. Validate Production Configuration (Part B2 & Part I)
const domain = (branding.cloudflareDomain || branding.domainTld || process.env.CLOUDFLARE_DOMAIN || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
const prefix = (branding.deploymentPrefix || branding.domainPrefix || process.env.DEPLOYMENT_PREFIX || 'pay').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') || 'pay';

const isStandalone = !!(process.env.PORT || process.env.STANDALONE === 'true' || !domain);

if (isStandalone && !domain) {
  console.log('[✓] Runtime Mode: STANDALONE / HOSTINGER GATEWAY (Single Public Port)');
  const masterPort = Number(process.env.PORT || 7000);

  // Set internal service ports so they never collide with masterPort
  process.env.CHECKOUT_PORTAL_PORT = process.env.CHECKOUT_PORTAL_PORT || '7100';
  process.env.PAYMENT_API_PORT = process.env.PAYMENT_API_PORT || '6100';
  process.env.MERCHANT_ADMIN_PORT = process.env.MERCHANT_ADMIN_PORT || '6001';
  process.env.CONTROL_CENTER_PORT = process.env.CONTROL_CENTER_PORT || '8090';

  console.log('[2/3] Launching Local Process Supervisor on port 8090...');
  const cc = await startControlCenter(8090);

  console.log('[3/3] Starting core production gateway services...\n');
  await cc.processManager.startAll();

  // Create Universal Hostinger Gateway Proxy on masterPort
  const http = await import('node:http');
  const masterServer = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    let targetPort = Number(process.env.CHECKOUT_PORTAL_PORT || 7100);
    if (pathname.startsWith('/api/')) {
      targetPort = Number(process.env.PAYMENT_API_PORT || 6100);
    } else if (pathname === '/' || pathname.startsWith('/admin') || pathname === '/youpi-sms-gateway.apk') {
      targetPort = Number(process.env.MERCHANT_ADMIN_PORT || 6001);
    } else if (pathname.startsWith('/checkout') || pathname === '/youpi.js' || pathname.startsWith('/sdk') || pathname.startsWith('/icons')) {
      targetPort = Number(process.env.CHECKOUT_PORTAL_PORT || 7100);
    }

    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${targetPort}`,
        'x-forwarded-host': req.headers.host || '',
        'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https'
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gateway service temporarily unavailable', details: err.message }));
      }
    });

    req.pipe(proxyReq);
  });

  masterServer.listen(masterPort, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`🟢 YOUPI PG V2 PRODUCTION GATEWAY LIVE ON PORT ${masterPort}`);
    console.log('====================================================');
    console.log(`• Checkout: http://localhost:${masterPort}/checkout/:id`);
    console.log(`• Script:   http://localhost:${masterPort}/youpi.js`);
    console.log(`• Admin:    http://localhost:${masterPort}/admin`);
    console.log(`• API:      http://localhost:${masterPort}/api/v1/health`);
    console.log('====================================================');
  });

  const shutdown = async () => {
    console.log('\nStopping all services gracefully...');
    masterServer.close();
    await cc.close();
    console.log('All processes terminated cleanly.');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} else {
if (!domain) {
  console.error('\n================================================================');
  console.error('❌ [CONFIGURATION ERROR] PRODUCTION STARTUP FAILED');
  console.error('================================================================');
  console.error('Cloudflare Domain is required when running in PRODUCTION mode.');
  console.error('Please configure your Cloudflare Domain in the Merchant Admin panel,');
  console.error('or set CLOUDFLARE_DOMAIN in .env before running `npm start`.');
  console.error('');
  console.error('YOUPI PG V2 adheres to authoritative production mode and will NOT');
  console.error('silently rewrite or fall back to localhost in production.');
  console.error('================================================================\n');
  process.exit(1);
}

let runtimeUrls;
try {
  runtimeUrls = resolveRuntimeUrls({ envMode: 'production', domain, prefix });
} catch (err) {
  console.error('\n❌ [CONFIGURATION ERROR]:', err.message);
  process.exit(1);
}

console.log(`[✓] Authoritative Runtime Mode: PRODUCTION`);
console.log(`[✓] Cloudflare Domain: ${runtimeUrls.domain}`);
console.log(`[✓] Deployment Prefix: ${runtimeUrls.prefix}\n`);

// Check for user-configured Cloudflare Tunnel command
let tunnelProcess = null;
const tunnelCmd = process.env.CLOUDFLARE_TUNNEL_COMMAND || branding.cloudflareTunnelCommand;

if (tunnelCmd && tunnelCmd.trim()) {
  console.log(`[☁️ Cloudflare Tunnel] Executing tunnel command before starting services:`);
  tunnelProcess = startCloudflaredSafely(tunnelCmd, { stdio: 'inherit' });
  if (tunnelProcess) console.log(`[✓] Cloudflare Tunnel process launched (PID: ${tunnelProcess.pid}).\n`);
  await new Promise(r => setTimeout(r, 1500));
}

// 3. Launch Process Supervisor and Production Services
console.log('[2/3] Launching Local Process Supervisor on port 8090...');
const cc = await startControlCenter(8090);

console.log('[3/3] Starting core production gateway services (Pure API & Android Observer)...\n');
await cc.processManager.startAll();

console.log('====================================================');
console.log('🟢 YOUPI PG V2 PRODUCTION GATEWAY ONLINE & ACTIVE');
console.log('====================================================');
console.log('AUTHORITATIVE PUBLIC CLOUDFLARE ROUTES:');
console.log(`• Checkout Portal:      ${runtimeUrls.checkoutUrl}  (-> :7000)`);
console.log(`• Payment Core API:     ${runtimeUrls.apiUrl}  (-> :6100)`);
console.log(`• Merchant Admin Hub:   ${runtimeUrls.adminUrl}  (-> :6001)`);
console.log(`• Gmail OAuth/Observer: ${runtimeUrls.gmailUrl}  (-> :6003)`);
console.log(`• Demo Store (Opt):     ${runtimeUrls.storeUrl}  (-> :5000)`);
console.log('----------------------------------------------------');
console.log('OBSERVATION CHANNELS:');
console.log('• Android SMS Observer: Native APK -> Public Payment API');
console.log('• Gmail API Observer:   OAuth2 API -> Public Payment API');
console.log('• Legacy Chrome CDP:    DISABLED in production');
console.log('====================================================');
console.log('Press Ctrl+C to stop all services gracefully.');

const shutdown = async () => {
  console.log('\nStopping all services gracefully...');
  if (tunnelProcess && tunnelProcess.pid) {
    try {
      console.log('Terminating Cloudflare Tunnel process...');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(tunnelProcess.pid), '/f', '/t']);
      } else {
        tunnelProcess.kill('SIGTERM');
      }
    } catch {}
  }
  await cc.close();
  console.log('All processes terminated cleanly.');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
}

