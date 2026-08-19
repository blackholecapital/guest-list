import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

type PromoterRow = {
  id: number;
  slug: string;
  name: string;
};

function defaultName(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }

  const body = await readJson(request);
  const promoterId = Number(body?.promoterId);
  if (!Number.isInteger(promoterId) || promoterId <= 0) {
    return failure("VALIDATION_ERROR", "Choose a valid promoter to reset.", 400);
  }

  try {
    const promoter = await env.DB.prepare(`
      SELECT id, slug, name
      FROM promoters
      WHERE id = ? AND active = 1
      LIMIT 1
    `).bind(promoterId).first<PromoterRow>();
    if (!promoter) return failure("PROMOTER_NOT_FOUND", "Promoter not found.", 404);

    const loginUsername = defaultName(promoter.slug);
    const conflictingLogin = await env.DB.prepare(`
      SELECT id
      FROM promoters
      WHERE login_username = ? COLLATE NOCASE AND id != ?
      LIMIT 1
    `).bind(loginUsername, promoterId).first<{ id: number }>();
    if (conflictingLogin) {
      return failure(
        "DEFAULT_LOGIN_IN_USE",
        `The default ${loginUsername} login is assigned to another promoter. Change that account username before resetting this slot.`,
        409,
      );
    }

    await env.DB.batch([
      env.DB.prepare(`
        UPDATE qr_codes
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE promoter_id = ? AND deleted_at IS NULL
      `).bind(promoterId),
      env.DB.prepare("DELETE FROM promoter_sessions WHERE promoter_id = ?").bind(promoterId),
      env.DB.prepare("DELETE FROM promoter_account_tokens WHERE promoter_id = ?").bind(promoterId),
      env.DB.prepare(`
        UPDATE promoters
        SET name = ?,
            login_username = ?,
            email = NULL,
            password_hash = NULL,
            password_salt = NULL,
            passes_used = 0,
            last_reset_at = CURRENT_TIMESTAMP,
            stats_reset_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(loginUsername, loginUsername, promoterId),
    ]);

    const resetPromoter = await env.DB.prepare(`
      SELECT id, slug, name, login_username, email, password_hash, password_salt, passes_used
      FROM promoters
      WHERE id = ?
      LIMIT 1
    `).bind(promoterId).first<{
      id: number;
      slug: string;
      name: string;
      login_username: string;
      email: string | null;
      password_hash: string | null;
      password_salt: string | null;
      passes_used: number;
    }>();
    if (
      !resetPromoter ||
      resetPromoter.email !== null ||
      resetPromoter.password_hash !== null ||
      resetPromoter.password_salt !== null ||
      Number(resetPromoter.passes_used) !== 0
    ) {
      throw new Error("D1 did not confirm the cleared promoter credentials");
    }

    return success({
      reset: true,
      promoter: {
        id: resetPromoter.id,
        slug: resetPromoter.slug,
        name: resetPromoter.name,
        login_username: resetPromoter.login_username,
        email: "",
      },
    });
  } catch (error) {
    console.error("promoter reset failed", error);
    return failure("PROMOTER_RESET_FAILED", "The promoter could not be reset. No reset was confirmed.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
