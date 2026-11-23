import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_SETTINGS,
  PAID_EXTRAS,
  VERIFIED_BRANCHES,
} from './src/data/catalogSeed.ts';
import type {
  BranchInfo,
  CategoryInfo,
  ExtraOption,
  MenuItem,
  RestaurantSettings,
  SizeKey,
  SizePriceMap,
} from './src/types/menu.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'restaurant-db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface AdminAuthState {
  passwordHash: string;
  salt: string;
  seedEnvDigest: string | null;
  sessionSecret: string;
  updatedAt: number;
}

interface RestaurantDatabase {
  categories: CategoryInfo[];
  items: MenuItem[];
  branches: BranchInfo[];
  settings: RestaurantSettings;
  paidExtras: ExtraOption[];
  adminAuth: AdminAuthState;
  updatedAt: string;
}

function hashWithSalt(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function computeEnvDigest(secretValue: string): string {
  return crypto.createHash('sha256').update(secretValue, 'utf8').digest('hex');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function createInitialDb(): RestaurantDatabase {
  const envPass = (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
  const envSessionSecret = (process.env.ADMIN_SESSION_SECRET || '').trim();
  const sessionSecret = envSessionSecret || crypto.randomBytes(32).toString('hex');

  let adminAuth: AdminAuthState;
  if (envPass) {
    const salt = crypto.randomBytes(16).toString('hex');
    adminAuth = {
      passwordHash: hashWithSalt(envPass, salt),
      salt,
      seedEnvDigest: computeEnvDigest(envPass),
      sessionSecret,
      updatedAt: Date.now(),
    };
  } else {
    adminAuth = {
      passwordHash: '',
      salt: '',
      seedEnvDigest: null,
      sessionSecret,
      updatedAt: Date.now(),
    };
  }

  return {
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c })),
    items: INITIAL_MENU_ITEMS.map((item) => ({
      ...item,
      prices: { ...item.prices },
      pendingSizes: item.pendingSizes ? [...item.pendingSizes] : undefined,
      isHidden: Boolean(item.isHidden),
    })),
    branches: VERIFIED_BRANCHES.map((b) => ({ ...b, phones: [...b.phones] })),
    settings: { ...INITIAL_SETTINGS },
    paidExtras: PAID_EXTRAS.map((e) => ({ ...e })),
    adminAuth,
    updatedAt: new Date().toISOString(),
  };
}

let dbWriteQueue: Promise<void> = Promise.resolve();

function persistDbSync(state: RestaurantDatabase): void {
  ensureDirectories();
  const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function loadOrInitializeDb(): RestaurantDatabase {
  ensureDirectories();
  let db: RestaurantDatabase;
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<RestaurantDatabase>;
      const fallback = createInitialDb();
      db = {
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : fallback.categories,
        items: Array.isArray(parsed.items) && parsed.items.length > 0
          ? parsed.items
          : fallback.items,
        branches: Array.isArray(parsed.branches) && parsed.branches.length > 0
          ? parsed.branches.filter(branch => !['qanater', 'gesr-el-suez', 'north-coast'].includes(branch.id))
          : fallback.branches,
        settings: parsed.settings && typeof parsed.settings === 'object'
          ? { ...fallback.settings, ...parsed.settings }
          : fallback.settings,
        paidExtras: Array.isArray(parsed.paidExtras) && parsed.paidExtras.length > 0
          ? parsed.paidExtras
          : fallback.paidExtras,
        adminAuth: parsed.adminAuth && typeof parsed.adminAuth === 'object'
          ? {
              passwordHash: String(parsed.adminAuth.passwordHash || ''),
              salt: String(parsed.adminAuth.salt || ''),
              seedEnvDigest: parsed.adminAuth.seedEnvDigest ?? null,
              sessionSecret:
                (process.env.ADMIN_SESSION_SECRET || '').trim() ||
                String(parsed.adminAuth.sessionSecret || '') ||
                crypto.randomBytes(32).toString('hex'),
              updatedAt: Number(parsed.adminAuth.updatedAt) || Date.now(),
            }
          : fallback.adminAuth,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    } catch {
      db = createInitialDb();
    }
  } else {
    db = createInitialDb();
  }

  // Sync ADMIN_INITIAL_PASSWORD only if DB has no password yet or env secret value explicitly changed
  const envPass = (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
  if (envPass) {
    const digest = computeEnvDigest(envPass);
    if (!db.adminAuth.passwordHash || (db.adminAuth.seedEnvDigest && db.adminAuth.seedEnvDigest !== digest) || (!db.adminAuth.seedEnvDigest && !db.adminAuth.passwordHash)) {
      const salt = crypto.randomBytes(16).toString('hex');
      db.adminAuth.passwordHash = hashWithSalt(envPass, salt);
      db.adminAuth.salt = salt;
      db.adminAuth.seedEnvDigest = digest;
      db.adminAuth.updatedAt = Date.now();
    }
  }

  persistDbSync(db);
  return db;
}

const db: RestaurantDatabase = loadOrInitializeDb();

function saveDb(): Promise<void> {
  db.updatedAt = new Date().toISOString();
  const snapshot = JSON.stringify(db, null, 2);
  dbWriteQueue = dbWriteQueue.then(async () => {
    ensureDirectories();
    const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.promises.writeFile(tmpFile, snapshot, 'utf8');
    await fs.promises.rename(tmpFile, DB_FILE);
  });
  return dbWriteQueue;
}

function getSigningSecret(): string {
  return (process.env.ADMIN_SESSION_SECRET || '').trim() || db.adminAuth.sessionSecret;
}

function createAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'owner-admin',
      exp: expiresAt,
      pwVer: db.adminAuth.updatedAt,
      nonce: crypto.randomBytes(8).toString('hex'),
    }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('base64url');
  return { token: `${payload}.${sig}`, expiresAt };
}

