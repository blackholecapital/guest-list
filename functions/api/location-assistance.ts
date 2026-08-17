import { failure, readJson, success, type Env } from "../lib/api";
import { hasAdminSession } from "../lib/admin-session";

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
    return failure(
      "VALIDATION_ERROR",
      "Choose whether Location Assistance is on or off.",
      400,
    );
  }

  try {
    const result = await env.DB.prepare(`
      UPDATE venues
      SET location_assistance_enabled = ?
      WHERE slug = 'scores-tampa'
    `).bind(body.enabled ? 1 : 0).run();

    if (result.meta.changes !== 1) {
      return failure(
        "VENUE_NOT_FOUND",
        "Venue configuration does not exist.",
        404,
      );
    }

    return success({
      enabled: body.enabled,
      saved: true,
    });
  } catch (error) {
    console.error("location-assistance POST failed", error);
    return failure(
      "DATABASE_ERROR",
      "Location Assistance could not be updated.",
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "POST") {
    return failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
  }

  return onRequestPost(context);
};
