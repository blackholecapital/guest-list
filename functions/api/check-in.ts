import {
  failure,
  haversineMeters,
  normalizePhone,
  phoneNumbersMatch,
  readJson,
  success,
  type Env,
  type VenueRow,
} from "../lib/api";

interface PromoterRow {
  id: number;
  venue_id: number;
  slug: string;
  name: string;
  active: number;
}

interface DemoSettingsRow {
  test_phone: string | null;
  bypass_duplicates: number;
  always_send_sms: number;
}

interface CheckInBody {
  promoterSlug: string;
  name: string;
  phone: string;
  partySize: number;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  locationStatus: "captured" | "not_required";
  smsOptIn?: boolean;
  qrToken?: string;
  specialEventId?: number;
}

function parseBody(
  input: Record<string, unknown>,
): CheckInBody | null {
  const promoterSlug =
    typeof input.promoterSlug === "string"
      ? input.promoterSlug.trim().toLowerCase()
      : "";

  const name =
    typeof input.name === "string"
      ? input.name.trim()
      : "";

  const phone =
    typeof input.phone === "string"
      ? normalizePhone(input.phone)
      : "";

  const partySize = Number(input.partySize);
  const hasLatitude = typeof input.latitude === "number";
  const hasLongitude = typeof input.longitude === "number";
  const latitude = hasLatitude ? Number(input.latitude) : undefined;
  const longitude = hasLongitude ? Number(input.longitude) : undefined;

  const accuracyMeters =
    input.accuracyMeters === undefined
      ? undefined
      : Number(input.accuracyMeters);

  const smsOptIn = Boolean(input.smsOptIn);
  const qrToken =
    typeof input.qrToken === "string"
      ? input.qrToken
      : undefined;
  const specialEventId = input.specialEventId === undefined
    ? undefined
    : Number(input.specialEventId);

  if (
    !promoterSlug ||
    name.length < 2 ||
    phone.length < 10 ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    partySize > 20 ||
    hasLatitude !== hasLongitude ||
    (latitude !== undefined && (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    )) ||
    (longitude !== undefined && (
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    )) ||
    (
      accuracyMeters !== undefined &&
      (
        !Number.isFinite(accuracyMeters) ||
        accuracyMeters < 0
      )
    ) ||
    (specialEventId !== undefined && (!Number.isInteger(specialEventId) || specialEventId <= 0))
  ) {
    return null;
  }

  return {
    promoterSlug,
    name,
    phone,
    partySize,
    latitude,
    longitude,
    accuracyMeters,
    locationStatus: latitude === undefined ? "not_required" : "captured",
    smsOptIn,
    qrToken,
    specialEventId,
  };
}

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  const rawBody = await readJson(request);

  if (!rawBody) {
    return failure(
      "VALIDATION_ERROR",
      "A valid JSON request body is required.",
      400,
    );
  }

  const body = parseBody(rawBody);

  if (!body) {
    return failure(
      "VALIDATION_ERROR",
      "Please provide a valid name, phone number, party size, and promoter.",
      400,
    );
  }

  try {
    const demo = await env.DB.prepare(`
      SELECT test_phone, bypass_duplicates, always_send_sms
      FROM demo_settings
      WHERE id=1
    `).first<DemoSettingsRow>();

    const testPhone = String(demo?.test_phone ?? "");
    const isTester = phoneNumbersMatch(body.phone, testPhone);
    const duplicateProtectionDisabled = demo?.bypass_duplicates === 1;

    if (body.qrToken) {
      const qr = await env.DB
        .prepare(`
          SELECT id, expires_at
          FROM qr_codes
          WHERE token = ?
            AND deleted_at IS NULL
        `)
        .bind(body.qrToken)
        .first<any>();

      if (!qr) {
        return failure(
          "INVALID_QR",
          "QR code is invalid.",
          400,
        );
      }

      if (
        qr.expires_at &&
        new Date(qr.expires_at).getTime() <= Date.now()
      ) {
        return failure(
          "QR_EXPIRED",
          "This pass has expired.",
          410,
        );
      }
    }

    const promoter = await env.DB
      .prepare(`
        SELECT
          p.id,
          p.venue_id,
          p.slug,
          p.name,
          p.active
        FROM promoters p
        JOIN venues v ON v.id = p.venue_id
        WHERE p.slug = ?
          AND v.slug = 'scores-tampa'
        LIMIT 1
      `)
      .bind(body.promoterSlug)
      .first<PromoterRow>();

    if (!promoter) {
      return failure(
        "PROMOTER_NOT_FOUND",
        "This promoter link is not valid.",
        404,
      );
    }

    if (promoter.active !== 1) {
      return failure(
        "PROMOTER_INACTIVE",
        "This promoter link is currently inactive.",
        403,
      );
    }

    if (body.specialEventId !== undefined) {
      const assignment = await env.DB.prepare(`
        SELECT a.id
        FROM special_event_assignments a
        JOIN special_events e ON e.id = a.event_id
        WHERE a.event_id = ?
          AND a.promoter_id = ?
          AND e.deleted_at IS NULL
          AND e.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `).bind(body.specialEventId, promoter.id).first<{ id: number }>();
      if (!assignment) {
        return failure("EVENT_UNAVAILABLE", "This special-event link is no longer active.", 410);
      }
    }

    const venue = await env.DB
      .prepare(`
        SELECT
          id,
          slug,
          name,
          address,
          latitude,
          longitude,
          radius_meters,
          customer_geofence_enabled
        FROM venues
        WHERE id = ?
        LIMIT 1
      `)
      .bind(promoter.venue_id)
      .first<VenueRow & { customer_geofence_enabled: number }>();

    if (!venue) {
      return failure(
        "DATABASE_ERROR",
        "Venue configuration could not be loaded.",
        500,
      );
    }

    const customerGeofenceEnabled = Number(venue.customer_geofence_enabled) === 1;
    const hasCustomerLocation = body.latitude !== undefined && body.longitude !== undefined;

    if (customerGeofenceEnabled && !hasCustomerLocation) {
      return failure(
        "CUSTOMER_LOCATION_REQUIRED",
        "Location Services must be enabled to join this guest list.",
        403,
      );
    }

    let distanceMeters: number | null = null;
    if (body.latitude !== undefined && body.longitude !== undefined) {
      distanceMeters = haversineMeters(
        body.latitude,
        body.longitude,
        venue.latitude,
        venue.longitude,
      );
    }

    if (
      customerGeofenceEnabled &&
      distanceMeters !== null &&
      distanceMeters < venue.radius_meters
    ) {
      return failure(
        "TOO_CLOSE_TO_VENUE",
        "Guest-list registration is not available at the venue.",
        403,
      );
    }

    const eventDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const existingGuest = await env.DB
      .prepare(`
        SELECT id
        FROM guests
        WHERE venue_id = ?
          AND phone = ?
          AND event_date = ?
        LIMIT 1
      `)
      .bind(
        venue.id,
        body.phone,
        eventDate,
      )
      .first<{ id: number }>();

    if (
      existingGuest &&
      !isTester &&
      !duplicateProtectionDisabled
    ) {
      return failure(
        "ALREADY_REGISTERED",
        "This phone number is already on tonight's guest list.",
        409,
      );
    }

    const result = await env.DB
      .prepare(`
        INSERT INTO guests (
          venue_id,
          promoter_id,
          name,
          phone,
          party_size,
          submitted_latitude,
          submitted_longitude,
          submitted_accuracy_meters,
          calculated_distance_meters,
          customer_location_status, event_date, special_event_id,
          sms_opt_in,
          qr_token
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        venue.id,
        promoter.id,
        body.name,
        body.phone,
        body.partySize,
        body.latitude ?? 0,
        body.longitude ?? 0,
        body.accuracyMeters ?? null,
        distanceMeters ?? -1,
        body.locationStatus,
        eventDate,
        body.specialEventId ?? null,
        body.smsOptIn ? 1 : 0,
        body.qrToken ?? null,
      )
      .run();

    if (
      (body.smsOptIn || demo?.always_send_sms) &&
      env.guest_followups
    ) {
      try {
        await env.guest_followups.send({
          phone: body.phone,
          name: body.name,
          smsOptIn: true,
          messageBody: `You're confirmed on the Scores Tampa guest list through ${promoter.name}.`,
        });
      } catch (queueError) {
        console.error("SMS follow-up enqueue failed", queueError);
      }
    }

    return success({
      guestId: result.meta.last_row_id,
      venue: venue.name,
      promoter: promoter.name,
      distanceMeters: distanceMeters === null ? null : Math.round(distanceMeters),
      customerGeofenceEnabled,
      status: "registered",
    }, 201);
  } catch (error) {
    console.error("check-in failed", error);

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (message.includes("UNIQUE constraint failed")) {
      return failure(
        "ALREADY_REGISTERED",
        "This phone number is already on tonight's guest list.",
        409,
      );
    }

    return failure(
      "DATABASE_ERROR",
      "The guest could not be added right now.",
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "POST") {
    return failure(
      "METHOD_NOT_ALLOWED",
      "Use POST for this endpoint.",
      405,
    );
  }

  return onRequestPost(context);
};