function verifyAdminToken(token: string): boolean {
  if (!token || !db.adminAuth.passwordHash) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payload)
    .digest('base64url');

  if (!timingSafeStringEqual(sig, expectedSig)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
      pwVer?: number;
    };
    if (decoded.sub !== 'owner-admin') return false;
    if (!decoded.exp || decoded.exp < Date.now()) return false;
    if (decoded.pwVer !== db.adminAuth.updatedAt) return false;
    return true;
  } catch {
    return false;
  }
}

// Simple per-IP rate limiting for authentication endpoints
const authRateMap = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(req: Request, res: Response): boolean {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = authRateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    authRateMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  entry.count += 1;
  if (entry.count > 20) {
    res.status(429).json({
      error: 'تم تجاوز عدد محاولات تسجيل الدخول المسموح بها. برجاء الانتظار قليلاً.',
    });
    return false;
  }
  return true;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'غير مصرح. برجاء تسجيل الدخول كمسؤول أولاً.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'انتهت صلاحية الجلسة أو الرمز غير صالح.' });
    return;
  }
  next();
}

function sanitizeImagePath(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('./assets/')
  ) {
    if (trimmed.includes('..')) return null;
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizePrices(raw: unknown): { prices: SizePriceMap; pendingSizes: SizeKey[]; isPricePending: boolean } {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const keys: SizeKey[] = ['small', 'medium', 'large', 'single'];
  const prices: SizePriceMap = {};
  const pendingSizes: SizeKey[] = [];

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(input, k)) {
      const val = input[k];
      if (val === null) {
        prices[k] = null;
        pendingSizes.push(k);
      } else if (typeof val === 'number' && Number.isFinite(val) && val > 0 && val <= 100000) {
        prices[k] = Math.round(val * 100) / 100;
      } else if (typeof val === 'string' && val.trim() !== '') {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0 && num <= 100000) {
          prices[k] = Math.round(num * 100) / 100;
        }
      }
    }
  }

  if (Object.keys(prices).length === 0) {
    prices.single = null;
    pendingSizes.push('single');
  }

  const allNull = Object.values(prices).every((v) => v === null || v === undefined);
  return { prices, pendingSizes, isPricePending: allNull };
}

