import { hasAdminSession } from "../lib/admin-session";
import { failure, success, type Env } from "../lib/api";

type GenerationAttemptRow = {
  id: number;
  promoter_id: number;
  promoter_name: string;
  promoter_slug: string;
  qr_code_id: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  distance_meters: number | null;
  location_status: string;
  outcome: string;
  created_at: string;
  used_count: number | null;
  max_uses: number | null;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure(
      "ADMIN_SESSION_REQUIRED",
      "Your Admin session expired. Log out and sign in again.",
      401,
    );
  }

  try {
    const [venueRow, attempts] = await Promise.all([
      env.DB.prepare(`
        SELECT latitude, longitude, radius_meters
        FROM venues
        WHERE slug = 'scores-tampa'
        LIMIT 1
      `).first<{ latitude: number; longitude: number; radius_meters: number }>(),
      env.DB.prepare(`
        SELECT
          a.id,
          a.promoter_id,
          p.name AS promoter_name,
          p.slug AS promoter_slug,
          a.qr_code_id,
          a.latitude,
          a.longitude,
          a.accuracy_meters,
          a.distance_meters,
          a.location_status,
          a.outcome,
          a.created_at,
          q.used_count,
          q.max_uses
        FROM promoter_qr_generation_attempts a
        JOIN promoters p ON p.id = a.promoter_id
        LEFT JOIN qr_codes q ON q.id = a.qr_code_id
        ORDER BY a.created_at DESC
        LIMIT 2000
      `).all<GenerationAttemptRow>(),
    ]);

    if (!venueRow) {
      return failure("VENUE_NOT_FOUND", "Venue configuration does not exist.", 404);
    }

    const rows = attempts.results ?? [];
    const mappedAttempts = rows.map(row => {
      const latitude = row.latitude === null ? null : Number(row.latitude);
      const longitude = row.longitude === null ? null : Number(row.longitude);
      const hasCoordinates =
        latitude !== null && Number.isFinite(latitude) &&
        longitude !== null && Number.isFinite(longitude);

      return {
        id: Number(row.id),
        promoterId: Number(row.promoter_id),
        promoterName: String(row.promoter_name),
        promoterSlug: String(row.promoter_slug),
        qrCodeId: row.qr_code_id === null ? null : Number(row.qr_code_id),
        latitude: hasCoordinates ? latitude : null,
        longitude: hasCoordinates ? longitude : null,
        accuracyMeters: row.accuracy_meters === null ? null : Number(row.accuracy_meters),
        distanceMeters: row.distance_meters === null ? null : Number(row.distance_meters),
        locationStatus: String(row.location_status),
        outcome: String(row.outcome),
        generated: row.outcome === "generated",
        tokenIssued: row.qr_code_id !== null,
        usedCount: row.used_count === null ? null : Number(row.used_count),
        maxUses: row.max_uses === null ? null : Number(row.max_uses),
        createdAt: String(row.created_at),
      };
    });

    return success({
      venue: {
        latitude: Number(venueRow.latitude),
        longitude: Number(venueRow.longitude),
        radiusMeters: Number(venueRow.radius_meters),
      },
      attempts: mappedAttempts,
      summary: {
        totalAttempts: mappedAttempts.length,
        generated: mappedAttempts.filter(item => item.outcome === "generated").length,
        blocked: mappedAttempts.filter(item => item.outcome === "blocked_inside_geofence").length,
        locationUnavailable: mappedAttempts.filter(item => item.outcome === "location_unavailable").length,
        passLimitReached: mappedAttempts.filter(item => item.outcome === "pass_limit_reached").length,
      },
    });
  } catch (error) {
    console.error("promoter generation map failed", error);
    return failure(
      "DATABASE_ERROR",
      "Promoter QR-generation map data could not be loaded. Apply the latest D1 migration and try again.",
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async context =>
  context.request.method === "GET"
    ? onRequestGet(context)
    : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
