import { failure, success, type Env, type VenueRow } from "../lib/api";

interface PromoterRow {
  id: number;
  slug: string;
  name: string;
  active: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const venue = await env.DB
      .prepare(`
        SELECT id, slug, name, address, latitude, longitude, radius_meters
        FROM venues
        WHERE slug = 'scores-tampa'
        LIMIT 1
      `)
      .first<VenueRow>();

    if (!venue) {
      return failure("DATABASE_ERROR", "Venue configuration could not be found.", 500);
    }

    const promoters = await env.DB
      .prepare(`
        SELECT id, slug, name, active
        FROM promoters
        WHERE venue_id = ?
        ORDER BY name ASC
      `)
      .bind(venue.id)
      .all<PromoterRow>();

    return success({
      venue: {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        radiusMeters: venue.radius_meters,
      },
      promoters: (promoters.results ?? []).map((promoter) => ({
        id: promoter.id,
        slug: promoter.slug,
        name: promoter.name,
        active: promoter.active === 1,
        qrPath: `/p/${promoter.slug}`,
      })),
    });
  } catch (error) {
    console.error("config failed", error);
    return failure("DATABASE_ERROR", "Configuration could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "GET") {
    return failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
  }

  return onRequestGet(context);
};
