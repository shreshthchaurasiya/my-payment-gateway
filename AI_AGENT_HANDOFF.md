# 🧠 AI_AGENT_HANDOFF.md — Master System Context & Operations Manual

> **Target Audience**: AI Coding Agents, Pair Programmers & Lead Engineers working on YOUPI PG V2.  
> **Purpose**: Single source of truth for bootstrapping on a new machine, understanding production deployment architecture, maintaining zero-fee banking observers, preserving database persistence, and upholding critical system invariants.

---

## 1. Executive Summary & Core Identity

**YOUPI PG V2** is an enterprise-grade, self-hosted, sovereign payment gateway designed for Indian merchants to accept UPI payments directly into their own bank accounts with **0% gateway/MDR fees**.

```
[ Merchant Web / App ] ──(1. youpi.js)──> [ Responsive Modal / Mobile Sheet ]
                                                    │
                                         (2. Dynamic Single-Use QR)
                                                    │
                                          [ Customer Pays via UPI ]
                                                    │
                                      (3. Bank SMS / Gmail Push)
                                                    │
                                        [ Observer Mesh (Android/Gmail) ]
                                                    │
                                     [ 6-Stage Verification Engine ]
                                                    │
                            ┌───────────────────────┴───────────────────────┐
                            ▼                                               ▼
               [ Instant Browser Events ]                    [ Signed Server Webhook ]
                 youpi:payment:success                        POST /api/webhook (HMAC-SHA256)
```

### The 4 Superpowers of YOUPI PG:
1. **Zero Aggregator Middlemen**: 100% direct peer-to-peer bank settlement. No 2% aggregator cuts, no rolling reserves, no T+2 settlement delays.
2. **Dynamic Slot Rotating Invariant**: Eliminates payment collisions. A unique amount / slot is assigned per customer during the active 5-minute payment window.
3. **Tri-Channel Banking Observers**: Android background SMS observer + Google Messages headless observer + Gmail OAuth polling parse genuine bank credit notifications.
4. **Cryptographic Webhook Proof**: Authoritative server-to-server deliveries signed via HMAC-SHA256 over raw unparsed request bytes.

---

## 2. Production Deployment Architecture (Hostinger / LiteSpeed)

In production on **`gateway.adshree.com`**, the entire multi-service monorepo is consolidated into an in-memory single-port LiteSpeed gateway driven by root `server.js`.

### How Single-Port Routing Works (`server.js`):
Hostinger Node.js plans assign a single public port (via LiteSpeed reverse proxy). `server.js` multiplexes requests:

| Route Path | Destination Service | Description |
| :--- | :--- | :--- |
| `/api/v1/*` | `paymentHandler` | REST API, state machine, queue, checkout sessions, auth |
| `/api/services` | In-Memory Supervisor | Returns live health of all internal sub-services |
| `/api/logs/stream` | In-Memory SSE Stream | Live terminal streaming for dashboard logs |
| `/checkout/:id`, `/youpi.js` | `checkoutHandler` | Checkout modal portal, dynamic QR generator, intent launcher |
| `/dashboard`, `/admin`, `/login` | `dashboardHandler` | Merchant Admin Console & Super Admin Control Center |
| `/store` | `storeHandler` | Built-in Coin Wallet reference store (demo integration) |
| `/help` | `helpHandler` | Interactive API documentation & integration guides |

---

## 3. Database Architecture & Permanent Persistence

YOUPI PG V2 uses **SQLite with Write-Ahead Logging (WAL)** via `better-sqlite3` and native `node:sqlite`.

