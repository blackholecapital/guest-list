import { failure, readJson, success, type Env } from "../lib/api";
import { hashAccountToken, validUsername } from "../lib/promoter-account";
import { revokePromoterSessions } from "../lib/promoter-session";
import { createSalt, hashPassword } from "../lib/passwords";

type TokenRow = {
  promoter_id: number;
  promoter_name: string;
  promoter_slug: string;
  login_username: string | null;
};

async function findToken(db: D1Database, token: string) {
  return db.prepare(`
    SELECT
      t.promoter_id,
      p.name AS promoter_name,
      p.slug AS promoter_slug,
      p.login_username
    FROM promoter_account_tokens t
    JOIN promoters p ON p.id = t.promoter_id
    WHERE t.token_hash = ?
      AND t.used_at IS NULL
      AND t.expires_at > CURRENT_TIMESTAMP
      AND p.active = 1
    LIMIT 1
  `).bind(await hashAccountToken(token)).first<TokenRow>();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!token) return failure("TOKEN_REQUIRED", "This account link is missing its token.", 400);
  const row = await findToken(env.DB, token);
  if (!row) return failure("TOKEN_INVALID", "This account link is invalid, expired, or already used.", 410);
  return success({
    valid: true,
    promoterName: row.promoter_name,
    promoterSlug: row.promoter_slug,
    loginUsername: row.login_username ?? "",
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const token = typeof body?.token === "string" ? body.token : "";
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || !validUsername(username) || password.length < 8 || password.length > 128) {
    return failure(
      "VALIDATION_ERROR",
      "Use a 3–40 character username and a password between 8 and 128 characters.",
      400,
    );
  }

  const pepper = env.PROMOTER_PASSWORD_PEPPER?.trim() ?? "";
  if (pepper.length < 32) {
    return failure("PASSWORD_SECURITY_NOT_CONFIGURED", "Promoter password security is not configured.", 503);
  }
  const tokenRow = await findToken(env.DB, token);
  if (!tokenRow) return failure("TOKEN_INVALID", "This account link is invalid, expired, or already used.", 410);
  const colorLogins = new Set(["blue", "yellow", "red", "green", "purple", "orange", "teal", "pink"]);
  if (colorLogins.has(username.toLowerCase()) && username.toLowerCase() !== tokenRow.promoter_slug.toLowerCase()) {
    return failure("USERNAME_RESERVED", "That username belongs to another promoter color.", 409);
  }
  const existingUsername = await env.DB.prepare(`
    SELECT id FROM promoters
    WHERE login_username = ? COLLATE NOCASE AND id != ?
    LIMIT 1
  `).bind(username, tokenRow.promoter_id).first();
  if (existingUsername) return failure("USERNAME_IN_USE", "That username is already in use.", 409);

  const tokenHash = await hashAccountToken(token);
  const claimed = await env.DB.prepare(`
    UPDATE promoter_account_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    RETURNING promoter_id
  `).bind(tokenHash).first<{ promoter_id: number }>();
  if (!claimed) return failure("TOKEN_INVALID", "This account link is invalid, expired, or already used.", 410);

  try {
    const salt = createSalt();
    const passwordHash = await hashPassword(password, salt, pepper);
    const updateResult = await env.DB.prepare(`
      UPDATE promoters
      SET login_username = ?, password_hash = ?, password_salt = ?
      WHERE id = ?
    `).bind(username, passwordHash, salt, claimed.promoter_id).run();
    if ((updateResult.meta.changes ?? 0) !== 1) {
      throw new Error("Promoter account was not updated.");
    }
    try {
      await revokePromoterSessions(env.DB, claimed.promoter_id);
    } catch (error) {
      console.error("promoter session revocation failed after account setup", error);
    }
    return success({
      saved: true,
      loginUsername: username,
      promoterSlug: tokenRow.promoter_slug,
    });
  } catch (error) {
    await env.DB.prepare("UPDATE promoter_account_tokens SET used_at = NULL WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
    if (String(error).includes("UNIQUE")) {
      return failure("USERNAME_IN_USE", "That username is already in use.", 409);
    }
    console.error("promoter account setup failed", error);
    return failure("ACCOUNT_SETUP_FAILED", "The promoter account could not be saved.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return failure("METHOD_NOT_ALLOWED", "Use GET or POST for this endpoint.", 405);
};