function detectImageExtension(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

function isUploadedPathUnused(imageUrl: string | null | undefined): boolean {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return false;
  const usedInItems = db.items.some((item) => item.image === imageUrl);
  const usedInCats = db.categories.some((cat) => cat.image === imageUrl);
  return !usedInItems && !usedInCats;
}

function tryDeleteUnusedUpload(imageUrl: string | null | undefined): void {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  if (!isUploadedPathUnused(imageUrl)) return;
  const fileName = imageUrl.slice('/uploads/'.length);
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return;
  const resolved = path.resolve(UPLOADS_DIR, fileName);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return;
  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '12mb' }));

  // Safely serve uploaded product & category photos from confined data/uploads directory
  app.get('/uploads/:filename', (req, res) => {
    const rawName = String(req.params.filename || '');
    if (!/^[a-zA-Z0-9._-]+$/.test(rawName)) {
      res.status(400).json({ error: 'اسم الملف غير صالح.' });
      return;
    }
    const resolved = path.resolve(UPLOADS_DIR, rawName);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(403).json({ error: 'مسار غير مصرح به.' });
      return;
    }
    if (!fs.existsSync(resolved)) {
      res.status(404).json({ error: 'الصورة غير موجودة.' });
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(resolved);
  });

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, updatedAt: db.updatedAt });
  });

  // Public Catalog (excludes hidden items so hidden items aren't exposed publicly)
  app.get('/api/public/catalog', (_req, res) => {
    res.json({
      categories: db.categories,
      items: db.items.filter((item) => !item.isHidden),
      branches: db.branches,
      settings: db.settings,
      paidExtras: db.paidExtras,
      updatedAt: db.updatedAt,
    });
  });

  // Admin Auth Status (never exposes secrets)
  app.get('/api/admin/auth-status', (_req, res) => {
    const requiresSetup = !db.adminAuth.passwordHash;
    const isEnvConfigured = Boolean((process.env.ADMIN_INITIAL_PASSWORD || '').trim());
    res.json({
      requiresSetup,
      isEnvConfigured,
      publicRegistrationAllowed: false,
    });
  });

  // One-time Initial Password Setup (ONLY allowed when no password hash is configured yet)
  app.post('/api/admin/setup', async (req, res) => {
    if (!checkAuthRateLimit(req, res)) return;

    if (db.adminAuth.passwordHash) {
      res.status(403).json({
        error: 'تم إعداد كلمة مرور الإدارة مسبقاً. التسجيل العام غير مسموح به.',
      });
      return;
    }

    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    if (newPassword.length < 4 || newPassword.length > 128) {
      res.status(400).json({ error: 'يجب أن تكون كلمة المرور بين 4 و 128 حرفاً.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    db.adminAuth.passwordHash = hashWithSalt(newPassword, salt);
    db.adminAuth.salt = salt;
    db.adminAuth.updatedAt = Date.now();
    await saveDb();

    const session = createAdminToken();
    res.status(201).json(session);
  });

  // Password Login
  app.post('/api/admin/login', (req, res) => {
    if (!checkAuthRateLimit(req, res)) return;

    if (!db.adminAuth.passwordHash || !db.adminAuth.salt) {
      res.status(412).json({
        error: 'لم يتم تعيين كلمة مرور الإدارة بعد. برجاء إكمال الإعداد الأولي.',
        requiresSetup: true,
      });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (!password) {
      res.status(400).json({ error: 'برجاء إدخال كلمة المرور.' });
      return;
    }

    const candidateHash = hashWithSalt(password, db.adminAuth.salt);
    if (!timingSafeStringEqual(candidateHash, db.adminAuth.passwordHash)) {
      res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
      return;
    }

    const session = createAdminToken();
    res.json(session);
  });

  // Verify Bearer Session
  app.get('/api/admin/verify', requireAdminAuth, (_req, res) => {
    res.json({ valid: true });
  });

  // Full Admin Catalog (includes hidden products)
  app.get('/api/admin/catalog', requireAdminAuth, (_req, res) => {
    res.json({
      categories: db.categories,
      items: db.items,
      branches: db.branches,
      settings: db.settings,
      paidExtras: db.paidExtras,
      updatedAt: db.updatedAt,
    });
  });

  // Change Admin Password
  app.post('/api/admin/change-password', requireAdminAuth, async (req, res) => {
    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword.trim() : '';
    const newPassword =
      typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'برجاء إدخال كلمة المرور الحالية والجديدة.' });
      return;
    }
    if (newPassword.length < 4 || newPassword.length > 128) {
      res.status(400).json({ error: 'يجب أن تكون كلمة المرور الجديدة بين 4 و 128 حرفاً.' });
      return;
    }

    const currentCandidate = hashWithSalt(currentPassword, db.adminAuth.salt);
    if (!timingSafeStringEqual(currentCandidate, db.adminAuth.passwordHash)) {
      res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
      return;
    }

    const nextSalt = crypto.randomBytes(16).toString('hex');
    db.adminAuth.passwordHash = hashWithSalt(newPassword, nextSalt);
    db.adminAuth.salt = nextSalt;
    // Preserve seedEnvDigest so server restart does not revert custom password unless env secret is changed
    const envPass = (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
    if (envPass) {
      db.adminAuth.seedEnvDigest = computeEnvDigest(envPass);
    }
    db.adminAuth.updatedAt = Date.now();
    await saveDb();

    const session = createAdminToken();
    res.json({
      message: 'تم تغيير كلمة المرور بنجاح وحفظها بأمان.',
      ...session,
    });
  });

  // Upload Photo (JPEG/PNG/WEBP validated by magic bytes)
  app.post('/api/admin/upload', requireAdminAuth, async (req, res) => {
    const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
    const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({
        error: 'صيغة الصورة غير مدعومة. المسموح به فقط صور JPEG أو PNG أو WebP.',
      });
      return;
    }

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({
        error: 'حجم الصورة يتجاوز الحد الأقصى المسموح به (8 ميجابايت).',
      });
      return;
    }

    const detected = detectImageExtension(buffer);
    if (!detected) {
      res.status(400).json({
        error: 'محتوى الملف ليس صورة صالحة (JPEG / PNG / WebP).',
      });
      return;
    }

    ensureDirectories();
    const safeName = `img_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${detected.ext}`;
    const dest = path.resolve(UPLOADS_DIR, safeName);
    if (!dest.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(403).json({ error: 'مسار حفظ غير مصرح به.' });
      return;
    }

    await fs.promises.writeFile(dest, buffer);
    res.status(201).json({
      imageUrl: `/uploads/${safeName}`,
      sizeBytes: buffer.length,
      mime: detected.mime,
    });
  });

  // Add Product
  app.post('/api/admin/products', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : '';

    if (!name || name.length > 140) {
      res.status(400).json({ error: 'اسم الصنف مطلوب (بحد أقصى 140 حرفاً).' });
      return;
    }
    if (!db.categories.some((c) => c.id === categoryId)) {
      res.status(400).json({ error: 'القسم المحدد غير موجود.' });
      return;
    }

    const { prices, pendingSizes, isPricePending } = sanitizePrices(body.prices);
    const id = `item-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const newItem: MenuItem = {
      id,
      name,
      categoryId,
      subGroup: typeof body.subGroup === 'string' && body.subGroup.trim() ? body.subGroup.trim() : undefined,
      description:
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : undefined,
      image: sanitizeImagePath(body.image),
      prices,
      isPricePending: Boolean(body.isPricePending) || isPricePending,
      pendingSizes: pendingSizes.length > 0 ? pendingSizes : undefined,
      supportsComplimentaryToppings: Boolean(body.supportsComplimentaryToppings),
      supportsSiyamiOption: Boolean(body.supportsSiyamiOption),
      supportsPaidExtras: Boolean(body.supportsPaidExtras),
      isFeatured: Boolean(body.isFeatured),
      isNew: Boolean(body.isNew),
      isHidden: Boolean(body.isHidden),
    };

    db.items.push(newItem);
    await saveDb();
    res.status(201).json({ item: newItem, updatedAt: db.updatedAt });
  });

  // Update Product
  app.put('/api/admin/products/:id', requireAdminAuth, async (req, res) => {
    const id = String(req.params.id || '');
    const index = db.items.findIndex((i) => i.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'الصنف غير موجود.' });
      return;
    }

    const existing = db.items[index];
    const body = req.body || {};

    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    if (!name || name.length > 140) {
      res.status(400).json({ error: 'اسم الصنف غير صالح.' });
      return;
    }

    const categoryId =
      typeof body.categoryId === 'string' ? body.categoryId.trim() : existing.categoryId;
    if (!db.categories.some((c) => c.id === categoryId)) {
      res.status(400).json({ error: 'القسم المحدد غير موجود.' });
      return;
    }

    const nextPricesData =
      body.prices !== undefined
        ? sanitizePrices(body.prices)
        : {
            prices: existing.prices,
            pendingSizes: existing.pendingSizes ?? [],
            isPricePending: Boolean(existing.isPricePending),
          };

    const nextImage =
      body.image !== undefined ? sanitizeImagePath(body.image) : existing.image;

    const updatedItem: MenuItem = {
      ...existing,
      name,
      categoryId,
      subGroup:
        body.subGroup !== undefined
          ? typeof body.subGroup === 'string' && body.subGroup.trim()
            ? body.subGroup.trim()
            : undefined
          : existing.subGroup,
      description:
        body.description !== undefined
          ? typeof body.description === 'string' && body.description.trim()
            ? body.description.trim()
            : undefined
          : existing.description,
      image: nextImage,
      prices: nextPricesData.prices,
      pendingSizes: nextPricesData.pendingSizes.length > 0 ? nextPricesData.pendingSizes : undefined,
      isPricePending:
        body.isPricePending !== undefined
          ? Boolean(body.isPricePending)
          : nextPricesData.isPricePending,
      supportsComplimentaryToppings:
        body.supportsComplimentaryToppings !== undefined
          ? Boolean(body.supportsComplimentaryToppings)
          : existing.supportsComplimentaryToppings,
      supportsSiyamiOption:
        body.supportsSiyamiOption !== undefined
          ? Boolean(body.supportsSiyamiOption)
          : existing.supportsSiyamiOption,
      supportsPaidExtras:
        body.supportsPaidExtras !== undefined
          ? Boolean(body.supportsPaidExtras)
          : existing.supportsPaidExtras,
      isFeatured:
        body.isFeatured !== undefined ? Boolean(body.isFeatured) : existing.isFeatured,
      isNew: body.isNew !== undefined ? Boolean(body.isNew) : existing.isNew,
      isHidden: body.isHidden !== undefined ? Boolean(body.isHidden) : existing.isHidden,
    };

    const previousImage = existing.image;
    db.items[index] = updatedItem;
    await saveDb();

    if (previousImage && previousImage !== updatedItem.image) {
      tryDeleteUnusedUpload(previousImage);
    }

    res.json({ item: updatedItem, updatedAt: db.updatedAt });
  });

  // Delete Product
  app.delete('/api/admin/products/:id', requireAdminAuth, async (req, res) => {
    const id = String(req.params.id || '');
    const index = db.items.findIndex((i) => i.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'الصنف غير موجود.' });
      return;
    }

    const removed = db.items[index];
    db.items.splice(index, 1);
    await saveDb();

    tryDeleteUnusedUpload(removed.image);
    res.json({ deletedId: id, updatedAt: db.updatedAt });
  });

  // Add Category
  app.post('/api/admin/categories', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : '';

    if (!name || name.length > 80) {
      res.status(400).json({ error: 'اسم القسم مطلوب.' });
      return;
    }

    const newCat: CategoryInfo = {
      id: `cat-${Date.now()}`,
      name,
      subtitle: subtitle || name,
      image: sanitizeImagePath(body.image) || '',
    };
    db.categories.push(newCat);
    await saveDb();
    res.status(201).json({ category: newCat, updatedAt: db.updatedAt });
  });

  // Update Category
  app.put('/api/admin/categories/:id', requireAdminAuth, async (req, res) => {
    const id = String(req.params.id || '');
    const index = db.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'القسم غير موجود.' });
      return;
    }

    const existing = db.categories[index];
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    if (!name) {
      res.status(400).json({ error: 'اسم القسم مطلوب.' });
      return;
    }

    const prevImage = existing.image;
    const nextImage =
      body.image !== undefined ? sanitizeImagePath(body.image) || '' : existing.image;

    const updatedCat: CategoryInfo = {
      ...existing,
      name,
      subtitle: typeof body.subtitle === 'string' ? body.subtitle.trim() : existing.subtitle,
      image: nextImage,
    };

    db.categories[index] = updatedCat;
    await saveDb();

    if (prevImage && prevImage !== updatedCat.image) {
      tryDeleteUnusedUpload(prevImage);
    }

    res.json({ category: updatedCat, updatedAt: db.updatedAt });
  });

  // Delete Category (only if no products reference it)
  app.delete('/api/admin/categories/:id', requireAdminAuth, async (req, res) => {
    const id = String(req.params.id || '');
    const index = db.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'القسم غير موجود.' });
      return;
    }

    const countInCat = db.items.filter((i) => i.categoryId === id).length;
    if (countInCat > 0) {
      res.status(409).json({
        error: `لا يمكن حذف القسم لوجود ${countInCat} صنف تابع له. انقل الأصناف أو احذفها أولاً.`,
      });
      return;
    }

    const removed = db.categories[index];
    db.categories.splice(index, 1);
    await saveDb();
    tryDeleteUnusedUpload(removed.image);

    res.json({ deletedId: id, updatedAt: db.updatedAt });
  });

  // Add Branch
  app.post('/api/admin/branches', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const phones = Array.isArray(body.phones)
      ? body.phones.map((p: unknown) => String(p || '').trim()).filter(Boolean)
      : [];

    if (!name || !address) {
      res.status(400).json({ error: 'اسم الفرع وعنوانه مطلوبان.' });
      return;
    }

    const newBranch: BranchInfo = {
      id: `branch-${Date.now()}`,
      name,
      address,
      hasVerifiedStreetAddress: Boolean(body.hasVerifiedStreetAddress),
      phones,
      complaintsWhatsapp:
        typeof body.complaintsWhatsapp === 'string' && body.complaintsWhatsapp.trim()
          ? body.complaintsWhatsapp.trim()
          : undefined,
      management:
        typeof body.management === 'string' && body.management.trim()
          ? body.management.trim()
          : undefined,
    };

    db.branches.push(newBranch);
    await saveDb();
    res.status(201).json({ branch: newBranch, updatedAt: db.updatedAt });
  });

  // Update Branch
  app.put('/api/admin/branches/:id', requireAdminAuth, async (req, res) => {
    const id = String(req.params.id || '');
    const index = db.branches.findIndex((b) => b.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'الفرع غير موجود.' });
      return;
    }

    const existing = db.branches[index];
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    const address = typeof body.address === 'string' ? body.address.trim() : existing.address;

    if (!name || !address) {
      res.status(400).json({ error: 'اسم الفرع وعنوانه مطلوبان.' });
      return;
    }

    const phones = Array.isArray(body.phones)
      ? body.phones.map((p: unknown) => String(p || '').trim()).filter(Boolean)
      : existing.phones;

    const updatedBranch: BranchInfo = {
      ...existing,
      name,
      address,
      hasVerifiedStreetAddress:
        body.hasVerifiedStreetAddress !== undefined
          ? Boolean(body.hasVerifiedStreetAddress)
          : existing.hasVerifiedStreetAddress,
      phones,
      complaintsWhatsapp:
        body.complaintsWhatsapp !== undefined
          ? typeof body.complaintsWhatsapp === 'string' && body.complaintsWhatsapp.trim()
            ? body.complaintsWhatsapp.trim()
            : undefined
          : existing.complaintsWhatsapp,
      management:
        body.management !== undefined
          ? typeof body.management === 'string' && body.management.trim()
            ? body.management.trim()
            : undefined
          : existing.management,
    };

    db.branches[index] = updatedBranch;
    await saveDb();
    res.json({ branch: updatedBranch, updatedAt: db.updatedAt });
  });

  // Delete Branch
  app.delete('/api/admin/branches/:id', requireAdminAuth, async (req, res) => {
    const id = String(req.params.id || '');
    const index = db.branches.findIndex((b) => b.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'الفرع غير موجود.' });
      return;
    }
    db.branches.splice(index, 1);
    await saveDb();
    res.json({ deletedId: id, updatedAt: db.updatedAt });
  });

  // Update Restaurant Settings (WhatsApp, Delivery Fee, Min Order, Brand Info)
  app.put('/api/admin/settings', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    const restaurantName =
      typeof body.restaurantName === 'string' && body.restaurantName.trim()
        ? body.restaurantName.trim()
        : db.settings.restaurantName;
    const tagline =
      typeof body.tagline === 'string' && body.tagline.trim()
        ? body.tagline.trim()
        : db.settings.tagline;

    const deliveryFee =
      typeof body.deliveryFee === 'number' && Number.isFinite(body.deliveryFee) && body.deliveryFee >= 0
        ? Math.round(body.deliveryFee)
        : db.settings.deliveryFee;

    const minOrderAmount =
      typeof body.minOrderAmount === 'number' &&
      Number.isFinite(body.minOrderAmount) &&
      body.minOrderAmount >= 0
        ? Math.round(body.minOrderAmount)
        : db.settings.minOrderAmount;

    const demoWhatsappEnabled =
      body.demoWhatsappEnabled !== undefined
        ? Boolean(body.demoWhatsappEnabled)
        : db.settings.demoWhatsappEnabled;

    const demoWhatsappNumber =
      body.demoWhatsappNumber !== undefined
        ? String(body.demoWhatsappNumber || '').trim().slice(0, 30)
        : db.settings.demoWhatsappNumber;

    db.settings = {
      restaurantName,
      tagline,
      deliveryFee,
      minOrderAmount,
      demoWhatsappEnabled,
      demoWhatsappNumber,
    };
    await saveDb();
    res.json({ settings: db.settings, updatedAt: db.updatedAt });
  });

  // Mount Vite dev middleware or serve static production build with SPA fallback for /admin
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
