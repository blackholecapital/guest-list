const COOKIE_NAME = "__Host-guest_list_promoter";
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

export type PromoterSession = {
  promoterId: number;
  promoterSlug: string;
  promoterName: string;
  loginUsername: string;
  email: string;
};

export async function createPromoterSession(db: D1Database, promoterId: number) {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const hash = await tokenHash(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  await db.prepare("DELETE FROM promoter_sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();
  await db.prepare(`
    INSERT INTO promoter_sessions (token_hash, promoter_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(hash, promoterId, expiresAt).run();
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export async function getPromoterSession(request: Request, db: D1Database): Promise<PromoterSession | null> {
  const token = cookieValue(request);
  if (!token) return null;
  const row = await db.prepare(`
    SELECT
      p.id AS promoter_id,
      p.slug AS promoter_slug,
      p.name AS promoter_name,
      p.login_username,
      COALESCE(p.email, '') AS email
    FROM promoter_sessions s
    JOIN promoters p ON p.id = s.promoter_id
    WHERE s.token_hash = ?
      AND s.expires_at > CURRENT_TIMESTAMP
      AND p.active = 1
    LIMIT 1
  `).bind(await tokenHash(token)).first<{
    promoter_id: number;
    promoter_slug: string;
    promoter_name: string;
    login_username: string;
    email: string;
  }>();
  if (!row) return null;
  return {
    promoterId: Number(row.promoter_id),
    promoterSlug: String(row.promoter_slug),
    promoterName: String(row.promoter_name),
    loginUsername: String(row.login_username),
    email: String(row.email),
  };
}

export async function revokePromoterSession(request: Request, db: D1Database) {
  const token = cookieValue(request);
  if (token) {
    await db.prepare("DELETE FROM promoter_sessions WHERE token_hash = ?")
      .bind(await tokenHash(token))
      .run();
  }
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function revokePromoterSessions(db: D1Database, promoterId: number) {
  await db.prepare("DELETE FROM promoter_sessions WHERE promoter_id = ?").bind(promoterId).run();
}
