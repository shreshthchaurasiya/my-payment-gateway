import crypto from 'node:crypto';
import { hashPassword, verifyPassword, normalizeEmail, isValidEmail, isValidPassword } from '@youpi/common';

export class UserRepository {
  /**
   * @param {import('../database.js').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Creates a portal user (SUPER_ADMIN or MERCHANT).
   * @param {{
   *   id?: string,
   *   name: string,
   *   email: string,
   *   password?: string,
   *   passwordHash?: string,
   *   role?: 'SUPER_ADMIN' | 'MERCHANT',
   *   status?: 'ACTIVE' | 'SUSPENDED',
   *   merchantId?: string | null
   * }} data
   */
  create(data) {
    const id = data.id || crypto.randomUUID();
    const name = String(data.name || '').trim();
    const email = normalizeEmail(data.email);
    const role = data.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'MERCHANT';
    const status = data.status || 'ACTIVE';
    const merchantId = data.merchantId || null;

    if (!name) {
      throw new Error('User name is required.');
    }
    if (!email || !isValidEmail(email)) {
      throw new Error('Invalid email address format.');
    }

    let passwordHash = data.passwordHash || null;
    if (!passwordHash && data.password) {
      if (!isValidPassword(data.password)) {
        throw new Error('Password must be at least 6 characters long.');
      }
      passwordHash = hashPassword(data.password);
    }

    if (!passwordHash) {
      throw new Error('Password or passwordHash is required to create a user.');
    }

    const now = new Date().toISOString();
    const sql = `
      INSERT INTO users (id, name, email, password_hash, role, status, merchant_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      id,
      name,
      email,
      passwordHash,
      role,
      status,
      merchantId,
      now,
      now
    ]);

    return this.findById(id);
  }

  /**
   * Finds a user by ID.
   * @param {string} id
   * @returns {any | null}
   */
  findById(id) {
    if (!id) return null;
    const row = this.db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapUserRow(row);
  }

  /**
   * Finds a user by email.
   * @param {string} email
   * @returns {any | null}
   */
  findByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const row = this.db.queryOne('SELECT * FROM users WHERE email = ?', [normalized]);
    if (!row) return null;
    return this.mapUserRow(row);
  }

  /**
   * Verifies user credentials using email and password.
   * Updates last_login_at on success and returns safe user object (no passwordHash).
   * @param {string} email
   * @param {string} password
   * @returns {any | null}
   */
  verifyCredentials(email, password) {
    if (!email || !password) return null;
    const user = this.findByEmail(email);
    if (!user) return null;

    if (user.status !== 'ACTIVE') return null;

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) return null;

    const now = new Date().toISOString();
    try {
      this.db.execute('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?', [now, now, user.id]);
    } catch {}

    const { passwordHash, ...safeUser } = user;
    safeUser.lastLoginAt = new Date(now);
    return safeUser;
  }

  /**
   * Lists all registered portal users with optional role filtering.
   * @param {{ role?: string, status?: string }} [filter={}]
   * @returns {any[]}
   */
  findAll(filter = {}) {
    let sql = `
      SELECT u.*, m.business_name, m.slug as merchant_slug, m.webhook_url
      FROM users u
      LEFT JOIN merchants m ON u.merchant_id = m.id
      WHERE 1=1
    `;
    const params = [];
    if (filter.role) {
      sql += ' AND u.role = ?';
      params.push(filter.role);
    }
    if (filter.status) {
      sql += ' AND u.status = ?';
      params.push(filter.status);
    }
    sql += ' ORDER BY u.created_at DESC';

    const rows = this.db.query(sql, params);
    return rows.map(r => ({
      ...this.mapUserRow(r),
      businessName: r.business_name || null,
      merchantSlug: r.merchant_slug || null,
      webhookUrl: r.webhook_url || null
    }));
  }

  /**
   * Updates user details.
   * @param {string} id
   * @param {any} data
   */
  update(id, data) {
    const user = this.findById(id);
    if (!user) return null;

    const updates = [];
    const params = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(String(data.name).trim());
    }
    if (data.email !== undefined) {
      const normalized = normalizeEmail(data.email);
      if (!isValidEmail(normalized)) throw new Error('Invalid email address.');
      updates.push('email = ?');
      params.push(normalized);
    }
    if (data.password) {
      if (!isValidPassword(data.password)) throw new Error('Password must be at least 6 characters.');
      updates.push('password_hash = ?');
      params.push(hashPassword(data.password));
    } else if (data.passwordHash) {
      updates.push('password_hash = ?');
      params.push(data.passwordHash);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'MERCHANT');
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.merchantId !== undefined) {
      updates.push('merchant_id = ?');
      params.push(data.merchantId);
    }

    if (updates.length === 0) return user;

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    this.db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  /**
   * Deletes a user by ID.
   * @param {string} id
   */
  delete(id) {
    if (!id) return false;
    this.db.execute('DELETE FROM user_sessions WHERE user_id = ?', [id]);
    this.db.execute('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  /**
   * Creates a user session token.
   * @param {{
   *   userId: string,
   *   role: string,
   *   merchantId?: string | null,
   *   ipAddress?: string | null,
   *   userAgent?: string | null,
   *   ttlMs?: number
   * }} options
   * @returns {{ token: string, expiresAt: Date, session: any }}
   */
  createSession(options) {
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const ttl = options.ttlMs || 30 * 24 * 60 * 60 * 1000; // 30 days default
    const expiresAt = new Date(Date.now() + ttl).toISOString();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO user_sessions (id, user_id, token, role, merchant_id, ip_address, user_agent, expires_at, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;

    this.db.execute(sql, [
      id,
      options.userId,
      token,
      options.role,
      options.merchantId || null,
      options.ipAddress || null,
      options.userAgent || null,
      expiresAt,
      now,
      now
    ]);

    return {
      id,
      token,
      userId: options.userId,
      role: options.role,
      merchantId: options.merchantId || null,
      expiresAt: new Date(expiresAt)
    };
  }

  /**
   * Finds an active session by token. Returns session joined with user profile.
   * @param {string} token
   * @returns {any | null}
   */
  findSessionByToken(token) {
    if (!token) return null;

    const row = this.db.queryOne(`
      SELECT s.*, u.name as user_name, u.email as user_email, u.status as user_status, u.merchant_id as user_merchant_id
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.is_active = 1
    `, [token]);

    if (!row) return null;

    // Check expiration
    if (new Date(row.expires_at) <= new Date()) {
      this.revokeSession(token);
      return null;
    }

    if (row.user_status !== 'ACTIVE') {
      return null;
    }

    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      role: row.role,
      merchantId: row.merchant_id || row.user_merchant_id || null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at),
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: row.role,
        merchantId: row.merchant_id || row.user_merchant_id || null,
        status: row.user_status
      }
    };
  }

  /**
   * Revokes a session by token.
   * @param {string} token
   */
  revokeSession(token) {
    if (!token) return false;
    this.db.execute('UPDATE user_sessions SET is_active = 0, updated_at = ? WHERE token = ?', [
      new Date().toISOString(),
      token
    ]);
    return true;
  }

  /**
   * Revokes all sessions for a user (e.g. on password reset or account suspend).
   * @param {string} userId
   */
  revokeAllUserSessions(userId) {
    if (!userId) return false;
    this.db.execute('UPDATE user_sessions SET is_active = 0, updated_at = ? WHERE user_id = ?', [
      new Date().toISOString(),
      userId
    ]);
    return true;
  }

  mapUserRow(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
      merchantId: row.merchant_id || null,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
