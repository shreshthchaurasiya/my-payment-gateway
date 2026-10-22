import crypto from 'node:crypto';
import { HttpServer } from '../server.js';
import { UserRepository } from '@youpi/db';

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

function getSessionToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const cookies = parseCookies(req);
  return cookies.ypg_session || null;
}

export function registerAuthRoutes(server, context) {
  const { db, merchantRepo, accountRepo, sessionRepo } = context;
  const userRepo = new UserRepository(db);

  // Helper to extract authenticated user session
  function getAuthenticatedSession(req) {
    const token = getSessionToken(req);
    if (!token) return null;
    return userRepo.findSessionByToken(token);
  }

  // 1. POST /api/v1/auth/login
  server.post('/api/v1/auth/login', async (req, res) => {
    try {
      const body = await HttpServer.parseBody(req);
      const email = String(body.email || '').trim();
      const password = String(body.password || '');

      if (!email || !password) {
        HttpServer.json(res, 400, { error: 'Email and password are required' });
        return;
      }

      const user = userRepo.verifyCredentials(email, password);
      if (!user) {
        HttpServer.json(res, 401, { error: 'Invalid email or password' });
        return;
      }

      if (user.status !== 'ACTIVE') {
        HttpServer.json(res, 403, { error: 'Your account has been suspended. Please contact support.' });
        return;
      }

      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const session = userRepo.createSession({
        userId: user.id,
        role: user.role,
        merchantId: user.merchantId,
        ipAddress,
        userAgent
      });

      const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
      const cookieHeader = `ypg_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${isSecure ? '; Secure' : ''}`;

      const redirectUrl = '/dashboard';

      HttpServer.json(res, 200, {
        success: true,
        token: session.token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          merchantId: user.merchantId
        },
        redirectUrl
      }, {
        'Set-Cookie': cookieHeader
      });
    } catch (err) {
      console.error('[Auth] Login error:', err);
      HttpServer.json(res, 500, { error: 'Login failed', details: err.message });
    }
  });

  // 2. POST /api/v1/auth/signup
  server.post('/api/v1/auth/signup', async (req, res) => {
    try {
      const body = await HttpServer.parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const businessName = String(body.businessName || body.business_name || '').trim();
      const phone = String(body.phone || body.contactPhone || '9876543210').trim();

      if (!name || name.length < 2) {
        HttpServer.json(res, 400, { error: 'Full name must be at least 2 characters' });
        return;
      }
      if (!email || !email.includes('@')) {
        HttpServer.json(res, 400, { error: 'A valid email address is required' });
        return;
      }
      if (!password || password.length < 6) {
        HttpServer.json(res, 400, { error: 'Password must be at least 6 characters long' });
        return;
      }

      // Check if user already exists
      const existingUser = userRepo.findByEmail(email);
      if (existingUser) {
        HttpServer.json(res, 409, { error: 'An account with this email already exists. Please sign in.' });
        return;
      }

      // 1. Create Sovereign Merchant Record
      const storeName = businessName || `${name}'s Store`;
      const baseSlug = storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'store';
      const slug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
      const webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

      const merchant = merchantRepo.create({
        businessName: storeName,
        slug,
        contactEmail: email,
        contactPhone: phone,
        webhookSecret,
        branding: {
          appName: storeName,
          primaryColor: '#059669',
          logoUrl: null
        }
      });

      // 2. Create Active UPI Receiving Account
      const upiId = `${slug}@upi`;
      accountRepo.create({
        merchantId: merchant.id,
        upiId,
        payeeName: storeName,
        isActive: true
      });

      // 3. Create Portal User Account
      const user = userRepo.create({
        name,
        email,
        password,
        role: 'MERCHANT',
        status: 'ACTIVE',
        merchantId: merchant.id
      });

      // 4. Create Session
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const session = userRepo.createSession({
        userId: user.id,
        role: user.role,
        merchantId: merchant.id,
        ipAddress,
        userAgent
      });

      const isSecure = req.headers['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
      const cookieHeader = `ypg_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${isSecure ? '; Secure' : ''}`;

      HttpServer.json(res, 201, {
        success: true,
        token: session.token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          merchantId: merchant.id
        },
        merchant: {
          id: merchant.id,
          businessName: merchant.businessName,
          slug: merchant.slug,
          webhookSecret: merchant.webhookSecret
        },
        redirectUrl: '/dashboard'
      }, {
        'Set-Cookie': cookieHeader
      });
    } catch (err) {
      console.error('[Auth] Signup error:', err);
      HttpServer.json(res, 500, { error: 'Account registration failed', details: err.message });
    }
  });

  // 3. POST /api/v1/auth/logout
  server.post('/api/v1/auth/logout', async (req, res) => {
    try {
      const token = getSessionToken(req);
      if (token) {
        userRepo.revokeSession(token);
      }
      HttpServer.json(res, 200, { success: true, message: 'Logged out successfully' }, {
        'Set-Cookie': 'ypg_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
      });
    } catch (err) {
      HttpServer.json(res, 500, { error: 'Logout failed', details: err.message });
    }
  });

  // 4. GET /api/v1/auth/me
  server.get('/api/v1/auth/me', (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      HttpServer.json(res, 200, { authenticated: false, user: null });
      return;
    }

    let merchant = null;
    if (session.merchantId) {
      merchant = merchantRepo.findById(session.merchantId);
    }

    HttpServer.json(res, 200, {
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.role,
        merchantId: session.merchantId
      },
      merchant: merchant ? {
        id: merchant.id,
        businessName: merchant.businessName,
        slug: merchant.slug,
        contactEmail: merchant.contactEmail,
        webhookUrl: merchant.webhookUrl,
        webhookSecret: merchant.webhookSecret
      } : null
    });
  });

  // 5. GET /api/v1/admin/clients (Super Admin Only: Lists all registered clients/merchants)
  server.get('/api/v1/admin/clients', (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session || session.role !== 'SUPER_ADMIN') {
      HttpServer.json(res, 403, { error: 'Access denied: Super Admin authorization required' });
      return;
    }

    const merchants = merchantRepo.findAll();
    const allUsers = userRepo.findAll();

    const clients = merchants.map(m => {
      const vpas = accountRepo.findByMerchantId(m.id);
      const activeVpa = vpas.find(v => v.isActive) || vpas[0] || null;
      const merchantUsers = allUsers.filter(u => u.merchantId === m.id);

      // Volume & session count stats
      let totalSessions = 0;
      let totalSuccessVolumePaise = 0;
      try {
        const stats = db.queryOne(`
          SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount_paise ELSE 0 END), 0) as success_paise
          FROM payment_sessions WHERE merchant_id = ?
        `, [m.id]);
        if (stats) {
          totalSessions = Number(stats.total_count || 0);
          totalSuccessVolumePaise = Number(stats.success_paise || 0);
        }
      } catch {}

      return {
        id: m.id,
        businessName: m.businessName,
        slug: m.slug,
        contactEmail: m.contactEmail,
        contactPhone: m.contactPhone,
        webhookUrl: m.webhookUrl,
        webhookSecret: m.webhookSecret,
        activeVpa: activeVpa ? activeVpa.upiId : 'None',
        totalSessions,
        totalSuccessVolumePaise,
        totalSuccessRupees: (totalSuccessVolumePaise / 100).toFixed(2),
        users: merchantUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          lastLoginAt: u.lastLoginAt
        })),
        createdAt: m.createdAt
      };
    });

    HttpServer.json(res, 200, {
      totalClients: clients.length,
      clients
    });
  });

  // 6. GET /api/v1/merchant/profile (Merchant self-service profile & API credentials)
  server.get('/api/v1/merchant/profile', (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      HttpServer.json(res, 401, { error: 'Authentication required' });
      return;
    }

    const merchantId = session.merchantId;
    if (!merchantId) {
      HttpServer.json(res, 404, { error: 'No associated merchant found for this account' });
      return;
    }

    const merchant = merchantRepo.findById(merchantId);
    if (!merchant) {
      HttpServer.json(res, 404, { error: 'Merchant record not found' });
      return;
    }

    const vpas = accountRepo.findByMerchantId(merchantId);
    const activeVpa = vpas.find(v => v.isActive) || vpas[0] || null;

    HttpServer.json(res, 200, {
      user: session.user,
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        slug: merchant.slug,
        contactEmail: merchant.contactEmail,
        contactPhone: merchant.contactPhone,
        webhookUrl: merchant.webhookUrl,
        webhookSecret: merchant.webhookSecret,
        branding: merchant.branding,
        activeVpa: activeVpa ? {
          id: activeVpa.id,
          upiId: activeVpa.upiId,
          payeeName: activeVpa.payeeName,
          isActive: activeVpa.isActive
        } : null
      }
    });
  });

  // 7. POST /api/v1/merchant/vpa (Update receiving UPI ID)
  server.post('/api/v1/merchant/vpa', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      HttpServer.json(res, 401, { error: 'Authentication required' });
      return;
    }

    const merchantId = session.merchantId;
    if (!merchantId) {
      HttpServer.json(res, 403, { error: 'No merchant linked to this account' });
      return;
    }

    try {
      const body = await HttpServer.parseBody(req);
      const upiId = String(body.upiId || '').trim();
      const payeeName = String(body.payeeName || '').trim() || session.user.name;

      if (!upiId || !upiId.includes('@')) {
        HttpServer.json(res, 400, { error: 'A valid UPI ID is required (e.g. yourname@okaxis)' });
        return;
      }

      const vpas = accountRepo.findByMerchantId(merchantId);
      let account;
      if (vpas.length > 0) {
        account = accountRepo.update(vpas[0].id, {
          upiId,
          payeeName,
          isActive: true
        });
      } else {
        account = accountRepo.create({
          merchantId,
          upiId,
          payeeName,
          isActive: true
        });
      }

      HttpServer.json(res, 200, {
        success: true,
        message: 'Receiving UPI ID updated successfully',
        vpa: account
      });
    } catch (err) {
      HttpServer.json(res, 500, { error: 'Failed to update VPA', details: err.message });
    }
  });

  // 8. POST /api/v1/merchant/webhook (Update webhook URL and rotate secret)
  server.post('/api/v1/merchant/webhook', async (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      HttpServer.json(res, 401, { error: 'Authentication required' });
      return;
    }

    const merchantId = session.merchantId;
    if (!merchantId) {
      HttpServer.json(res, 403, { error: 'No merchant linked to this account' });
      return;
    }

    try {
      const body = await HttpServer.parseBody(req);
      const webhookUrl = body.webhookUrl !== undefined ? String(body.webhookUrl).trim() : undefined;
      const rotateSecret = Boolean(body.rotateSecret);

      const updateData = {};
      if (webhookUrl !== undefined) {
        updateData.webhookUrl = webhookUrl;
      }
      if (rotateSecret) {
        updateData.webhookSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
      }

      const updated = merchantRepo.update(merchantId, updateData);
      HttpServer.json(res, 200, {
        success: true,
        message: 'Webhook settings updated',
        webhookUrl: updated.webhookUrl,
        webhookSecret: updated.webhookSecret
      });
    } catch (err) {
      HttpServer.json(res, 500, { error: 'Failed to update webhook settings', details: err.message });
    }
  });
}
