import {
  cleanText,
  getAdminSecret,
  readBearer,
  sendJson,
  verifySignedToken,
} from './_security.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

function normalizeAuthUser(user) {
  const metadata = user?.user_metadata || {};
  return {
    name: cleanText(metadata.full_name || metadata.name || user.email || 'User Goisiinn', 120),
    email: cleanText(user.email, 160),
    picture: cleanText(metadata.avatar_url || metadata.picture || '', 500),
    registeredAt: cleanText(user.created_at, 80),
    lastLogin: cleanText(user.last_sign_in_at || user.updated_at || user.created_at, 80),
    source: 'supabase_auth',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const payload = verifySignedToken(readBearer(req), getAdminSecret());
  if (!payload || payload.typ !== 'admin') {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  if (!isConfigured()) {
    return sendJson(res, 503, {
      ok: false,
      users: [],
      error: 'Supabase service role belum dikonfigurasi.',
    });
  }

  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users?per_page=1000&page=1`, {
      method: 'GET',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return sendJson(res, response.status, {
        ok: false,
        users: [],
        error: 'Gagal mengambil user Supabase Auth.',
        detail: cleanText(data?.message || data?.error || '', 180),
      });
    }

    const users = Array.isArray(data?.users)
      ? data.users.map(normalizeAuthUser).filter((user) => user.email)
      : [];

    return sendJson(res, 200, { ok: true, users });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      users: [],
      error: 'Gagal mengambil user Supabase Auth.',
      detail: cleanText(error.message, 180),
    });
  }
}
