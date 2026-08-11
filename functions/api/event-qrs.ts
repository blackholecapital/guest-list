import qrcode from "qrcode-generator";
import { failure, readJson, success, type Env } from "../lib/api";

function qrDataUrl(url: string): string {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return qr.createDataURL(8, 16);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const rows = await env.DB.prepare(`
      SELECT
        q.id,
        q.token,
        q.event_name,
        q.created_at,
        q.expires_at,
        q.max_uses,
        q.used_count AS scans,
        p.id AS promoter_id,
        p.name AS promoter_name,
        p.slug AS promoter_slug,
        COUNT(g.id) AS registrations,
        COALESCE(SUM(g.party_size), 0) AS total_guests,
        COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
      FROM qr_codes q
      JOIN promoters p ON p.id = q.promoter_id
      LEFT JOIN guests g ON g.qr_token = q.token
      WHERE q.is_special_event = 1
        AND q.deleted_at IS NULL
      GROUP BY q.id, p.id
      ORDER BY q.created_at DESC
    `).all<any>();

    const origin = new URL(request.url).origin;
    const events = (rows.results ?? []).map((row) => {
      const registrations = Number(row.registrations ?? 0);
      const scans = Number(row.scans ?? 0);
      const checkedIn = Number(row.checked_in ?? 0);
      const url = `${origin}/join/${row.token}`;

      return {
        id: Number(row.id),
        name: String(row.event_name ?? "Special Event"),
        token: String(row.token),
        url,
        qrCode: qrDataUrl(url),
        promoterId: Number(row.promoter_id),
        promoterName: String(row.promoter_name),
        promoterSlug: String(row.promoter_slug),
        createdAt: String(row.created_at),
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        maxUses: Number(row.max_uses ?? 0),
        scans,
        registrations,
        totalGuests: Number(row.total_guests ?? 0),
        checkedIn,
        awaitingCheckIn: Math.max(registrations - checkedIn, 0),
        registrationConversion: scans > 0
          ? Number(((registrations / scans) * 100).toFixed(1))
          : 0,
        checkInConversion: registrations > 0
          ? Number(((checkedIn / registrations) * 100).toFixed(1))
          : 0,
      };
    });

    return success({ events });
  } catch (error) {
    console.error("event-qrs GET failed", error);
    return failure("DATABASE_ERROR", "Special-event flyers could not be loaded.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const id = Number(body?.id);

  if (!Number.isInteger(id) || id <= 0) {
    return failure("BAD_REQUEST", "Choose a valid special-event flyer.", 400);
  }

  try {
    const deleted = await env.DB.prepare(`
      UPDATE qr_codes
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND is_special_event = 1
        AND deleted_at IS NULL
      RETURNING id
    `).bind(id).first<{ id: number }>();

    if (!deleted) {
      return failure("NOT_FOUND", "Special-event flyer not found.", 404);
    }

    return success({ id: deleted.id });
  } catch (error) {
    console.error("event-qrs DELETE failed", error);
    return failure("DATABASE_ERROR", "Special-event flyer could not be deleted.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "DELETE") return onRequestDelete(context);
  return failure("METHOD_NOT_ALLOWED", "Use GET or DELETE for this endpoint.", 405);
};
