const COOKIE_NAME = "__Host-guest_list_admin";
const SESSION_SECONDS = 12 * 60 * 60;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

function cookieValue(request: Request) {
  const cookies = request.headers.get("Cookie") || "";
  for (const item of cookies.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(parts.join("="));
  }
  return "";
}

export async function createAdminSession(db: D1Database) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const hash = await tokenHash(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  await db.prepare(`DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP`).run();
  await db.prepare(`INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)`).bind(hash, expiresAt).run();
  return {
    token,
    cookie: `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
  };
}

export async function hasAdminSession(request: Request, db: D1Database) {
  const token = cookieValue(request);
  if (!token) return false;
  const session = await db.prepare(`
    SELECT token_hash
    FROM admin_sessions
    WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `).bind(await tokenHash(token)).first();
  return Boolean(session);
}

export async function revokeAdminSession(request: Request, db: D1Database) {
  const token = cookieValue(request);
  if (token) await db.prepare(`DELETE FROM admin_sessions WHERE token_hash = ?`).bind(await tokenHash(token)).run();
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
