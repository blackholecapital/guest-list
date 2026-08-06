import { failure, readJson, success, type Env } from "../lib/api";

async function resetExpiredPasses(env: Env): Promise<void> {
  await env.DB.prepare(`
    UPDATE promoters
    SET pass_limit = CASE WHEN pass_limit < 1 THEN 10 ELSE pass_limit END,
        reset_days = 1
  `).run();

  await env.DB.prepare(`
    UPDATE promoters
    SET passes_used = 0,
        last_reset_at = CURRENT_TIMESTAMP
    WHERE last_reset_at IS NULL
       OR datetime(last_reset_at, '+' || reset_days || ' days') <= CURRENT_TIMESTAMP
  `).run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    await resetExpiredPasses(env);

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
        (SELECT COUNT(*) FROM qr_codes q WHERE q.promoter_id = p.id) AS qr_generated,
        (SELECT COALESCE(SUM(q.used_count), 0) FROM qr_codes q WHERE q.promoter_id = p.id) AS qr_scanned
      FROM promoters p
      ORDER BY p.id
    `).all();

    return success({ promoters: rows.results });
  } catch (error) {
    console.error("promoters GET failed", error);
    return failure("DATABASE_ERROR", "Unable to load promoters.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const id = Number(body?.id);
  const passLimit = Number(body?.passLimit);
  const resetDays = Number(body?.resetDays);

  if (
    !Number.isInteger(id) || id <= 0 ||
    !Number.isInteger(passLimit) || passLimit < 1 || passLimit > 100 ||
    resetDays !== 1
  ) {
    return failure(
      "VALIDATION_ERROR",
      "Promoters must have 1–100 passes and reset every 24 hours.",
      400,
    );
  }

  try {
    const updated = await env.DB.prepare(`
      UPDATE promoters
      SET pass_limit = ?,
          reset_days = 1,
          passes_used = MIN(passes_used, ?),
          last_reset_at = COALESCE(last_reset_at, CURRENT_TIMESTAMP)
      WHERE id = ?
      RETURNING
        id,
        slug,
        name,
        pass_limit,
        reset_days,
        passes_used,
        MAX(pass_limit - passes_used, 0) AS passes_remaining,
        last_reset_at
    `).bind(passLimit, passLimit, id).first();

    if (!updated) {
      return failure("PROMOTER_NOT_FOUND", "Promoter not found.", 404);
    }

    return success({ promoter: updated });
  } catch (error) {
    console.error("promoters POST failed", error);
    return failure("DATABASE_ERROR", "Unable to save promoter settings.", 500);
  }
};
