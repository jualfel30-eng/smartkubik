import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { API, BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './constants';

export interface TestContext {
  baseUrl: string;
  authToken: string;
  tenantId: string;
  userId: string;
}

// Filesystem cache para compartir token entre TODOS los archivos de test
const CACHE_FILE = path.join(__dirname, '../../../../.test-auth-cache.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días (igual que JWT expiry)

interface CachedAuth {
  token: string;
  tenantId: string;
  userId: string;
  timestamp: number;
}

function readCache(): CachedAuth | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cached: CachedAuth = JSON.parse(data);

    // Verificar si el cache expiró
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      fs.unlinkSync(CACHE_FILE);
      return null;
    }

    return cached;
  } catch (error) {
    return null;
  }
}

function writeCache(token: string, tenantId: string, userId: string): void {
  try {
    const cached: CachedAuth = {
      token,
      tenantId,
      userId,
      timestamp: Date.now(),
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cached, null, 2));
  } catch (error) {
    // Silently fail - cache is optional optimization
    console.warn('Failed to write auth cache:', error);
  }
}

// Singleton: authenticate ONCE and reuse across all test files via filesystem cache
let _cachedCtx: TestContext | null = null;
let _bootPromise: Promise<TestContext> | null = null;

export async function bootstrapTestApp(): Promise<TestContext> {
  if (_cachedCtx) return _cachedCtx;
  if (_bootPromise) return _bootPromise;

  _bootPromise = (async () => {
    // Try to load from filesystem cache first
    const cached = readCache();
    if (cached) {
      console.log('✓ Using cached auth token from previous test run');
      _cachedCtx = {
        baseUrl: BASE_URL,
        authToken: cached.token,
        tenantId: cached.tenantId,
        userId: cached.userId,
      };
      return _cachedCtx;
    }

    console.log('→ Authenticating (no cached token found)...');

    // Authenticate against the running server
    const loginRes = await request(BASE_URL)
      .post(`${API}/auth/login`)
      .send({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD })
      .expect(200);

    const { accessToken } = loginRes.body.data;
    const { tenantId, _id: userId } = loginRes.body.data.user;

    // Save to filesystem cache for next test run
    writeCache(accessToken, tenantId, userId);

    _cachedCtx = { baseUrl: BASE_URL, authToken: accessToken, tenantId, userId };
    return _cachedCtx;
  })();

  return _bootPromise;
}

export async function teardownTestApp(): Promise<void> {
  // Clear cache when tests are done
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log('✓ Cleared auth cache');
    }
  } catch (error) {
    // Ignore
  }
  _cachedCtx = null;
  _bootPromise = null;
}

// Convenience wrappers — hit the live server
export function authGet(ctx: TestContext, url: string) {
  return request(ctx.baseUrl)
    .get(`${API}${url}`)
    .set('Authorization', `Bearer ${ctx.authToken}`);
}

export function authPost(ctx: TestContext, url: string, body?: any) {
  const req = request(ctx.baseUrl)
    .post(`${API}${url}`)
    .set('Authorization', `Bearer ${ctx.authToken}`);
  return body !== undefined ? req.send(body) : req;
}

export function authPatch(ctx: TestContext, url: string, body?: any) {
  const req = request(ctx.baseUrl)
    .patch(`${API}${url}`)
    .set('Authorization', `Bearer ${ctx.authToken}`);
  return body !== undefined ? req.send(body) : req;
}

export function authPut(ctx: TestContext, url: string, body?: any) {
  const req = request(ctx.baseUrl)
    .put(`${API}${url}`)
    .set('Authorization', `Bearer ${ctx.authToken}`);
  return body !== undefined ? req.send(body) : req;
}

export function authDelete(ctx: TestContext, url: string) {
  return request(ctx.baseUrl)
    .delete(`${API}${url}`)
    .set('Authorization', `Bearer ${ctx.authToken}`);
}

export function unauthGet(url: string) {
  return request(BASE_URL).get(`${API}${url}`);
}

export function unauthPost(url: string, body?: any) {
  const req = request(BASE_URL).post(`${API}${url}`);
  return body !== undefined ? req.send(body) : req;
}
