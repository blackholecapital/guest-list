import { failure, success, type Env } from "../lib/api";
import { reportingWindow, sqlDateWindow } from "../lib/reporting";

const TAMPA_BAY_BOUNDS = {
  south: 27.45,
  west: -83.05,
  north: 28.65,
  east: -81.85,
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const reporting = await reportingWindow(request, env);
    const guestWindow = sqlDateWindow("COALESCE(g.event_date, substr(g.created_at, 1, 10))", reporting);
    const rows = await env.DB.prepare(`
      SELECT
        g.id,
        g.submitted_latitude AS latitude,
        g.submitted_longitude AS longitude,
        g.created_at,
        g.status,
        p.name AS promoter_name,
        p.slug AS promoter_slug,
        'guest' AS location_source
      FROM guests g
      JOIN promoters p ON p.id = g.promoter_id
      WHERE g.submitted_latitude IS NOT NULL
        AND g.submitted_longitude IS NOT NULL
        AND g.location_exception = 0
        AND g.customer_location_status = 'captured'
        ${guestWindow.clause}
      UNION ALL
      SELECT
        g.id,
        a.latitude,
        a.longitude,
        g.created_at,
        g.status,
        p.name AS promoter_name,
        p.slug AS promoter_slug,
        'promoter_qr_fallback' AS location_source
      FROM guests g
      JOIN promoters p ON p.id = g.promoter_id
      JOIN qr_codes q ON q.token = g.qr_token
      JOIN promoter_qr_generation_attempts a ON a.qr_code_id = q.id
      WHERE g.location_exception = 1
        AND a.outcome = 'generated'
        AND a.latitude IS NOT NULL
        AND a.longitude IS NOT NULL
        ${guestWindow.clause}
      ORDER BY 4 DESC
      LIMIT 5000
    `).bind(...guestWindow.values, ...guestWindow.values).all<any>();

    const points = (rows.results ?? []).map((row) => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      const onMap =
        latitude >= TAMPA_BAY_BOUNDS.south &&
        latitude <= TAMPA_BAY_BOUNDS.north &&
        longitude >= TAMPA_BAY_BOUNDS.west &&
        longitude <= TAMPA_BAY_BOUNDS.east;

      return {
        id: Number(row.id),
        latitude,
        longitude,
        onMap,
        promoterName: String(row.promoter_name ?? "Promoter"),
        promoterSlug: String(row.promoter_slug ?? "promoter"),
        status: String(row.status ?? "registered"),
        registeredAt: String(row.created_at),
        locationSource: String(row.location_source ?? "guest"),
      };
    });

    const offMapByPromoter = new Map<string, { name: string; slug: string; count: number }>();
    for (const point of points) {
      if (point.onMap) continue;
      const current = offMapByPromoter.get(point.promoterSlug);
      if (current) current.count += 1;
      else offMapByPromoter.set(point.promoterSlug, {
        name: point.promoterName,
        slug: point.promoterSlug,
        count: 1,
      });
    }

    return success({
      bounds: TAMPA_BAY_BOUNDS,
      points,
      onMapCount: points.filter((point) => point.onMap).length,
      offMapCount: points.filter((point) => !point.onMap).length,
      offMapByPromoter: Array.from(offMapByPromoter.values()),
      reporting,
    });
  } catch (error) {
    console.error("registration-map failed", error);
    return failure("DATABASE_ERROR", "Registration map data could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "GET") {
    return failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
  }
  return onRequestGet(context);
};
