import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure(
      "ADMIN_SESSION_REQUIRED",
      "Your Admin session expired. Log out and sign in again.",
      401,
    );
  }

  const body = await readJson(request);
  if (!body || typeof body.enabled !== "boolean") {
    return failure("VALIDATION_ERROR", "Choose whether customer geofencing is enabled.", 400);
  }

  try {
    const result = await env.DB.prepare(`
      UPDATE venues
      SET customer_geofence_enabled = ?
      WHERE slug = 'scores-tampa'
      RETURNING id, customer_geofence_enabled
    `).bind(body.enabled ? 1 : 0).first<{
      id: number;
      customer_geofence_enabled: number;
    }>();

    if (!result) {
      return failure("VENUE_NOT_FOUND", "Venue configuration does not exist.", 404);
    }

    return success({
      venueId: Number(result.id),
      customerGeofenceEnabled: Number(result.customer_geofence_enabled) === 1,
    });
  } catch (error) {
    console.error("customer geofence update failed", error);
    return failure(
      "DATABASE_ERROR",
      "Customer geofence protection could not be updated. Apply the latest D1 migration and try again.",
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async context =>
  context.request.method === "POST"
    ? onRequestPost(context)
    : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);

