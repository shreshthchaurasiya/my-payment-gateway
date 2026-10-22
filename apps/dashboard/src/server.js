import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase, MerchantRepository, SupportTicketRepository, UserRepository } from '@youpi/db';
import { getAdminToken, safeEqual } from '@youpi/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Security headers applied to every response served by the merchant admin. */
const BASE_SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'; object-src 'none'"
});

/** Extracts authenticated user session from cookie or Authorization Bearer */
function getAuthSession(req, userRepo) {
  let token = null;
  const match = /^Bearer\s+(.+)$/i.exec(req.headers?.['authorization'] || '');
  if (match) token = match[1].trim();
  if (!token && req.headers?.cookie) {
    const cMatch = /(?:^|;\s*)ypg_session=([^;]+)/.exec(req.headers.cookie);
    if (cMatch) token = decodeURIComponent(cMatch[1].trim());
  }
  if (!token) return null;
  return userRepo.findSessionByToken(token);
}

/** True when the caller presented the admin bearer token in constant time. */
function hasAdminToken(req, url, userRepo = null) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers?.['authorization'] || '');
  if (match && safeEqual(match[1].trim(), getAdminToken())) return true;
  const qToken = url?.searchParams?.get('token');
  if (qToken && safeEqual(qToken.trim(), getAdminToken())) return true;
  if (userRepo) {
    const session = getAuthSession(req, userRepo);
    if (session && session.role === 'SUPER_ADMIN') return true;
  }
  return false;
}

/**
 * Strips headers a browser must not be able to spoof when relaying to an internal service.
 */
function sanitizedForwardHeaders(req, targetHost) {
  const headers = { ...req.headers, host: targetHost };
  for (const name of Object.keys(headers)) {
    const lower = name.toLowerCase();
    if (lower === 'x-internal-render' || lower === 'x-internal-token') {
      delete headers[name];
    }
  }
  return headers;
}

// In production, reliably ensure environment variables from .env are loaded if not already provided
if (!process.env.BASE_PAYMENT_API_URL && typeof process.loadEnvFile === 'function') {
  try {
    const rootEnv = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(rootEnv)) {
      process.loadEnvFile(rootEnv);
    }
  } catch {}
}

export class AdminServer {
  /**
   * @param {{
   *   db?: import('@youpi/db').Database,
   *   apiBaseUrl?: string
   * }} options
   */
  constructor(options = {}) {
    this.db = options.db || getDatabase();
    this.apiBaseUrl = options.apiBaseUrl || process.env.BASE_PAYMENT_API_URL || 'http://localhost:6100';
    this.merchantRepo = new MerchantRepository(this.db);
    this.ticketRepo = new SupportTicketRepository(this.db);
    this.userRepo = new UserRepository(this.db);
    this.htmlTemplatePath = path.join(__dirname, 'views', 'dashboard.html');
    this.loginTemplatePath = path.join(__dirname, 'views', 'login.html');
    this.template = fs.readFileSync(this.htmlTemplatePath, 'utf8');
  }

  renderHtml(user = null, merchant = null) {
    try {
      this.template = fs.readFileSync(this.htmlTemplatePath, 'utf8');
    } catch {}

    let html = this.template;
    // Always use empty string '' so client fetch calls hit the merchant admin's own /api proxy!
    // This completely eliminates CORS errors, tunnel downtime 530s, and cross-origin failures.
    const clientApiBase = '';
    html = html.replaceAll('{{API_BASE_URL}}', clientApiBase);
    html = html.replaceAll('{{ADMIN_API_TOKEN}}', getAdminToken() || '');

    const userInfo = user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId
    } : { role: 'SUPER_ADMIN', name: 'Super Admin', email: 'admin@adshree.com' };

    const merchantInfo = merchant ? {
      id: merchant.id,
      businessName: merchant.businessName,
      slug: merchant.slug,
      contactEmail: merchant.contactEmail,
      contactPhone: merchant.contactPhone,
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      branding: merchant.branding
    } : null;

