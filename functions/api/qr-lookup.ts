import { failure, success, type Env } from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return failure(
      "BAD_REQUEST",
      "Missing token.",
      400,
    );
  }

  const qr = await env.DB.prepare(`
    SELECT
      q.id,
      q.token,
      q.max_uses,
      q.used_count,
      q.expires_at,
      p.id AS promoter_id,
      p.slug AS promoter_slug,
      p.name AS promoter_name
    FROM qr_codes q
    JOIN promoters p
      ON p.id = q.promoter_id
    WHERE q.token = ?
      AND q.deleted_at IS NULL
  `)
  .bind(token)
  .first<any>();

  if (!qr) {
    return failure(
      "INVALID_QR",
      "QR code not found.",
      404,
    );
  }

  const demo = await env.DB.prepare(`
    SELECT unlimited_joins
    FROM demo_settings
    WHERE id = 1
  `).first<{ unlimited_joins: number }>();

  if (qr.expires_at && new Date(qr.expires_at).getTime() <= Date.now()) {
    return failure(
      "QR_EXPIRED",
      "This pass has expired.",
      410,
    );
  }

  if (qr.used_count >= qr.max_uses && !demo?.unlimited_joins) {
    return failure(
      "QR_LIMIT_REACHED",
      "This QR code has reached its limit.",
      409,
    );
  }

  await env.DB.prepare(`
    UPDATE qr_codes
    SET used_count = used_count + 1
    WHERE id = ?
  `)
  .bind(qr.id)
  .run();

  return success({
    token: qr.token,
    promoterId: qr.promoter_id,
    promoterSlug: qr.promoter_slug,
    promoterName: qr.promoter_name,
  });
};
