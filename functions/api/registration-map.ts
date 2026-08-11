import { failure, success, type Env } from "../lib/api";

const TAMPA_BAY_BOUNDS = {
  south: 27.45,
  west: -83.05,
  north: 28.65,
  east: -81.85,
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const rows = await env.DB.prepare(`
      SELECT
        g.id,
        g.submitted_latitude AS latitude,
        g.submitted_longitude AS longitude,
        g.created_at,
        g.status,
        p.name AS promoter_name,
        p.slug AS promoter_slug
      FROM guests g
      JOIN promoters p ON p.id = g.promoter_id
      WHERE g.submitted_latitude IS NOT NULL
        AND g.submitted_longitude IS NOT NULL
        AND g.location_exception = 0
      ORDER BY g.created_at DESC
      LIMIT 5000
    `).all<any>();

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
