import qrcode from "qrcode-generator";
import { failure, haversineMeters, success, type Env } from "../lib/api";

interface PromoterPassRow {
  id: number;
  pass_limit: number;
  passes_used: number;
  passes_remaining: number;
  reset_days: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json() as {
    promoterId?: number;
    expiresAt?: string;
    maxUses?: number;
    eventName?: string;
    isSpecialEvent?: boolean;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    locationStatus?: string;
  };
  const promoterId = Number(body.promoterId);
  const maxUses = body.maxUses === undefined ? 1 : Number(body.maxUses);
  const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
  const isSpecialEvent = body.isSpecialEvent === true;
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracyMeters = Number(body.accuracyMeters);
  const locationStatus = typeof body.locationStatus === "string"
    ? body.locationStatus.slice(0, 40)
    : "captured";
  const requestedExpiration = body.expiresAt
    ? new Date(body.expiresAt)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (!Number.isInteger(promoterId) || promoterId <= 0) {
    return failure("BAD_REQUEST", "Missing promoterId.", 400);
  }

  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10000) {
    return failure("BAD_REQUEST", "maxUses must be between 1 and 10,000.", 400);
  }

  if (isSpecialEvent && (eventName.length < 1 || eventName.length > 100)) {
    return failure("BAD_REQUEST", "Event names must be 1–100 characters.", 400);
  }

  const expiresAt = requestedExpiration.getTime();
  const maximumExpiration = Date.now() + 366 * 24 * 60 * 60 * 1000;

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    expiresAt > maximumExpiration
  ) {
    return failure(
      "BAD_REQUEST",
      "Choose an expiration within the next 366 days.",
      400,
    );
  }

  try {
    const promoterVenue = await env.DB.prepare(`
      SELECT
        p.id,
        v.latitude,
        v.longitude,
        v.radius_meters,
        v.geofence_enabled
      FROM promoters p
      JOIN venues v ON v.id = p.venue_id
      WHERE p.id = ? AND p.active = 1
      LIMIT 1
    `).bind(promoterId).first<any>();

    if (!promoterVenue) {
      return failure("PROMOTER_NOT_FOUND", "This promoter is not active.", 404);
    }

    let generationDistance: number | null = null;
    if (!isSpecialEvent) {
      const hasLocation =
        Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
        Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

      if (!hasLocation) {
        await env.DB.prepare(`
          INSERT INTO promoter_qr_generation_attempts (
            promoter_id, location_status, outcome
          ) VALUES (?, ?, 'location_unavailable')
        `).bind(promoterId, locationStatus).run();

        return failure(
          "PROMOTER_LOCATION_REQUIRED",
          "Location Services must be enabled before a promoter can generate a QR code. This attempt was logged.",
          403,
        );
      }

      generationDistance = haversineMeters(
        latitude,
        longitude,
        Number(promoterVenue.latitude),
        Number(promoterVenue.longitude),
      );

      if (
        Number(promoterVenue.geofence_enabled) === 1 &&
        generationDistance < Number(promoterVenue.radius_meters)
      ) {
        await env.DB.prepare(`
          INSERT INTO promoter_qr_generation_attempts (
            promoter_id, latitude, longitude, accuracy_meters,
            distance_meters, location_status, outcome
          ) VALUES (?, ?, ?, ?, ?, 'captured', 'blocked_inside_geofence')
        `).bind(
          promoterId,
          latitude,
          longitude,
          Number.isFinite(accuracyMeters) ? accuracyMeters : null,
          generationDistance,
        ).run();

        return failure(
          "PROMOTER_INSIDE_GEOFENCE",
          "QR generation is blocked near the venue. This geofence attempt was flagged for the administrator.",
          403,
        );
      }
    }

    await env.DB.prepare(`
      UPDATE promoters
      SET passes_used = 0,
          last_reset_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND (
          last_reset_at IS NULL OR
          datetime(last_reset_at, '+' || reset_days || ' days') <= CURRENT_TIMESTAMP
        )
    `).bind(promoterId).run();

    const promoter = await env.DB.prepare(`
      UPDATE promoters
      SET passes_used = passes_used + 1
      WHERE id = ?
        AND active = 1
        AND passes_used < pass_limit
      RETURNING
        id,
        pass_limit,
        passes_used,
        pass_limit - passes_used AS passes_remaining,
        reset_days
    `).bind(promoterId).first<PromoterPassRow>();

    if (!promoter) {
      return failure(
        "PASS_LIMIT_REACHED",
        "No QR passes remain. Passes reset after the configured interval.",
        409,
      );
    }

    const token = crypto.randomUUID();

    try {
      const insertResult = await env.DB.prepare(`
        INSERT INTO qr_codes (
          promoter_id, token, max_uses, expires_at, event_name, is_special_event
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        promoterId,
        token,
        maxUses,
        requestedExpiration.toISOString(),
        isSpecialEvent ? eventName : null,
        isSpecialEvent ? 1 : 0,
      ).run();

      if (!isSpecialEvent) {
        await env.DB.prepare(`
          INSERT INTO promoter_qr_generation_attempts (
            promoter_id, qr_code_id, latitude, longitude, accuracy_meters,
            distance_meters, location_status, outcome
          ) VALUES (?, ?, ?, ?, ?, ?, 'captured', 'generated')
        `).bind(
          promoterId,
          insertResult.meta.last_row_id,
          latitude,
          longitude,
          Number.isFinite(accuracyMeters) ? accuracyMeters : null,
          generationDistance,
        ).run();
      }
    } catch (error) {
      await env.DB.prepare(`
        UPDATE promoters
        SET passes_used = MAX(passes_used - 1, 0)
        WHERE id = ?
      `).bind(promoterId).run();
      throw error;
    }

    const url = `${new URL(request.url).origin}/join/${token}`;
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();

    return success({
      url,
      qrCode: qr.createDataURL(8, 16),
      passesRemaining: promoter.passes_remaining,
      passLimit: promoter.pass_limit,
      resetsInHours: promoter.reset_days * 24,
      expiresAt: requestedExpiration.toISOString(),
      maxUses,
      eventName: isSpecialEvent ? eventName : null,
    });
  } catch (error) {
    console.error("generate-qr failed", error);
    return failure("DATABASE_ERROR", "The QR code could not be generated.", 500);
  }
};
