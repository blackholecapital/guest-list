import { failure, success, type Env } from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return failure("BAD_REQUEST", "Missing token.", 400);
  }

  const qr = await env.DB.prepare(`
    SELECT
      q.id,
      q.token,
      q.used_at,
      q.expires_at,
      p.id AS promoter_id,
      p.slug AS promoter_slug,
      p.name AS promoter_name
    FROM qr_codes q
    JOIN promoters p
      ON p.id = q.promoter_id
    WHERE q.token = ?
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

  if (qr.used_at) {
    return failure(
      "USED_QR",
      "QR code already used.",
      409,
    );
  }

  return success({
    token: qr.token,
    promoterId: qr.promoter_id,
    promoterSlug: qr.promoter_slug,
    promoterName: qr.promoter_name,
  });
};
