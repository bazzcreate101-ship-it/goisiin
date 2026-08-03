import crypto from 'node:crypto';
import {
  cleanText,
  getAdminSecret,
  getClientIp,
  rateLimit,
  readBearer,
  sendJson,
  verifySignedToken,
} from './_security.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE_NAME = 'goisiin_app_state';
const TRAFFIC_KEY = 'goisiin_traffic_hourly';
const RETENTION_HOURS = 72;
const MAX_DEVICE_IDS_PER_HOUR = 5000;
const MAX_KNOWN_DEVICES = 20000;

function isConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

function supabaseRestUrl(path = '') {
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${TABLE_NAME}${path}`;
}

function headers(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function emptyTrafficState() {
  return {
    version: 1,
    totals: {
      visits: 0,
      sessions: 0,
      uniqueDevices: 0,
      newDevices: 0,
      returningDevices: 0,
      sameDeviceVisits: 0,
    },
    knownDevices: [],
    hours: {},
    updatedAt: new Date().toISOString(),
  };
}

async function readTrafficState() {
  const response = await fetch(supabaseRestUrl(`?select=key,value&key=eq.${encodeURIComponent(TRAFFIC_KEY)}&limit=1`), {
    method: 'GET',
    headers: headers(),
  });
  if (!response.ok) throw new Error(`Traffic read failed: ${response.status}`);
  const rows = await response.json();
  return rows[0]?.value && typeof rows[0].value === 'object' ? rows[0].value : emptyTrafficState();
}

async function writeTrafficState(value) {
  const response = await fetch(supabaseRestUrl('?on_conflict=key'), {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([{ key: TRAFFIC_KEY, value }]),
  });
  if (!response.ok) throw new Error(`Traffic write failed: ${response.status}`);
}

function hashDeviceId(deviceId) {
  const secret = getAdminSecret() || SERVICE_ROLE_KEY || 'goisiinn-traffic';
  return crypto.createHmac('sha256', secret)
    .update(cleanText(deviceId, 120))
    .digest('hex')
    .slice(0, 24);
}

function hourKeyFromDate(date = new Date()) {
  const normalized = new Date(date);
  normalized.setMinutes(0, 0, 0);
  return normalized.toISOString().slice(0, 13);
}

function addCount(target, key, amount = 1) {
  const cleanKey = cleanText(key || 'unknown', 64) || 'unknown';
  target[cleanKey] = Number(target[cleanKey] || 0) + amount;
}

function getBrowser(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('samsungbrowser')) return 'Samsung Internet';
  if (ua.includes('chrome') || ua.includes('crios')) return 'Chrome';
  if (ua.includes('safari')) return 'Safari';
  return 'Lainnya';
}

function getOs(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) return 'iOS';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Lainnya';
}

function getDeviceType(userAgent, screen = {}) {
  const ua = String(userAgent || '').toLowerCase();
  const width = Number(screen.width || 0);
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) return 'Bot';
  if (ua.includes('ipad') || ua.includes('tablet') || (width >= 700 && width <= 1100 && ua.includes('android'))) return 'Tablet';
  if (ua.includes('mobile') || ua.includes('iphone') || width < 700) return 'Mobile';
  return 'Desktop';
}

function sanitizePath(path) {
  const cleaned = cleanText(path || '/', 120);
  if (!cleaned || !cleaned.startsWith('/')) return '/';
  return cleaned.replace(/[?#].*$/, '') || '/';
}

function parseRequestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
  return req.body;
}

function pruneState(state) {
  const cutoff = Date.now() - (RETENTION_HOURS * 60 * 60 * 1000);
  const nextHours = {};
  Object.entries(state.hours || {}).forEach(([hour, bucket]) => {
    const bucketTime = new Date(`${hour}:00:00.000Z`).getTime();
    if (Number.isFinite(bucketTime) && bucketTime >= cutoff) nextHours[hour] = bucket;
  });
  state.hours = nextHours;
  if (Array.isArray(state.knownDevices) && state.knownDevices.length > MAX_KNOWN_DEVICES) {
    state.knownDevices = state.knownDevices.slice(-MAX_KNOWN_DEVICES);
  }
  return state;
}

function summarize(state) {
  const hours = Object.entries(state.hours || {})
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([hour, bucket]) => {
      const uniqueDevices = Array.isArray(bucket.deviceIds) ? bucket.deviceIds.length : 0;
      return {
        hour,
        visits: Number(bucket.visits || 0),
        sessions: Number(bucket.sessions || 0),
        uniqueDevices,
        newDevices: Number(bucket.newDevices || 0),
        returningDevices: Number(bucket.returningDevices || 0),
        sameDeviceVisits: Math.max(0, Number(bucket.visits || 0) - uniqueDevices),
        devices: bucket.devices || {},
        browsers: bucket.browsers || {},
        os: bucket.os || {},
        pages: bucket.pages || {},
        lastSeenAt: bucket.lastSeenAt || '',
      };
    });

  const totals = hours.reduce((acc, hour) => {
    acc.visits += hour.visits;
    acc.sessions += hour.sessions;
    acc.newDevices += hour.newDevices;
    acc.returningDevices += hour.returningDevices;
    acc.sameDeviceVisits += hour.sameDeviceVisits;
    Object.entries(hour.devices).forEach(([key, value]) => addCount(acc.devices, key, value));
    Object.entries(hour.browsers).forEach(([key, value]) => addCount(acc.browsers, key, value));
    Object.entries(hour.os).forEach(([key, value]) => addCount(acc.os, key, value));
    Object.entries(hour.pages).forEach(([key, value]) => addCount(acc.pages, key, value));
    return acc;
  }, {
    visits: 0,
    sessions: 0,
    uniqueDevices: Array.isArray(state.knownDevices) ? state.knownDevices.length : 0,
    newDevices: 0,
    returningDevices: 0,
    sameDeviceVisits: 0,
    devices: {},
    browsers: {},
    os: {},
    pages: {},
  });

  return {
    ok: true,
    updatedAt: state.updatedAt || '',
    retentionHours: RETENTION_HOURS,
    totals,
    hours,
  };
}

function updateTrafficState(state, event, req) {
  const now = new Date();
  const hour = hourKeyFromDate(now);
  const userAgent = req.headers['user-agent'] || '';
  const deviceHash = hashDeviceId(event.deviceId || getClientIp(req));
  const knownDevices = new Set(Array.isArray(state.knownDevices) ? state.knownDevices : []);
  const wasKnownDevice = knownDevices.has(deviceHash);
  knownDevices.add(deviceHash);

  const bucket = state.hours?.[hour] || {
    visits: 0,
    sessions: 0,
    newDevices: 0,
    returningDevices: 0,
    deviceIds: [],
    sessionIds: [],
    devices: {},
    browsers: {},
    os: {},
    pages: {},
    lastSeenAt: '',
  };

  const deviceIds = new Set(Array.isArray(bucket.deviceIds) ? bucket.deviceIds : []);
  const sessionHash = hashDeviceId(`${event.sessionId || ''}:${deviceHash}`);
  const sessionIds = new Set(Array.isArray(bucket.sessionIds) ? bucket.sessionIds : []);
  const wasSeenThisHour = deviceIds.has(deviceHash);

  if (deviceIds.size < MAX_DEVICE_IDS_PER_HOUR) deviceIds.add(deviceHash);
  sessionIds.add(sessionHash);

  bucket.visits = Number(bucket.visits || 0) + 1;
  bucket.sessions = sessionIds.size;
  if (!wasSeenThisHour) {
    if (wasKnownDevice) bucket.returningDevices = Number(bucket.returningDevices || 0) + 1;
    else bucket.newDevices = Number(bucket.newDevices || 0) + 1;
  }
  addCount(bucket.devices, getDeviceType(userAgent, event.screen));
  addCount(bucket.browsers, getBrowser(userAgent));
  addCount(bucket.os, getOs(userAgent));
  addCount(bucket.pages, sanitizePath(event.path));
  bucket.deviceIds = Array.from(deviceIds);
  bucket.sessionIds = Array.from(sessionIds).slice(-MAX_DEVICE_IDS_PER_HOUR);
  bucket.lastSeenAt = now.toISOString();

  const nextState = {
    ...emptyTrafficState(),
    ...state,
    knownDevices: Array.from(knownDevices).slice(-MAX_KNOWN_DEVICES),
    hours: {
      ...(state.hours || {}),
      [hour]: bucket,
    },
    updatedAt: now.toISOString(),
  };

  return pruneState(nextState);
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!isConfigured()) {
    return sendJson(res, 503, { ok: false, disabled: true, error: 'Traffic analytics belum dikonfigurasi.' });
  }

  try {
    if (req.method === 'GET') {
      const payload = verifySignedToken(readBearer(req), getAdminSecret());
      if (!payload || payload.typ !== 'admin') return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      const state = pruneState(await readTrafficState());
      return sendJson(res, 200, summarize(state));
    }

    const ip = getClientIp(req);
    const limit = rateLimit({ key: `traffic:${ip}`, limit: 24, windowMs: 60 * 1000 });
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfter));
      return sendJson(res, 429, { ok: false, error: 'Terlalu banyak request trafik.' });
    }

    const body = parseRequestBody(req);
    const deviceId = cleanText(body.deviceId, 120);
    if (!deviceId || deviceId.length < 12) return sendJson(res, 400, { ok: false, error: 'deviceId tidak valid.' });

    const state = await readTrafficState();
    const nextState = updateTrafficState(state, {
      deviceId,
      sessionId: cleanText(body.sessionId, 120),
      path: body.path,
      screen: body.screen,
    }, req);
    await writeTrafficState(nextState);
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: 'Traffic analytics gagal diproses.',
      detail: cleanText(error.message, 180),
    });
  }
}
