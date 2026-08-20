import { failure, type Env } from "../lib/api";
import { hasAdminSession } from "../lib/admin-session";
import { reportingWindow, sqlDateWindow } from "../lib/reporting";

function csv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }

  const reporting = await reportingWindow(request, env);
  const guestWindow = sqlDateWindow("COALESCE(g.event_date, substr(g.created_at, 1, 10))", reporting);
  const result = await env.DB.prepare(`
    SELECT g.event_date, g.created_at, p.name AS promoter_name, p.slug AS promoter_slug,
      g.name AS guest_name, g.phone, g.party_size, g.status, g.checked_in_at,
      ROUND(g.calculated_distance_meters, 1) AS distance_meters,
      g.location_exception, g.confirmation_code, g.qr_token, g.special_event_id
    FROM guests g
    JOIN promoters p ON p.id = g.promoter_id
    JOIN venues v ON v.id = g.venue_id
    WHERE v.slug = 'scores-tampa'${guestWindow.clause}
    ORDER BY g.created_at DESC, g.id DESC
  `).bind(...guestWindow.values).all<any>();

  const headers = [
    "event_date", "registered_at", "promoter", "promoter_slug", "guest_name", "phone",
    "party_size", "status", "checked_in_at", "distance_meters", "location_exception",
    "confirmation_code", "qr_token", "special_event_id",
  ];
  const rows = (result.results ?? []).map(row => [
    row.event_date, row.created_at, row.promoter_name, row.promoter_slug, row.guest_name, row.phone,
    row.party_size, row.status, row.checked_in_at, row.distance_meters,
    Number(row.location_exception) === 1 ? "yes" : "no", row.confirmation_code, row.qr_token,
    row.special_event_id,
  ]);
  const content = [headers, ...rows].map(row => row.map(csv).join(",")).join("\r\n");
  const filename = `scores-guest-list-${reporting.range}-${reporting.anchorDate}.csv`;
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "GET"
  ? onRequestGet(context)
  : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