    html = html.replaceAll('{{CURRENT_USER_JSON}}', JSON.stringify(userInfo));
    html = html.replaceAll('{{CURRENT_MERCHANT_JSON}}', JSON.stringify(merchantInfo));
    return html;
  }

  renderLogin() {
    try {
      return fs.readFileSync(this.loginTemplatePath, 'utf8');
    } catch {
      return '<h1>Login view missing</h1>';
    }
  }

  renderMerchant(user = null, merchant = null) {
    return this.renderHtml(user, merchant);
  }

  createServer() {
    return http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = url.pathname;

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
      }

      // Health
      if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'UP', service: 'merchant-admin' }));
        return;
      }

      // Admin Tickets API: GET /api/admin/tickets
      if (pathname === '/api/admin/tickets') {
        if (!hasAdminToken(req)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
          return;
        }
        const merchants = this.merchantRepo.findAll();
        const mId = merchants[0]?.id || '00000000-0000-0000-0000-000000000001';
        const tickets = this.ticketRepo.findTicketsByMerchant(mId);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          ...BASE_SECURITY_HEADERS
        });
        res.end(JSON.stringify(tickets));
        return;
      }

      // Merged Control Center Supervisor Proxy: /api/services/* and /api/logs/stream -> Control Center on port 8090
      // Relaying this unauthenticated would republish process control and every service's
      // stdout/stderr on the internet-facing admin host, so the admin token is required.
      if (pathname.startsWith('/api/services') || pathname === '/api/logs/stream') {
        if (!hasAdminToken(req, url)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
          return;
        }
        const ccPort = Number(process.env.CONTROL_CENTER_PORT || 8090);
        const proxyReq = http.request({
          hostname: '127.0.0.1',
          port: ccPort,
          path: req.url,
          method: req.method,
          headers: {
            ...sanitizedForwardHeaders(req, `localhost:${ccPort}`),
            authorization: `Bearer ${getAdminToken()}`
          }
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Control center supervisor unavailable', details: err.message }));
          }
        });

        req.on('data', chunk => proxyReq.write(chunk));
        req.on('end', () => proxyReq.end());
        return;
      }

      // Transparent API Proxy: /api/* -> Payment Core REST API
      if (pathname.startsWith('/api/')) {
        const targetPort = Number(process.env.PAYMENT_API_PORT || 6100);
        const defaultMerchant = this.merchantRepo.getDefault ? this.merchantRepo.getDefault() : (this.merchantRepo.findById('00000000-0000-0000-0000-000000000001') || this.merchantRepo.findAll()[0]);
        const defaultMerchantId = defaultMerchant?.id || '00000000-0000-0000-0000-000000000001';
        const session = getAuthSession(req, this.userRepo);
        const activeMerchantId = (session && session.merchantId) ? session.merchantId : (req.headers['x-merchant-id'] || defaultMerchantId);

        const proxyReq = http.request({
          hostname: '127.0.0.1',
          port: targetPort,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            'x-merchant-id': activeMerchantId,
            host: `localhost:${targetPort}`,
            'x-forwarded-host': req.headers.host || '',
            'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http'
          }
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Gateway API unavailable', details: err.message }));
          }
        });

        req.pipe(proxyReq);
        return;
      }

      // Download Android Companion APK
      if (pathname === '/youpi-sms-gateway.apk' || pathname === '/api/v1/admin/sms-gateway/download-apk') {
        const apkCandidates = [
          path.resolve(__dirname, '../public/youpi-sms-gateway.apk'),
          path.resolve(__dirname, '../../payment-api/public/youpi-sms-gateway.apk'),
          path.resolve(__dirname, '../../android-observer-app/youpi-sms-gateway.apk')
        ];
        let apkPath = null;
        for (const p of apkCandidates) {
          if (fs.existsSync(p)) {
            apkPath = p;
            break;
          }
        }
        if (apkPath) {
          const stat = fs.statSync(apkPath);
          res.writeHead(200, {
            'Content-Type': 'application/vnd.android.package-archive',
            'Content-Disposition': 'attachment; filename="youpi-sms-gateway.apk"',
            'Content-Length': stat.size,
            'Access-Control-Allow-Origin': '*'
          });
          const stream = fs.createReadStream(apkPath);
          stream.pipe(res);
          return;
        }
      }

      // Static Assets: GET /css/*, /js/*, /images/*, /assets/*, or any file placed in apps/dashboard/public
      const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
      const filePath = path.join(__dirname, '../public', safePath);
      if (pathname !== '/' && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const MIME_MAP = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.mjs': 'application/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.apk': 'application/vnd.android.package-archive'
        };
        const contentType = MIME_MAP[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'public, max-age=300' : 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }

      // 1. Auth Page: GET /login or GET /signup
      if (pathname === '/login' || pathname === '/signup') {
        const html = this.renderLogin();
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...BASE_SECURITY_HEADERS
        });
        res.end(html);
        return;
      }

      // 2. Redirect legacy /admin and /merchant to canonical /dashboard
      if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/merchant' || pathname.startsWith('/merchant/')) {
        res.writeHead(301, { 'Location': '/dashboard' });
        res.end();
        return;
      }

      // 3. Root Route (Landing Page Support or Auto-Redirect to /dashboard or /login)
      if (pathname === '/' || pathname === '/landing' || pathname === '/home') {
        const landingCandidates = [
          path.resolve(__dirname, '../public/landing.html'),
          path.resolve(__dirname, 'views/landing.html'),
          path.resolve(__dirname, '../public/index.html'),
          path.resolve(__dirname, 'views/index.html')
        ];
        const landingFile = landingCandidates.find(p => fs.existsSync(p));
        if (landingFile) {
          const content = fs.readFileSync(landingFile, 'utf8');
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            ...BASE_SECURITY_HEADERS
          });
          res.end(content);
          return;
        }

        if (pathname === '/landing') {
          res.writeHead(302, { 'Location': '/login' });
          res.end();
          return;
        }

        const session = getAuthSession(req, this.userRepo);
        const isMaster = hasAdminToken(req, url, this.userRepo);
        if (session || isMaster) {
          res.writeHead(302, { 'Location': '/dashboard' });
        } else {
          res.writeHead(302, { 'Location': '/login' });
        }
        res.end();
        return;
      }

      // 4. Main Dashboard (Unified Razorpay / Cashfree Portal for Super Admin & Merchants): GET /dashboard
      if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
        const isMaster = hasAdminToken(req, url, this.userRepo);
        const session = getAuthSession(req, this.userRepo);

        // If not authenticated and no master token, redirect to login
        if (!isMaster && !session) {
          res.writeHead(302, { 'Location': '/login' });
          res.end();
          return;
        }

        let user = session ? session.user : { role: 'SUPER_ADMIN', name: 'Super Admin', email: 'admin@adshree.com' };
        let merchant = null;
        if (session && session.merchantId) {
          merchant = this.merchantRepo.findById(session.merchantId);
        } else {
          merchant = this.merchantRepo.findById('00000000-0000-0000-0000-000000000001') || this.merchantRepo.findAll()[0];
        }

        const html = this.renderHtml(user, merchant);
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...BASE_SECURITY_HEADERS
        });
        res.end(html);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Route Not Found');
    });
  }
}
