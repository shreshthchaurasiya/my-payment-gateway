import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert';
import test from 'node:test';
import { authHeaders } from './test-support.js';
import { createPaymentApp } from '../apps/payment-api/src/index.js';

test('Developer Studio & Interactive Webhook Tester', async (t) => {
  // 1. Create a mock merchant webhook destination server
  let lastReceivedPayload = null;
  let lastReceivedHeaders = null;
  let lastSignatureValid = false;
  let expectedSecret = '';

  const mockWebhookServer = http.createServer((req, res) => {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const rawBuffer = Buffer.concat(body);
      const rawString = rawBuffer.toString('utf8');
      lastReceivedHeaders = req.headers;
      lastReceivedPayload = JSON.parse(rawString);

      const receivedSig = req.headers['x-gateway-signature'] || '';
      const computedSig = 'sha256=' + crypto.createHmac('sha256', expectedSecret).update(rawBuffer).digest('hex');
      lastSignatureValid = (receivedSig === computedSig);

      if (lastSignatureValid) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ received: true, verified: true }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Signature mismatch' }));
      }
    });
  });

  await new Promise(resolve => mockWebhookServer.listen(0, '127.0.0.1', resolve));
  const mockPort = mockWebhookServer.address().port;
  const mockWebhookUrl = `http://127.0.0.1:${mockPort}/webhook`;

  // 2. Start Payment API
  const app = createPaymentApp();
  const apiServer = http.createServer(app.rawServer.listeners('request')[0]);
  await new Promise(resolve => apiServer.listen(0, '127.0.0.1', resolve));
  const apiPort = apiServer.address().port;
  const apiBase = `http://127.0.0.1:${apiPort}`;

  t.after(() => {
    mockWebhookServer.close();
    apiServer.close();
  });

  await t.test('POST /api/v1/admin/api-keys/generate creates Razorpay-style Key ID and Secret', async () => {
    const res = await fetch(`${apiBase}/api/v1/admin/api-keys/generate`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ mode: 'live' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.keyId.startsWith('yp_live_'), 'Live Key ID should start with yp_live_');
    assert.ok(data.keySecret.startsWith('yp_sec_'), 'Live Key Secret should start with yp_sec_');
    assert.ok(data.webhookSecret.startsWith('whsec_'), 'Webhook Secret should start with whsec_');

    // Test mode generation
    const testGenRes = await fetch(`${apiBase}/api/v1/admin/api-keys/generate`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ mode: 'test' })
    });
    assert.strictEqual(testGenRes.status, 200);
    const testGenData = await testGenRes.json();
    assert.strictEqual(testGenData.success, true);
    assert.ok(testGenData.keyId.startsWith('yp_test_'), 'Test Key ID should start with yp_test_');
    assert.ok(testGenData.keySecret.startsWith('yp_test_sec_'), 'Test Key Secret should start with yp_test_sec_');

    // Verify GET retrieves both environments
    const getRes = await fetch(`${apiBase}/api/v1/admin/api-keys`, {
      headers: authHeaders()
    });
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.strictEqual(getData.keyId, data.keyId);
    assert.ok(getData.test, 'Response should contain test environment object');
    assert.strictEqual(getData.test.keyId, testGenData.keyId);
    assert.strictEqual(getData.status, 'ACTIVE');
  });

  await t.test('POST /api/v1/admin/webhooks/regenerate-secret rotates key and saves in DB', async () => {
    const regenRes = await fetch(`${apiBase}/api/v1/admin/webhooks/regenerate-secret`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({})
    });
    assert.strictEqual(regenRes.status, 200, 'Regenerate secret should return 200');
    const regenData = await regenRes.json();
    assert.strictEqual(regenData.success, true);
    assert.ok(regenData.webhookSecret.startsWith('whsec_'), 'Secret should start with whsec_');
    expectedSecret = regenData.webhookSecret;
  });

  await t.test('POST /api/v1/admin/webhooks/test dispatches signed live webhook with HMAC-SHA256', async () => {
    const testRes = await fetch(`${apiBase}/api/v1/admin/webhooks/test`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        targetUrl: mockWebhookUrl,
        event: 'SUCCESS',
        orderId: 'TEST-ORD-8821',
        amount: 499,
        utr: '428901284910'
      })
    });

    assert.strictEqual(testRes.status, 200, 'Test webhook endpoint should return 200');
    const testData = await testRes.json();
    assert.strictEqual(testData.success, true, 'Test response should have success: true');
    assert.strictEqual(testData.delivered, true, 'Delivery should be marked delivered: true');
    assert.strictEqual(testData.statusCode, 200, 'Mock receiver status code should be 200');
    assert.ok(testData.latencyMs >= 0, 'Latency should be measured');
    assert.strictEqual(lastSignatureValid, true, 'Mock receiver verified HMAC-SHA256 signature successfully');
    assert.strictEqual(lastReceivedPayload.orderId, 'TEST-ORD-8821');
    assert.strictEqual(lastReceivedPayload.utr, '428901284910');
    assert.strictEqual(lastReceivedPayload.amount, '499.00');
    assert.strictEqual(lastReceivedHeaders['x-gateway-event'], 'SUCCESS');
    assert.ok(lastReceivedHeaders['x-gateway-signature'].startsWith('sha256='));
    assert.ok(lastReceivedHeaders['x-gateway-delivery-id']);
    assert.ok(lastReceivedHeaders['x-gateway-timestamp']);
  });

  await t.test('POST /api/v1/admin/webhooks/test handles COD event simulation', async () => {
    const codRes = await fetch(`${apiBase}/api/v1/admin/webhooks/test`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        targetUrl: mockWebhookUrl,
        event: 'COD',
        orderId: 'TEST-COD-9901',
        amount: 850
      })
    });
    const codData = await codRes.json();
    assert.strictEqual(codData.success, true);
    assert.strictEqual(codData.statusCode, 200);
    assert.strictEqual(lastReceivedPayload.method, 'COD');
    assert.strictEqual(lastReceivedPayload.amount, '850.00');
  });

  await t.test('POST /api/v1/admin/webhooks/test returns graceful error when target server is down', async () => {
    const deadUrl = 'http://127.0.0.1:49151/no-such-server';
    const failRes = await fetch(`${apiBase}/api/v1/admin/webhooks/test`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        targetUrl: deadUrl,
        event: 'SUCCESS'
      })
    });
    assert.strictEqual(failRes.status, 200, 'Endpoint should return 200 even if target fails');
    const failData = await failRes.json();
    assert.strictEqual(failData.success, false);
    assert.strictEqual(failData.delivered, false);
    assert.ok(failData.error, 'Error message should be present');
  });
});