### The Hostinger Ephemeral Problem & The Permanent Fix:
* **The Problem**: Hostinger Node.js deploys code into versioned folders (`hbuilds/versions/<hash>`). If the SQLite database lives inside `nodejs/data/`, redeploying code or uploading a new zip resets or overwrites the database.
* **The Permanent Fix (`packages/db/src/database.js`)**:
  1. The database layer automatically detects Hostinger environments (`process.env.HOME.startsWith('/home/u')`).
  2. It redirects SQLite storage to a **permanent folder outside `hbuilds`**:
     ```
     /home/u152059793/youpi_data/youpi_pg.sqlite
     ```
  3. **First-Boot Auto-Seed**: On the very first run, if `youpi_data/youpi_pg.sqlite` does not exist, it seeds from the bundled database.
  4. **Subsequent Redeployments**: If `youpi_data/youpi_pg.sqlite` already exists, **it is NEVER overwritten**. Live user registrations, transaction history, and custom merchant settings persist forever across any number of redeployments!
  5. **Pre-Packaged Zip**: `npm run build:zip` automatically WAL-checkpoints and bundles `data/youpi_pg.sqlite` into `youpi-gateway.zip`.

---

## 4. Default Seed Accounts & Credentials

The database comes pre-seeded with two primary operational accounts:

### 👑 1. Super Admin Account (Full Platform Access)
* **Email**: `admin@adshree.com`
* **Password**: `AdminSecurePassword123!`
* **Role**: `SUPER_ADMIN`
* **Capabilities**: Access to Registered Merchants directory, Bank SMS Simulator, Developer Test Mode injection, Cloudflare tunnel controls, and System Supervisor.

### 🏬 2. Merchant Store Account
* **Email**: `gyanachiver5@gmial.com`
* **Password**: `AdminSecurePassword123!`
* **Role**: `MERCHANT`
* **Store Name**: `ed tech learning platform`
* **Receiving VPA**: `ed-tech-learning-platform-a737c5@upi`
* **Capabilities**: Scoped strictly to own merchant operations (Payment Links, POS Desk, Orders Ledger, Webhook Settings, Brand Look).

> **Password Hashing Standard**: PBKDF2 with SHA-512, 100,000 iterations, 16-byte random salt. Format: `100000:<salt_hex>:<hash_hex>`.

---

## 5. Role Permissions Matrix (`SUPER_ADMIN` vs `MERCHANT`)

The backend guard (`apps/payment-api/src/auth-guard.js`) strictly enforces role boundaries:

```javascript
if (session.role === 'MERCHANT') {
  if (pathname.startsWith('/api/v1/admin/dev/') || pathname.startsWith('/api/v1/admin/clients')) {
    HttpServer.json(res, 403, { error: 'Forbidden: Super Admin access required', code: 'FORBIDDEN' });
    return true;
  }
}
```

* **Frontend Rule**: The Merchant Dashboard marks Super Admin tools with `.admin-only`. When a Merchant logs in, these tools are hidden from the sidebar, and client-side scripts skip background polling of `/api/v1/admin/dev/*` to ensure a 100% clean browser console without `403 Forbidden` errors.

---

## 6. Cashfree Royal Purple UI/UX Design System

The gateway uses a Cashfree / Stripe inspired **Royal Purple & Deep Obsidian Violet** design theme.

### Color Tokens & Variables (`apps/dashboard/public/css/dashboard.css`):
* **Primary Brand**: `--primary: #7c3aed;` (Vibrant Royal Purple)
* **Primary Hover**: `--primary-hover: #6d28d9;`
* **Primary Gradient**: `linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);`
* **Primary Glow**: `rgba(124, 58, 237, 0.25);`
* **Sidebar Canvas**: `#0f0a21;` (Deep Obsidian Violet) with border `#231942;`
* **Active Nav Pill**: Royal purple gradient with white text and glowing aura:
  ```css
  background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%) !important;
  box-shadow: 0 4px 18px rgba(124, 58, 237, 0.45);
  ```
* **Stat / KPI Cards**: 14px rounded borders with top accent gradient line:
  ```css
  .kpi-box::after {
    height: 3px;
    background: linear-gradient(90deg, #7c3aed, #6366f1);
  }
  ```
* **Login & Register Page (`apps/dashboard/src/views/login.html`)**:
  - Obsidian-violet canvas (`#090615`) with ambient radial mesh glows.
  - Glassmorphic card (`backdrop-filter: blur(28px)`) with tricolor gradient header bar.
  - 256-bit SSL, 0% MDR, and bank verification security badges.

---

## 7. 3-Tier UPI Server Health Model

The checkout portal displays real-time UPI health based on observer connectivity:

