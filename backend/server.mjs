import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { MongoClient } from 'mongodb';

// ── Load .env file (no dotenv package needed) ──────────────────────────────
(function loadEnv() {
  try {
    const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let val = trimmed.slice(eqIndex + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env not found — rely on system env */ }
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir  = path.resolve(__dirname, '..');
const dataDir  = path.join(__dirname, 'data');
const dbPath   = path.join(dataDir, 'db.json');
const distDir  = path.join(rootDir, 'dist');
const port     = Number(process.env.PORT || 4000);
const host     = process.env.HOST || '0.0.0.0';

// ── Session secret (persisted so sessions survive restarts) ────────────────
// On a real deployment (Render, etc.) the disk is ephemeral, so set SESSION_SECRET as an
// env var there — otherwise every restart invalidates all logged-in sessions. Locally, we
// fall back to a file so `npm run dev`/`npm run server` don't need any setup.
const sessionSecret = process.env.SESSION_SECRET || (() => {
  const secretPath = path.join(dataDir, '.session_secret');
  fs.mkdirSync(dataDir, { recursive: true });
  try { return fs.readFileSync(secretPath, 'utf8').trim(); } catch {}
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, secret);
  return secret;
})();

const clientsByGroup = new Map();

// ── DB helpers ─────────────────────────────────────────────────────────────
// Persistence is a single JSON-shaped document, stored either in MongoDB (Atlas or
// self-hosted — set MONGODB_URI) or, if that's not configured, in a local file — same shape
// either way, so every route above just does `await readDb()` / `await writeDb(db)` without
// caring which backend is active. Fine at this app's scale (one document well under MongoDB's
// 16MB limit); a larger deployment would want separate collections per entity instead.
const mongoUri    = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || 'shivam_transport';
const usingMongo  = Boolean(mongoUri);
const STATE_ID    = 'main';
let mongoClient;
let stateCollection;

async function connectMongo() {
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  stateCollection = mongoClient.db(mongoDbName).collection('appState');
  await stateCollection.createIndex({ _id: 1 });
  const existing = await stateCollection.findOne({ _id: STATE_ID });
  if (!existing) {
    await writeDb({ users: [], groups: [], customers: [], trips: [], auditLogs: [], bills: [] });
  }
}

function ensureDbFile() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    writeDbFile({ users: [], groups: [], customers: [], trips: [], auditLogs: [], bills: [] });
  }
}

