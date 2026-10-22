import http from 'node:http';
import { runMigrations } from './packages/db/src/migrate.js';
import { createPaymentApp } from './apps/payment-api/src/index.js';
import { CheckoutServer } from './apps/checkout-portal/src/server.js';
import { AdminServer } from './apps/dashboard/src/server.js';

process.env.YOUPI_MODE = 'production';
process.env.NODE_ENV = 'production';
if (!process.env.YOUPI_ALLOW_PRIVATE_WEBHOOKS) {
  process.env.YOUPI_ALLOW_PRIVATE_WEBHOOKS = 'true';
}

console.log('====================================================');
console.log('🚀 Starting YOUPI PG V2 — Sovereign LiteSpeed Gateway');
console.log('====================================================');

// 1. Run migrations
console.log('[1/2] Checking database migrations...');
runMigrations();
console.log('[✓] Database ready.');

// 2. Instantiate all core subsystems in-memory
console.log('[2/2] Booting core subsystems in-memory...');
const paymentApp = createPaymentApp();
const checkoutServer = new CheckoutServer();
const adminServer = new AdminServer();

const paymentHandler = paymentApp.rawServer.listeners('request')[0];
const checkoutHandler = checkoutServer.createServer().listeners('request')[0];
const adminHandler = adminServer.createServer().listeners('request')[0];

const masterPort = Number(process.env.PORT || 7000);

// 3. Single Master HTTP Server (LiteSpeed lsnode.js standard: exactly one listen call)
const masterServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Direct in-memory dispatch (0ms latency, zero proxy sockets, zero port conflicts)
  if (pathname.startsWith('/api/')) {
    paymentHandler(req, res);
  } else if (
    pathname.startsWith('/checkout') ||
    pathname === '/youpi.js' ||
    pathname.startsWith('/icons/')
  ) {
    // /checkout/:id, /youpi.js client SDK, payment icons
    checkoutHandler(req, res);
  } else {
    // Everything else: /, /login, /signup, /dashboard, landing pages, static CSS/JS/APK, etc.
    adminHandler(req, res);
  }
});

masterServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${masterPort} is already in use by another process.`);
    console.error(`💡 Tip: Ek aur instance already chal raha hai. Aap 'fuser -k ${masterPort}/tcp' ya 'npx kill-port ${masterPort}' chala kar use free kar sakte ho.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

masterServer.listen(masterPort, () => {
  console.log('====================================================');
  console.log(`🟢 YOUPI PG V2 PRODUCTION GATEWAY LIVE ON PORT ${masterPort}`);
  console.log('====================================================');
  console.log(`• Dashboard: http://localhost:${masterPort}/dashboard`);
  console.log(`• Checkout:  http://localhost:${masterPort}/checkout/:id`);
  console.log(`• Script:    http://localhost:${masterPort}/youpi.js`);
  console.log(`• API:       http://localhost:${masterPort}/api/v1/health`);
  console.log('====================================================');
});