| Tier | Status | Trigger Condition | Checkout Banner |
| :--- | :--- | :--- | :--- |
| **🟢 GREEN** | `WORKING` | Both SMS gateway & Gmail OAuth actively polling | "Server Is Working" |
| **🟡 YELLOW** | `BUSY` | Either SMS OR Gmail connected (single source) | "UPI Server Busy (Extra processing seconds)" |
| **🔴 RED** | `ISSUES` | Neither SMS nor Gmail connected | "UPI Server Facing Issues (Downtime alert)" |

### Production Environment Override:
To prevent customers from seeing a scary red downtime warning when observers are not yet paired during setup or testing, the backend supports:
```bash
DEFAULT_UPI_HEALTH=GREEN
```
When present in `.env`, the health check immediately returns **🟢 Server Is Working**.  
Merchants can also toggle health testing in Dashboard &rarr; Settings &rarr; **UPI Server Health: False Narrative Switch**.

---

## 8. Developer Quickstart & Command Reference

### Running Locally on a New Machine:

```bash
# 1. Clone repository
git clone <repo-url>
cd my-payment-gateway

# 2. Install dependencies (Root + Workspaces)
npm install

# 3. Run complete regression test suite (33 test suites)
node scripts/test-all.js

# 4. Start full gateway in standalone / unified mode
node server.js
```

### Local Multi-Port Architecture (When not using unified server.js):
* `http://localhost:6100` — Payment Core API
* `http://localhost:7000` — Checkout Portal & `youpi.js`
* `http://localhost:6001` — Merchant Admin Dashboard
* `http://localhost:5000` — Coin Wallet Showcase Store
* `http://localhost:6002` — SMS Observer Webhook Ingest
* `http://localhost:6003` — Gmail Push Observer

---

## 9. Hostinger 1-Click Deployment Pipeline

To package and deploy code changes to Hostinger:

```bash
# Run the automated production packager
npm run build:zip
```

### What `npm run build:zip` does:
1. Performs WAL checkpoint (`wal_checkpoint(TRUNCATE)`) on SQLite so all data is committed to disk.
2. Copies `server.js`, `apps/`, `packages/`, `scripts/`, and production configurations.
3. Packages `data/youpi_pg.sqlite` directly into the root of `youpi-gateway.zip` (5.6MB).
4. Copies `youpi-gateway.zip` into `~/Downloads/` and `~/Documents/` for easy upload.

### Deploying on Hostinger hPanel:
1. Navigate to **`https://hpanel.hostinger.com`** &rarr; Select website **`gateway.adshree.com`**.
2. Go to **Deployments** (in left sidebar).
3. Upload `youpi-gateway.zip` and click Deploy. Hostinger extracts and restarts the app in ~20 seconds.
4. **Live database in `/home/u152059793/youpi_data/` is preserved 100% intact**.

---

## 10. Non-Negotiable System Invariants (DO NOT BREAK)

When modifying this repository, any AI Agent must strictly preserve these architectural rules:

1. **NO PUBLIC FORCE-SUCCESS ENDPOINT**:  
   There is NO endpoint that allows an arbitrary client to force payment status to `SUCCESS`. `SUCCESS` is generated exclusively by the verification engine matching a genuine bank SMS/Gmail credit.
2. **RAW REQUEST BYTES FOR WEBHOOK HMAC**:  
   The server-to-server webhook signature (`X-Gateway-Signature`) is computed over **raw, unparsed request bytes**. Never parse JSON before HMAC calculation.
3. **QR CODE ALWAYS RENDERS**:  
   The dynamic single-use UPI QR code must render and display on checkout even if observers are DOWN or BUSY.
4. **SLOT LOCK COLLISION PREVENTION**:  
   Each customer session is locked to a dedicated VPA / amount slot during the 5-minute active window to eliminate payment collision.
5. **PRESERVE ALL HTML IDs & CLASSES**:  
   Do not rename form input IDs (`login-email`, `login-password`, `signup-name`, etc.) or navigation IDs in views, as JavaScript modules bind to them explicitly.