function readDbFile() {
  ensureDbFile();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDbFile(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tempPath = `${dbPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2));
  fs.renameSync(tempPath, dbPath);
}

async function readDb() {
  let db;
  if (usingMongo) {
    const doc = await stateCollection.findOne({ _id: STATE_ID });
    const { _id, ...rest } = doc;
    db = rest;
  } else {
    db = readDbFile();
  }
  // Backward compatible with db files/documents written before "bills" existed.
  if (!Array.isArray(db.bills)) db.bills = [];
  return db;
}

async function writeDb(db) {
  if (!usingMongo) return writeDbFile(db);
  await stateCollection.replaceOne({ _id: STATE_ID }, { _id: STATE_ID, ...db }, { upsert: true });
}

function now()      { return new Date().toISOString(); }
function id(prefix) { return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`; }

function normalizeGroupCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateGroupCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Short, human-readable ID shown next to a person's name wherever it might otherwise be
// ambiguous (two drivers both named "Ramesh", say) — e.g. "D-8F3A". Not used for login;
// phone number already uniquely identifies who's signing in.
function generateUserCode(role) {
  return `${role === 'admin' ? 'A' : 'D'}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// ── Password hashing (PBKDF2, 100k iterations — no extra packages) ─────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored || '').split(':');
    if (!salt || !hash) return false;
    const computed = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  } catch { return false; }
}

// ── Session tokens (30-day, HMAC-signed) ──────────────────────────────────
function createSessionToken(userId, groupCode, role) {
  const payload = { userId, groupCode, role, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 };
  const encoded = base64url(payload);
  const sig = crypto.createHmac('sha256', sessionSecret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expected = crypto.createHmac('sha256', sessionSecret).update(encoded).digest('base64url');
    if (expected.length !== sig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

// ── HTTP helpers ───────────────────────────────────────────────────────────
function send(res, status, body) {
  const content = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(content),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  });
  res.end(content);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 4 * 1024 * 1024) { req.destroy(); reject(new Error('Request body too large')); }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
  });
}

function getBearerToken(req, url) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return url.searchParams.get('token');
}

async function requireAuth(req, url) {
  const token = getBearerToken(req, url);
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const db = await readDb();
  const user = db.users.find(u => u.id === payload.userId && u.groupCode === payload.groupCode && u.active);
  return user ? { db, user } : null;
}

function requireRole(auth, role) {
  return auth?.user?.role === role;
}

function broadcast(groupCode, event, payload) {
  const clients = clientsByGroup.get(groupCode);
  if (!clients) return;
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) res.write(data);
}

function addAudit(db, user, action, entityId, details = {}) {
  db.auditLogs.push({
    id: id('audit'), groupCode: user.groupCode, userId: user.id, userName: user.name,
    action, entityId, details, createdAt: now(),
  });
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

// ── Bill branding (per-group, admin-editable) ───────────────────────────────
const DEFAULT_BRANDING = {
  companyName: 'Shivam Transport',
  tagline: 'Transport & Logistics Solutions',
  proprietorName: '',
  phone1: '',
  phone2: '',
  address: '',
  gstNumber: '',
  footerNote: 'Thank you for your business!',
  primaryColor: '#0B2B5E',
  accentColor: '#F0B90B',
  logoDataUrl: '',
  signatureDataUrl: '',
  bankName: '',
  bankBranch: '',
  bankAccountNumber: '',
  bankIfsc: '',
  bankAccounts: [],
  publicServerUrl: '',
  nextInvoiceNumber: 1,
};

function sanitizeBankAccounts(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map(account => ({
    id: String(account?.id || '').trim() || id('bank'),
    label: String(account?.label || '').trim(),
    bankName: String(account?.bankName || '').trim(),
    bankBranch: String(account?.bankBranch || '').trim(),
    accountNumber: String(account?.accountNumber || '').trim(),
    ifscCode: String(account?.ifscCode || '').trim(),
  })).filter(account => account.label || account.bankName || account.accountNumber);
}

function getBranding(group) {
  return { ...DEFAULT_BRANDING, ...(group?.branding || {}) };
}

let mailTransporter = null;
function getMailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return mailTransporter;
}

function validateTripInput(body) {
  const errors = [];
  if (!String(body.customerName || '').trim() && !String(body.customerId || '').trim())
    errors.push('Customer is required');
  if (!String(body.pickupLocation || '').trim()) errors.push('Pickup location is required');
  if (!String(body.dropLocation || '').trim()) errors.push('Drop location is required');
  if (!String(body.vehicleType || '').trim()) errors.push('Vehicle type is required');
  if (toNumber(body.amount) <= 0) errors.push('Amount must be greater than zero');
  if (toNumber(body.advanceAmount) < 0) errors.push('Advance amount cannot be negative');
  return errors;
}

function findOrCreateCustomer(db, groupCode, trip) {
  if (trip.customerId) {
    const existing = db.customers.find(c => c.groupCode === groupCode && c.id === trip.customerId);
    if (existing) return existing;
  }
  const name = String(trip.customerName || '').trim();
  const phone = String(trip.customerPhone || '').trim();
  const existingByName = db.customers.find(
    c => c.groupCode === groupCode && c.name.toLowerCase() === name.toLowerCase()
  );
  if (existingByName) return existingByName;
  const customer = {
    id: id('customer'), groupCode, name, phone,
    address: String(trip.customerAddress || '').trim(),
    email: '', gstNumber: '', advanceBalance: 0,
    createdAt: now(), updatedAt: now(),
  };
  db.customers.push(customer);
  return customer;
}

// ── Static file serving ────────────────────────────────────────────────────
function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const filePath = urlPath === '/' ? path.join(distDir, 'index.html') : path.join(distDir, urlPath);
  const resolved = path.resolve(filePath);
  const safeTarget = resolved.startsWith(path.resolve(distDir)) ? resolved : path.join(distDir, 'index.html');
  const fallback = path.join(distDir, 'index.html');
  const target = fs.existsSync(safeTarget) && fs.statSync(safeTarget).isFile() ? safeTarget : fallback;

  if (!fs.existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Build the frontend first with: npm run build');
    return;
  }

  const ext = path.extname(target).toLowerCase();
  const mime = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(target).pipe(res);
}

// ── API routes ─────────────────────────────────────────────────────────────
async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') return send(res, 204, {});

  if (pathname === '/api/health') {
    return send(res, 200, { ok: true, time: now() });
  }

  // ── SIGNUP (Admin creates group; Driver joins with group code) ────────────
  if (pathname === '/api/auth/signup' && req.method === 'POST') {
    const body = await readBody(req);
    const role     = body.role === 'admin' ? 'admin' : 'driver';
    const name     = String(body.name || '').trim();
    const phone    = String(body.phone || '').trim();
    const password = String(body.password || '');
    const requestedGroupCode = normalizeGroupCode(body.groupCode);

    if (!name || !phone)
      return send(res, 400, { message: 'Name and phone are required' });
    if (!password || password.length < 6)
      return send(res, 400, { message: 'Password must be at least 6 characters' });

    const db = await readDb();
    let groupCode = requestedGroupCode;
    let group = groupCode ? db.groups.find(g => g.code === groupCode) : null;

    if (role === 'driver' && !group) {
      return send(res, 400, { message: 'A valid group code from your admin is required to register as a driver' });
    }

    if (role === 'admin' && !group) {
      groupCode = groupCode || generateGroupCode();
      while (db.groups.some(g => g.code === groupCode)) groupCode = generateGroupCode();
      group = {
        code: groupCode,
        name: String(body.groupName || 'Shivam Transport').trim(),
        createdAt: now(),
      };
      db.groups.push(group);
    }

    const duplicate = db.users.find(u => u.groupCode === groupCode && u.phone === phone);
    if (duplicate)
      return send(res, 409, { message: 'A user with this phone already exists in this group' });

    let userCode = generateUserCode(role);
    while (db.users.some(u => u.userCode === userCode)) userCode = generateUserCode(role);

    const user = {
      id: id('user'), groupCode, role, name, phone, userCode,
      passwordHash: hashPassword(password),
      active: true, createdAt: now(), updatedAt: now(),
    };
    db.users.push(user);
    addAudit(db, user, 'user.signup', user.id, { role: user.role });
    await writeDb(db);

    const token = createSessionToken(user.id, user.groupCode, user.role);
    return send(res, 201, { token, user: safeUser(user), group });
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body      = await readBody(req);
    const phone     = String(body.phone || '').trim();
    const password  = String(body.password || '');
    const groupCode = normalizeGroupCode(body.groupCode);

    if (!phone || !password || !groupCode)
      return send(res, 400, { message: 'Phone, password and group code are required' });

    const db    = await readDb();
    const group = db.groups.find(g => g.code === groupCode);
    if (!group) return send(res, 401, { message: 'Invalid group code' });

    const user = db.users.find(u => u.groupCode === groupCode && u.phone === phone && u.active);
    if (!user || !verifyPassword(password, user.passwordHash))
      return send(res, 401, { message: 'Invalid phone number or password' });

    const token = createSessionToken(user.id, user.groupCode, user.role);
    return send(res, 200, { token, user: safeUser(user), group });
  }

  // ── All routes below require a valid session token ────────────────────────
  const auth = await requireAuth(req, url);
  if (!auth) return send(res, 401, { message: 'Authentication required' });

  // ── GET /api/me ───────────────────────────────────────────────────────────
  if (pathname === '/api/me' && req.method === 'GET') {
    const group = auth.db.groups.find(g => g.code === auth.user.groupCode);
    return send(res, 200, { user: safeUser(auth.user), group });
  }

  // ── Bill branding (theme/company details, editable by admin) ──────────────
  if (pathname === '/api/branding' && req.method === 'GET') {
    const group = auth.db.groups.find(g => g.code === auth.user.groupCode);
    return send(res, 200, { branding: getBranding(group) });
  }

  if (pathname === '/api/branding' && req.method === 'PUT') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const body = await readBody(req);
    const db = auth.db;
    const group = db.groups.find(g => g.code === auth.user.groupCode);
    if (!group) return send(res, 404, { message: 'Group not found' });
    const current = getBranding(group);
    const editable = [
      'companyName', 'tagline', 'proprietorName', 'phone1', 'phone2', 'address',
      'gstNumber', 'footerNote', 'primaryColor', 'accentColor', 'logoDataUrl', 'signatureDataUrl',
      'bankName', 'bankBranch', 'bankAccountNumber', 'bankIfsc', 'publicServerUrl',
    ];
    const updated = { ...current };
    for (const key of editable) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updated[key] = String(body[key] ?? '').trim();
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'bankAccounts')) {
      updated.bankAccounts = sanitizeBankAccounts(body.bankAccounts);
    }
    group.branding = updated;
    addAudit(db, auth.user, 'branding.update', group.code);
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'branding.update', branding: updated });
    return send(res, 200, { branding: updated });
  }

  if (pathname === '/api/branding/next-invoice-number' && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const db = auth.db;
    const group = db.groups.find(g => g.code === auth.user.groupCode);
    if (!group) return send(res, 404, { message: 'Group not found' });
    const branding = getBranding(group);
    const invoiceNumber = branding.nextInvoiceNumber || 1;
    branding.nextInvoiceNumber = invoiceNumber + 1;
    group.branding = branding;
    await writeDb(db);
    return send(res, 200, { invoiceNumber });
  }

  // ── Saved bills ("My Bills") ─────────────────────────────────────────────
  // A record of every bill the admin has explicitly saved from the View & Print Bill preview —
  // a snapshot (trip lines + totals as they were at save time), not a live view, so it stays
  // accurate for reference even if the underlying trips get edited or deleted later.
  if (pathname === '/api/bills' && req.method === 'GET') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const bills = auth.db.bills
      .filter(b => b.groupCode === auth.user.groupCode)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return send(res, 200, { bills });
  }

  if (pathname === '/api/bills' && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const body = await readBody(req);
    const customerId = String(body.customerId || '').trim();
    if (!customerId) return send(res, 400, { message: 'customerId is required' });
    const db = auth.db;
    const customer = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === customerId);
    if (!customer) return send(res, 404, { message: 'Customer not found' });
    const trips = Array.isArray(body.trips) ? body.trips : [];
    const bill = {
      id: id('bill'),
      groupCode: auth.user.groupCode,
      customerId: customer.id,
      customerName: customer.name,
      billNo: String(body.billNo || '').trim(),
      billDate: String(body.billDate || now()),
      isGstBill: Boolean(body.isGstBill),
      gstPercent: toNumber(body.gstPercent),
      discount: toNumber(body.discount),
      subTotal: toNumber(body.subTotal),
      received: toNumber(body.received),
      gstAmount: toNumber(body.gstAmount),
      grandTotal: toNumber(body.grandTotal),
      advanceApplied: toNumber(body.advanceApplied),
      netPayable: toNumber(body.netPayable),
      amountInWords: String(body.amountInWords || '').trim(),
      trips: trips.map(t => ({
        tripId: String(t.tripId || ''),
        date: String(t.date || ''),
        pickupLocation: String(t.pickupLocation || ''),
        dropLocation: String(t.dropLocation || ''),
        amount: toNumber(t.amount),
        paidAmount: toNumber(t.paidAmount),
      })),
      customerPhone: String(body.customerPhone || '').trim(),
      customerAddress: String(body.customerAddress || '').trim(),
      customerGst: String(body.customerGst || '').trim(),
      bankName: String(body.bankName || '').trim(),
      bankBranch: String(body.bankBranch || '').trim(),
      accountNumber: String(body.accountNumber || '').trim(),
      ifscCode: String(body.ifscCode || '').trim(),
      createdAt: now(),
      createdBy: auth.user.name,
    };

    // Finalizing this bill "spends" whatever advance balance the preview applied — deduct it for
    // real, and actually MOVE that amount out of the active entries (oldest deposit first) into
    // the deleted/record section tagged with the bill number, splitting an entry if the consumed
    // amount doesn't line up exactly with one deposit. This keeps "Advance Balance" showing only
    // what's genuinely left, with the used portion still traceable to which bill it went to.
    if (bill.advanceApplied > 0) {
      const available = toNumber(customer.advanceBalance);
      let remaining = Math.min(bill.advanceApplied, available);
      if (remaining > 0) {
        if (!Array.isArray(customer.advanceHistory)) customer.advanceHistory = [];
        const activeEntries = customer.advanceHistory
          .filter(e => !e.deleted)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        for (const entry of activeEntries) {
          if (remaining <= 0) break;
          const entryAmount = toNumber(entry.amount);
          if (entryAmount <= remaining) {
            entry.deleted = true;
            entry.deletedAt = now();
            entry.usedInBillNo = bill.billNo;
            remaining -= entryAmount;
          } else {
            entry.amount = entryAmount - remaining;
            customer.advanceHistory.push({
              id: id('adv'), amount: remaining, note: entry.note, date: entry.date, createdAt: now(),
              deleted: true, deletedAt: now(), usedInBillNo: bill.billNo,
            });
            remaining = 0;
          }
        }
        customer.advanceBalance = available - Math.min(bill.advanceApplied, available);
        addAudit(db, auth.user, 'customer.advance.usedInBill', customer.id, { amount: Math.min(bill.advanceApplied, available), billNo: bill.billNo });
      }
    }

    db.bills.push(bill);
    customer.updatedAt = now();
    addAudit(db, auth.user, 'bill.save', bill.id, { customerId: customer.id, billNo: bill.billNo, netPayable: bill.netPayable });
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.edit', customer });
    return send(res, 201, { bill });
  }

  // Delete a saved bill — soft delete (mirrors the advance-payment delete flow): kept as a record,
  // just excluded from the active list, until the admin permanently removes it below.
  const billSoftDelete = pathname.match(/^\/api\/bills\/([^/]+)$/);
  if (billSoftDelete && req.method === 'DELETE') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const billId = billSoftDelete[1];
    const db = auth.db;
    const bill = db.bills.find(b => b.groupCode === auth.user.groupCode && b.id === billId);
    if (!bill) return send(res, 404, { message: 'Bill not found' });
    if (bill.deleted) return send(res, 400, { message: 'This bill was already deleted' });
    bill.deleted = true;
    bill.deletedAt = now();
    addAudit(db, auth.user, 'bill.delete', bill.id, { customerId: bill.customerId, billNo: bill.billNo });
    await writeDb(db);
    return send(res, 200, { bill });
  }

  // Permanently erase an already-deleted bill — no way back, unlike the soft delete above.
  const billPermanentDelete = pathname.match(/^\/api\/bills\/([^/]+)\/permanent$/);
  if (billPermanentDelete && req.method === 'DELETE') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const billId = billPermanentDelete[1];
    const db = auth.db;
    const bill = db.bills.find(b => b.groupCode === auth.user.groupCode && b.id === billId);
    if (!bill) return send(res, 404, { message: 'Bill not found' });
    if (!bill.deleted) return send(res, 400, { message: 'Only already-deleted bills can be permanently removed' });
    db.bills = db.bills.filter(b => b.id !== billId);
    addAudit(db, auth.user, 'bill.permanentDelete', billId, { customerId: bill.customerId, billNo: bill.billNo });
    await writeDb(db);
    return send(res, 200, { ok: true });
  }

  // ── Email notifications (bills / payment reminders via Gmail SMTP) ───────
  if (pathname === '/api/notify/email' && req.method === 'POST') {
    const body = await readBody(req);
    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim() || 'Shivam Transport';
    const text = String(body.text || '');
    if (!isValidEmail(to)) return send(res, 400, { message: 'A valid recipient email is required' });
    const transporter = getMailTransporter();
    if (!transporter) {
      return send(res, 400, {
        message: 'Email is not configured on this server. Set GMAIL_USER and GMAIL_APP_PASSWORD in the .env file, then restart the server.',
      });
    }
    try {
      const group = auth.db.groups.find(g => g.code === auth.user.groupCode);
      const fromName = getBranding(group).companyName || 'Shivam Transport';
      await transporter.sendMail({
        from: `"${fromName}" <${process.env.GMAIL_USER}>`,
        to, subject, text,
      });
      addAudit(auth.db, auth.user, 'email.sent', to, { subject });
      await writeDb(auth.db);
      return send(res, 200, { ok: true });
    } catch (error) {
      return send(res, 502, { message: `Could not send email: ${error instanceof Error ? error.message : 'unknown error'}` });
    }
  }

  // ── Server-Sent Events ────────────────────────────────────────────────────
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
      Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*',
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    const groupCode = auth.user.groupCode;
    if (!clientsByGroup.has(groupCode)) clientsByGroup.set(groupCode, new Set());
    clientsByGroup.get(groupCode).add(res);
    req.on('close', () => clientsByGroup.get(groupCode)?.delete(res));
    return;
  }

  // ── Drivers (read-only roster of who has joined the group) ─────────────────
  if (pathname === '/api/drivers' && req.method === 'GET') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const drivers = auth.db.users
      .filter(u => u.groupCode === auth.user.groupCode && u.role === 'driver')
      .map(safeUser)
      .sort((a, b) => a.name.localeCompare(b.name));
    return send(res, 200, { drivers });
  }

  // Restore from a downloaded backup file — imports the customers/trips it contains into the
  // CURRENT admin's group (rewriting groupCode and re-linking customerId to freshly-minted ids,
  // since a backup taken from a different account carries that account's own ids/groupCode).
  // Additive: existing customers/trips in this group are left alone, the import is appended.
  if (pathname === '/api/restore' && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const body = await readBody(req);
    const incomingCustomers = Array.isArray(body.customers) ? body.customers : [];
    const incomingTrips = Array.isArray(body.trips) ? body.trips : [];
    if (!incomingCustomers.length && !incomingTrips.length) {
      return send(res, 400, { message: 'Backup file has no customers or trips to restore' });
    }
    const db = auth.db;
    const groupCode = auth.user.groupCode;
    const idMap = new Map(); // old customer id (from the backup) -> new id in this group

    for (const c of incomingCustomers) {
      const newId = id('customer');
      if (c && c.id) idMap.set(c.id, newId);
      db.customers.push({
        id: newId, groupCode,
        name: String(c?.name || '').trim() || 'Unnamed Customer',
        phone: String(c?.phone || '').trim(),
        address: String(c?.address || '').trim(),
        email: String(c?.email || '').trim(),
        gstNumber: String(c?.gstNumber || '').trim(),
        advanceBalance: toNumber(c?.advanceBalance),
        advanceHistory: Array.isArray(c?.advanceHistory) ? c.advanceHistory : [],
        createdAt: c?.createdAt || now(), updatedAt: now(),
      });
    }

    for (const t of incomingTrips) {
      db.trips.push({
        id: id('trip'), groupCode,
        customerId: (t?.customerId && idMap.get(t.customerId)) || '',
        customerName: String(t?.customerName || '').trim(),
        customerPhone: String(t?.customerPhone || '').trim(),
        customerAddress: String(t?.customerAddress || '').trim(),
        driverId: '', driverName: String(t?.driverName || '').trim(), driverCode: String(t?.driverCode || '').trim(),
        date: t?.date || now(),
        pickupLocation: String(t?.pickupLocation || '').trim(),
        dropLocation: String(t?.dropLocation || '').trim(),
        amount: toNumber(t?.amount),
        advanceAmount: toNumber(t?.advanceAmount),
        isPaid: Boolean(t?.isPaid),
        paidAmount: toNumber(t?.paidAmount),
        paymentMode: String(t?.paymentMode || '').trim(),
        paidAt: t?.paidAt || '',
        vehicleType: String(t?.vehicleType || '').trim(),
        vehicleNumber: String(t?.vehicleNumber || '').trim(),
        materialType: String(t?.materialType || '').trim(),
        status: t?.status || 'approved',
        rejectionReason: String(t?.rejectionReason || '').trim(),
        submittedAt: t?.submittedAt || now(), updatedAt: now(),
        approvedAt: t?.approvedAt || '', approvedBy: '',
      });
    }

    addAudit(db, auth.user, 'data.restore', groupCode, {
      customersImported: incomingCustomers.length, tripsImported: incomingTrips.length,
    });
    await writeDb(db);
    broadcast(groupCode, 'data-changed', { type: 'data.restore' });
    return send(res, 200, { customersImported: incomingCustomers.length, tripsImported: incomingTrips.length });
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  if (pathname === '/api/customers' && req.method === 'GET') {
    const customers = auth.db.customers
      .filter(c => c.groupCode === auth.user.groupCode)
      .sort((a, b) => a.name.localeCompare(b.name));
    return send(res, 200, { customers });
  }

  if (pathname === '/api/customers' && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    if (!name) return send(res, 400, { message: 'Customer name is required' });
    const customer = {
      id: id('customer'), groupCode: auth.user.groupCode, name,
      phone: String(body.phone || '').trim(),
      address: String(body.address || '').trim(),
      email: String(body.email || '').trim(),
      gstNumber: String(body.gstNumber || '').trim(),
      advanceBalance: 0,
      createdAt: now(), updatedAt: now(),
    };
    const db = auth.db;
    db.customers.push(customer);
    addAudit(db, auth.user, 'customer.create', customer.id);
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.create', customer });
    return send(res, 201, { customer });
  }

  const customerPatch = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (customerPatch && req.method === 'PATCH') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const customerId = customerPatch[1];
    const body = await readBody(req);
    const db = auth.db;
    const customer = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === customerId);
    if (!customer) return send(res, 404, { message: 'Customer not found' });
    const editable = ['name', 'phone', 'address', 'email', 'gstNumber'];
    for (const key of editable) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        customer[key] = String(body[key] ?? '').trim();
      }
    }
    customer.updatedAt = now();
    addAudit(db, auth.user, 'customer.edit', customer.id);
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.edit', customer });
    return send(res, 200, { customer });
  }

  // Record an advance payment against a customer's account (money paid before any specific
  // trip exists yet — gets drawn down later when settling a trip's payment). Each entry is kept
  // in advanceHistory (date + note) so the admin can review exactly what was paid and when,
  // separate from the running advanceBalance total used everywhere else.
  const customerAdvance = pathname.match(/^\/api\/customers\/([^/]+)\/advance$/);
  if (customerAdvance && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const customerId = customerAdvance[1];
    const body = await readBody(req);
    const amount = toNumber(body.amount);
    if (amount <= 0) return send(res, 400, { message: 'Amount must be greater than zero' });
    const db = auth.db;
    const customer = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === customerId);
    if (!customer) return send(res, 404, { message: 'Customer not found' });
    const note = String(body.note || '').trim();
    const date = String(body.date || '').trim() || now();
    customer.advanceBalance = toNumber(customer.advanceBalance) + amount;
    if (!Array.isArray(customer.advanceHistory)) customer.advanceHistory = [];
    customer.advanceHistory.push({ id: id('adv'), amount, note, date, createdAt: now() });
    customer.updatedAt = now();
    addAudit(db, auth.user, 'customer.advance.add', customer.id, { amount, note, date });
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.edit', customer });
    return send(res, 200, { customer });
  }

  // Delete a single advance-history entry (e.g. one entered by mistake) and reverse its effect
  // on the running advance balance. This is a SOFT delete — the entry stays in advanceHistory
  // flagged deleted/deletedAt so the admin keeps a record of what was removed and when, it's
  // just excluded from the available balance and the active list.
  const customerAdvanceDelete = pathname.match(/^\/api\/customers\/([^/]+)\/advance\/([^/]+)$/);
  if (customerAdvanceDelete && req.method === 'DELETE') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const [, customerId, advanceId] = customerAdvanceDelete;
    const db = auth.db;
    const customer = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === customerId);
    if (!customer) return send(res, 404, { message: 'Customer not found' });
    const history = Array.isArray(customer.advanceHistory) ? customer.advanceHistory : [];
    const entry = history.find(h => h.id === advanceId);
    if (!entry) return send(res, 404, { message: 'Advance entry not found' });
    if (entry.deleted) return send(res, 400, { message: 'This advance entry was already deleted' });
    entry.deleted = true;
    entry.deletedAt = now();
    customer.advanceBalance = toNumber(customer.advanceBalance) - toNumber(entry.amount);
    customer.updatedAt = now();
    addAudit(db, auth.user, 'customer.advance.delete', customer.id, { amount: entry.amount, note: entry.note, date: entry.date });
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.edit', customer });
    return send(res, 200, { customer });
  }

  // Permanently erase an already-(soft)-deleted advance entry — no way back from here, unlike
  // the soft delete above which just excludes it from the active balance/list.
  const customerAdvancePermanentDelete = pathname.match(/^\/api\/customers\/([^/]+)\/advance\/([^/]+)\/permanent$/);
  if (customerAdvancePermanentDelete && req.method === 'DELETE') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const [, customerId, advanceId] = customerAdvancePermanentDelete;
    const db = auth.db;
    const customer = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === customerId);
    if (!customer) return send(res, 404, { message: 'Customer not found' });
    const history = Array.isArray(customer.advanceHistory) ? customer.advanceHistory : [];
    const entry = history.find(h => h.id === advanceId);
    if (!entry) return send(res, 404, { message: 'Advance entry not found' });
    if (!entry.deleted) return send(res, 400, { message: 'Only already-deleted entries can be permanently removed' });
    customer.advanceHistory = history.filter(h => h.id !== advanceId);
    customer.updatedAt = now();
    addAudit(db, auth.user, 'customer.advance.permanentDelete', customer.id, { amount: entry.amount, note: entry.note, date: entry.date });
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.edit', customer });
    return send(res, 200, { customer });
  }

  // Merge a duplicate customer record into another — moves every trip over, then removes the
  // source record. Used when the admin confirms two near-identical names are the same customer.
  const customerMerge = pathname.match(/^\/api\/customers\/([^/]+)\/merge$/);
  if (customerMerge && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const sourceId = customerMerge[1];
    const body = await readBody(req);
    const targetId = String(body.intoCustomerId || '').trim();
    const db = auth.db;
    const source = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === sourceId);
    const target = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === targetId);
    if (!source || !target) return send(res, 404, { message: 'Customer not found' });
    if (source.id === target.id) return send(res, 400, { message: 'Cannot merge a customer into itself' });
    for (const trip of db.trips) {
      if (trip.groupCode === auth.user.groupCode && trip.customerId === source.id) {
        trip.customerId = target.id;
        trip.customerName = target.name;
        trip.customerPhone = target.phone;
        trip.customerAddress = target.address;
        trip.updatedAt = now();
      }
    }
    target.advanceBalance = toNumber(target.advanceBalance) + toNumber(source.advanceBalance);
    if (Array.isArray(source.advanceHistory) && source.advanceHistory.length) {
      target.advanceHistory = [...(Array.isArray(target.advanceHistory) ? target.advanceHistory : []), ...source.advanceHistory];
    }
    target.updatedAt = now();
    db.customers = db.customers.filter(c => c.id !== source.id);
    addAudit(db, auth.user, 'customer.merge', target.id, { mergedFrom: source.id, mergedName: source.name });
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.merge', customerId: target.id });
    return send(res, 200, { customer: target });
  }

  const customerDelete = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (customerDelete && req.method === 'DELETE') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const customerId = customerDelete[1];
    const db = auth.db;
    db.customers = db.customers.filter(
      c => !(c.groupCode === auth.user.groupCode && c.id === customerId)
    );
    db.trips = db.trips.filter(
      t => !(t.groupCode === auth.user.groupCode && t.customerId === customerId)
    );
    addAudit(db, auth.user, 'customer.delete', customerId);
    await writeDb(db);
    broadcast(auth.user.groupCode, 'data-changed', { type: 'customer.delete', customerId });
    return send(res, 200, { ok: true });
  }

  // ── Trips ─────────────────────────────────────────────────────────────────
  if (pathname === '/api/trips' && req.method === 'GET') {
    const status = url.searchParams.get('status');
    let trips = auth.db.trips.filter(t => t.groupCode === auth.user.groupCode);
    if (auth.user.role !== 'admin') trips = trips.filter(t => t.driverId === auth.user.id);
    if (status) trips = trips.filter(t => t.status === status);
    trips.sort((a, b) =>
      new Date(b.submittedAt || b.date).getTime() - new Date(a.submittedAt || a.date).getTime()
    );
    return send(res, 200, { trips });
  }

  if (pathname === '/api/trips' && req.method === 'POST') {
    const body   = await readBody(req);
    const errors = validateTripInput(body);
    if (errors.length) return send(res, 400, { message: errors.join(', ') });

    const db      = auth.db;
    const isAdmin = auth.user.role === 'admin';
    const customer = body.customerId
      ? db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === body.customerId)
      : null;

    const trip = {
      id: id('trip'), groupCode: auth.user.groupCode,
      customerId: customer?.id || '',
      customerName: customer?.name || String(body.customerName || '').trim(),
      customerPhone: customer?.phone || String(body.customerPhone || '').trim(),
      customerAddress: customer?.address || String(body.customerAddress || '').trim(),
      driverId: auth.user.id, driverName: auth.user.name, driverCode: auth.user.userCode || '',
      date: body.date || now(),
      pickupLocation: String(body.pickupLocation || '').trim(),
      dropLocation: String(body.dropLocation || '').trim(),
      amount: toNumber(body.amount),
      advanceAmount: toNumber(body.advanceAmount),
      isPaid: Boolean(body.isPaid),
      // Collecting an advance upfront already counts as money paid — the running "paid so
      // far" total (shown on the bill and used to compute what's left owing) starts there.
      paidAmount: body.isPaid ? toNumber(body.amount) : toNumber(body.advanceAmount),
      paymentMode: String(body.paymentMode || '').trim(),
      paidAt: body.isPaid ? now() : '',
      vehicleType: String(body.vehicleType || '').trim(),
      vehicleNumber: String(body.vehicleNumber || '').trim(),
      materialType: String(body.materialType || '').trim(),
      status: isAdmin ? 'approved' : 'pending',
      rejectionReason: '',
      submittedAt: now(), updatedAt: now(),
      approvedAt: isAdmin ? now() : '',
      approvedBy: isAdmin ? auth.user.id : '',
    };

    if (isAdmin) {
      const approvedCustomer = findOrCreateCustomer(db, auth.user.groupCode, trip);
      trip.customerId   = approvedCustomer.id;
      trip.customerName = approvedCustomer.name;
    }

    db.trips.push(trip);
    addAudit(db, auth.user, isAdmin ? 'trip.create.approved' : 'trip.submit', trip.id);
    await writeDb(db);
    broadcast(auth.user.groupCode, 'trip-submitted', { trip });
    broadcast(auth.user.groupCode, 'data-changed', { type: 'trip.create', trip });
    return send(res, 201, { trip });
  }

  const tripPatch = pathname.match(/^\/api\/trips\/([^/]+)$/);
  if (tripPatch && req.method === 'PATCH') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const tripId = tripPatch[1];
    const body   = await readBody(req);
    const db     = auth.db;
    const trip   = db.trips.find(t => t.groupCode === auth.user.groupCode && t.id === tripId);
    if (!trip) return send(res, 404, { message: 'Trip not found' });

    const editable = [
      'customerId', 'customerName', 'customerPhone', 'customerAddress',
      'date', 'pickupLocation', 'dropLocation', 'vehicleType', 'vehicleNumber',
      'materialType', 'isPaid', 'paymentMode',
    ];
    const wasPaid = trip.isPaid;
    for (const key of editable) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        trip[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'amount'))        trip.amount = toNumber(body.amount);
    if (Object.prototype.hasOwnProperty.call(body, 'advanceAmount')) {
      trip.advanceAmount = toNumber(body.advanceAmount);
      // Raising the advance on an edit means more was actually collected upfront — reflect
      // that in the running paid total (never lowers it; a later real payment isn't erased).
      trip.paidAmount = Math.max(toNumber(trip.paidAmount), trip.advanceAmount);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'paidAmount'))    trip.paidAmount = toNumber(body.paidAmount);
    if (Object.prototype.hasOwnProperty.call(body, 'isPaid')) {
      if (trip.isPaid && !wasPaid) { trip.paidAt = now(); trip.paidAmount = trip.amount; }
      if (!trip.isPaid) { trip.paidAt = ''; trip.paymentMode = ''; trip.paidAmount = 0; }
    }
    trip.updatedAt = now();
    addAudit(db, auth.user, 'trip.edit', trip.id);
    await writeDb(db);
    broadcast(auth.user.groupCode, 'trip-updated', { trip });
    broadcast(auth.user.groupCode, 'data-changed', { type: 'trip.edit', trip });
    return send(res, 200, { trip });
  }

  // Record a payment against a trip — supports partial payments (admin types an amount) or
  // "mark fully paid" (fills in whatever balance remains). Optionally draws the amount down
  // from the customer's pre-paid advance balance instead of treating it as a fresh payment.
  const tripPayment = pathname.match(/^\/api\/trips\/([^/]+)\/payment$/);
  if (tripPayment && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const tripId = tripPayment[1];
    const body   = await readBody(req);
    const db     = auth.db;
    const trip   = db.trips.find(t => t.groupCode === auth.user.groupCode && t.id === tripId);
    if (!trip) return send(res, 404, { message: 'Trip not found' });

    const alreadyPaid = toNumber(trip.paidAmount);
    const remaining   = Math.max(0, toNumber(trip.amount) - alreadyPaid);
    const amount      = body.fullyPaid ? remaining : toNumber(body.amount);
    if (amount <= 0) return send(res, 400, { message: 'Enter an amount greater than zero' });

    if (body.fromAdvance) {
      const customer = db.customers.find(c => c.groupCode === auth.user.groupCode && c.id === trip.customerId);
      if (!customer) return send(res, 404, { message: 'Customer not found' });
      const available = toNumber(customer.advanceBalance);
      if (amount > available) return send(res, 400, { message: `Only ₹${available.toFixed(2)} available in advance balance` });
      customer.advanceBalance = available - amount;
      customer.updatedAt = now();
    }

    trip.paidAmount   = alreadyPaid + amount;
    trip.isPaid       = trip.paidAmount >= toNumber(trip.amount);
    trip.paymentMode  = String(body.paymentMode || trip.paymentMode || '').trim();
    trip.paidAt       = now();
    trip.updatedAt    = now();
    addAudit(db, auth.user, 'trip.payment', trip.id, { amount, fromAdvance: Boolean(body.fromAdvance) });
    await writeDb(db);
    broadcast(auth.user.groupCode, 'trip-updated', { trip });
    broadcast(auth.user.groupCode, 'data-changed', { type: 'trip.edit', trip });
    return send(res, 200, { trip });
  }

  const tripApprove = pathname.match(/^\/api\/trips\/([^/]+)\/approve$/);
  if (tripApprove && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const tripId = tripApprove[1];
    const db     = auth.db;
    const trip   = db.trips.find(t => t.groupCode === auth.user.groupCode && t.id === tripId);
    if (!trip) return send(res, 404, { message: 'Trip not found' });
    const customer = findOrCreateCustomer(db, auth.user.groupCode, trip);
    trip.customerId      = customer.id;
    trip.customerName    = customer.name;
    trip.status          = 'approved';
    trip.rejectionReason = '';
    trip.approvedAt      = now();
    trip.approvedBy      = auth.user.id;
    trip.updatedAt       = now();
    addAudit(db, auth.user, 'trip.approve', trip.id);
    await writeDb(db);
    broadcast(auth.user.groupCode, 'trip-updated', { trip });
    broadcast(auth.user.groupCode, 'data-changed', { type: 'trip.approve', trip });
    return send(res, 200, { trip });
  }

  const tripReject = pathname.match(/^\/api\/trips\/([^/]+)\/reject$/);
  if (tripReject && req.method === 'POST') {
    if (!requireRole(auth, 'admin')) return send(res, 403, { message: 'Admin access required' });
    const tripId = tripReject[1];
    const body   = await readBody(req);
    const db     = auth.db;
    const trip   = db.trips.find(t => t.groupCode === auth.user.groupCode && t.id === tripId);
    if (!trip) return send(res, 404, { message: 'Trip not found' });
    trip.status          = 'rejected';
    trip.rejectionReason = String(body.reason || 'Rejected by admin').trim();
    trip.updatedAt       = now();
    addAudit(db, auth.user, 'trip.reject', trip.id, { reason: trip.rejectionReason });
    await writeDb(db);
    broadcast(auth.user.groupCode, 'trip-updated', { trip });
    broadcast(auth.user.groupCode, 'data-changed', { type: 'trip.reject', trip });
    return send(res, 200, { trip });
  }

  return send(res, 404, { message: 'Route not found' });
}

// ── HTTP server ────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res);
    } else {
      serveStatic(req, res);
    }
  } catch (error) {
    console.error(error);
    send(res, 500, { message: error instanceof Error ? error.message : 'Server error' });
  }
});

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

(usingMongo ? connectMongo() : Promise.resolve(ensureDbFile()))
  .then(() => {
    server.listen(port, host, () => {
      const lanIp = getLanIp();
      console.log('\n========================================');
      console.log('  SHIVAM TRANSPORT SERVER STARTED');
      console.log('========================================');
      console.log(`  Admin (this laptop): http://localhost:${port}`);
      if (lanIp) {
        console.log(`  Drivers (phone/tablet): http://${lanIp}:${port}`);
        console.log(`  Share this URL with drivers: http://${lanIp}:${port}`);
      }
      console.log(usingMongo ? `  Database: MongoDB (${mongoDbName})` : `  Data file: ${dbPath}`);
      console.log('========================================\n');
    });
  })
  .catch(error => {
    console.error(`\nFailed to start${usingMongo ? ': could not connect to MongoDB' : ''}.`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
