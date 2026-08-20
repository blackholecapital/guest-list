import qrcode from "qrcode-generator";
import { failure, success, type Env } from "../lib/api";
import { getPromoterSession } from "../lib/promoter-session";

type PromoterEventRow = {
  id: number;
  name: string;
  expires_at: string;
  promoter_slug: string;
};

function qrDataUrl(url: string) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return qr.createDataURL(8, 16);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getPromoterSession(request, env.DB);
  if (!session) {
    return failure("PROMOTER_SESSION_REQUIRED", "Your promoter session expired. Sign in again.", 401);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT e.id, e.name, e.expires_at, p.slug AS promoter_slug
      FROM special_events e
      JOIN special_event_assignments a ON a.event_id = e.id
      JOIN promoters p ON p.id = a.promoter_id
      WHERE a.promoter_id = ?
        AND e.deleted_at IS NULL
        AND e.expires_at > CURRENT_TIMESTAMP
      ORDER BY e.expires_at, e.created_at DESC
    `).bind(session.promoterId).all<PromoterEventRow>();
    const origin = new URL(request.url).origin;

    return success({
      events: (result.results ?? []).map(row => {
        const url = `${origin}/event/${row.id}/${row.promoter_slug}`;
        return {
          id: Number(row.id),
          name: String(row.name),
          expiresAt: String(row.expires_at),
          url,
          qrCode: qrDataUrl(url),
        };
      }),
    });
  } catch (error) {
    console.error("promoter events failed", error);
    return failure("DATABASE_ERROR", "Assigned special events could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context =>
  context.request.method === "GET"
    ? onRequestGet(context)
    : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
