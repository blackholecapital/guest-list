import { failure, readJson, success, type Env } from "../lib/api";
import { hasAdminSession } from "../lib/admin-session";

async function resetExpiredPasses(env: Env): Promise<void> {
  await env.DB.prepare(`
    UPDATE promoters
    SET pass_limit = CASE WHEN pass_limit < 1 THEN 25 ELSE pass_limit END,
        reset_days = CASE WHEN reset_days < 1 THEN 1 ELSE reset_days END
  `).run();

  await env.DB.prepare(`
    UPDATE promoters
    SET passes_used = 0,
        last_reset_at = CURRENT_TIMESTAMP
    WHERE last_reset_at IS NULL
       OR datetime(last_reset_at, '+' || reset_days || ' days') <= CURRENT_TIMESTAMP
  `).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    await resetExpiredPasses(env);
    const isAdmin = await hasAdminSession(request, env.DB);

    const rows = await env.DB.prepare(`
      SELECT
        p.id,
        p.slug,
        p.name,
        p.active,
        p.pass_limit,
        p.reset_days,
        p.passes_used,
        MAX(p.pass_limit - p.passes_used, 0) AS passes_remaining,
        p.last_reset_at,
        p.login_username,
        p.email,
        (SELECT COUNT(*) FROM qr_codes q
          WHERE q.promoter_id = p.id
            AND q.deleted_at IS NULL
            AND q.created_at >= p.stats_reset_at) AS qr_generated,
        (SELECT COALESCE(SUM(q.used_count), 0) FROM qr_codes q
          WHERE q.promoter_id = p.id
            AND q.deleted_at IS NULL
            AND q.created_at >= p.stats_reset_at) AS qr_scanned
      FROM promoters p
      WHERE p.promoter_kind = 'regular'
      ORDER BY p.id
    `).all();

    return success({
      promoters: (rows.results ?? []).map((row: any) => ({
        ...row,
        email: isAdmin ? String(row.email ?? "") : undefined,
      })),
    });
  } catch (error) {
    console.error("promoters GET failed", error);
    return failure("DATABASE_ERROR", "Unable to load promoters.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }
  const body = await readJson(request);
  const id = Number(body?.id);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const passLimit = Number(body?.passLimit);
  const resetDays = Number(body?.resetDays);

  if (
    !Number.isInteger(id) || id <= 0 ||
    name.length < 1 || name.length > 80 ||
    !Number.isInteger(passLimit) || passLimit < 1 || passLimit > 100 ||
    !Number.isInteger(resetDays) || resetDays < 1 || resetDays > 30
  ) {
    return failure(
      "VALIDATION_ERROR",
      "Promoter names must be 1–80 characters, with 1–100 passes and a 1–30 day reset.",
      400,
    );
  }

  try {
    const updated = await env.DB.prepare(`
      UPDATE promoters
      SET name = ?,
          pass_limit = ?,
          reset_days = ?,
          passes_used = MIN(passes_used, ?),
          last_reset_at = COALESCE(last_reset_at, CURRENT_TIMESTAMP)
      WHERE id = ? AND promoter_kind = 'regular'
      RETURNING
        id,
        slug,
        name,
        pass_limit,
        reset_days,
        passes_used,
        MAX(pass_limit - passes_used, 0) AS passes_remaining,
        last_reset_at,
        login_username
    `).bind(name, passLimit, resetDays, passLimit, id).first();

    if (!updated) {
      return failure("PROMOTER_NOT_FOUND", "Promoter not found.", 404);
    }

    return success({ promoter: updated });
  } catch (error) {
    console.error("promoters POST failed", error);
    return failure("DATABASE_ERROR", "Unable to save promoter settings.", 500);
  }
};
