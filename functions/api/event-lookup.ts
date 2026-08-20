import { failure, success, type Env } from "../lib/api";

type EventLookupRow = {
  event_id: number;
  event_name: string;
  expires_at: string;
  promoter_id: number;
  promoter_slug: string;
  promoter_name: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const eventId = Number(url.searchParams.get("eventId"));
  const promoterSlug = (url.searchParams.get("promoterSlug") ?? "").trim().toLowerCase();
  if (!Number.isInteger(eventId) || eventId <= 0 || !promoterSlug) {
    return failure("BAD_REQUEST", "This event link is incomplete.", 400);
  }

  try {
    const row = await env.DB.prepare(`
      SELECT
        e.id AS event_id,
        e.name AS event_name,
        e.expires_at,
        p.id AS promoter_id,
        p.slug AS promoter_slug,
        a.display_name AS promoter_name
      FROM special_events e
      JOIN special_event_assignments a ON a.event_id = e.id
      JOIN promoters p ON p.id = a.promoter_id
      WHERE e.id = ?
        AND p.slug = ?
        AND e.deleted_at IS NULL
        AND e.expires_at > CURRENT_TIMESTAMP
        AND p.active = 1
      LIMIT 1
    `).bind(eventId, promoterSlug).first<EventLookupRow>();

    if (!row) return failure("EVENT_UNAVAILABLE", "This event link is no longer active.", 404);

    await env.DB.prepare(`
      INSERT INTO special_event_scans (event_id, promoter_id)
      VALUES (?, ?)
    `).bind(row.event_id, row.promoter_id).run();

    return success({
      eventId: Number(row.event_id),
      eventName: String(row.event_name),
      expiresAt: String(row.expires_at),
      promoterId: Number(row.promoter_id),
      promoterSlug: String(row.promoter_slug),
      promoterName: String(row.promoter_name),
    });
  } catch (error) {
    console.error("event lookup failed", error);
    return failure("DATABASE_ERROR", "This event link could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context =>
  context.request.method === "GET"
    ? onRequestGet(context)
    : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