6. **ALL 33 TEST SUITES MUST PASS**:  
   Always run `node scripts/test-all.js` before concluding any feature or bugfix turn. All 33 tests must pass with 100% success rate.

---

*Authored by Antigravity AI & The Lead Engineering Team for YOUPI PG V2.*




Analyzed README.md:L1-50
Created AI_AGENT_HANDOFF.md

Error: API error (attempt 1): request failed: Post "https://daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse": http2: timeout awaiting response headers (Error ID: c0e38891-b479-47ca-b2a0-4ba46da523a9-836)

Analyzed README.md:L40-70
Edited README.md
Analyzed build-hostinger-zip.cjs:L20-45
Edited build-hostinger-zip.cjs
Ran rebuild zip with AI_AGENT_HANDOFF.md

Bhai, naye machine ya kisi bhi future AI agent ke liye humne ek master-grade document **`AI_AGENT_HANDOFF.md`** create kar diya hai!

Aap kisi bhi nayi machine par ya kisi naye agent ko sirf yeh bolna:  
👉 **`"Read AI_AGENT_HANDOFF.md and follow it."`**  
Woh 10 second mein poora project, architecture, credentials, aur deployment samajh jayega!

---

### 📄 Document Link:
* 📘 [AI_AGENT_HANDOFF.md](file:///home/chaurasiya/Documents/my-payment-gateway/AI_AGENT_HANDOFF.md)
* Iska direct reference **[README.md](file:///home/chaurasiya/Documents/my-payment-gateway/README.md)** ke top par bhi laga diya gaya hai.

---

### 📋 Is Document Mein Kya-Kya Shamil Hai?

1. **System Identity & Architecture**:
   - Zero-fee UPI sovereign gateway ka poora flow diagram.
   - Dynamic single-use QR rotation aur 5-minute active slot lock invariant.
   - Bank SMS & Gmail banking observers mesh ka working mechanism.

2. **Hostinger Production Deployment Architecture (`gateway.adshree.com`)**:
   - Single-Port LiteSpeed in-memory gateway (`server.js`).
   - Ephemeral build path (`hbuilds/current/nodejs/`) vs Permanent SQLite storage (`/home/u152059793/youpi_data/youpi_pg.sqlite`).
   - Auto-persistence logic: Nayi zip dalne par bhi live users aur payment history kabhi delete kyun nahi hoti.

3. **Complete Seed Accounts & Login Credentials**:
   - **Super Admin**: `admin@adshree.com` / `AdminSecurePassword123!` (Role: `SUPER_ADMIN`).
   - **Merchant Account**: `gyanachiver5@gmial.com` / `AdminSecurePassword123!` (Role: `MERCHANT`).
   - Store: `ed tech learning platform`, Receiving VPA: `ed-tech-learning-platform-a737c5@upi`.
   - PBKDF2/SHA-512 100,000 iterations encryption standard.

4. **Role Permissions & Security Matrix**:
   - Super Admin vs Merchant ke boundaries.
   - Guarded routes (`/api/v1/admin/dev/*`) aur unka handling.

5. **Cashfree Royal Purple Design System**:
   - Signature Royal Purple (`#7c3aed`), dark-violet obsidian sidebar (`#0f0a21`), KPI accent lines, aur glassmorphic login view ke design tokens.

6. **3-Tier Health Model & Checkout Indicators**:
   - 🟢 `GREEN`, 🟡 `YELLOW`, 🔴 `RED` logic.
   - `DEFAULT_UPI_HEALTH=GREEN` override config.

7. **Developer Quickstart & Commands**:
   - Local installation: `npm install`
   - Test runner: `node scripts/test-all.js` (**Saare 33 test suites 100% PASS**)
   - Hostinger packaging: `npm run build:zip` &rarr; `youpi-gateway.zip` (Pre-seeded database included).

8. **Strict Non-Negotiable Invariants (Rules Never to Break)**:
   - No public force-success endpoint.
   - RAW request bytes required for HMAC-SHA256 signature verification.
   - Dynamic QR code always renders.
   - Form IDs aur client handlers ko preserve rakhne ka rule.

Yeh document aapke code repository aur deployment zip dono ke andar permanently save ho gaya hai!