import {
  getAdminSecret,
  readBearer,
  sendJson,
  verifySignedToken,
} from './_security.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const secret = getAdminSecret();
  const payload = verifySignedToken(readBearer(req), secret);

  if (!payload || payload.typ !== 'admin') {
    return sendJson(res, 401, { valid: false });
  }

  return sendJson(res, 200, {
    valid: true,
    admin: { name: payload.name, loggedAt: payload.iat },
    expiresAt: payload.exp,
  });
}
