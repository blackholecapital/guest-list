import {
  failure,
  haversineMeters,
  normalizePhone,
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

interface CheckInBody {
  promoterSlug: string;
  name: string;
  phone: string;
  partySize: number;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  smsOptIn?: boolean;
  qrToken?: string;
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
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);

  const accuracyMeters =
    input.accuracyMeters === undefined
      ? undefined
      : Number(input.accuracyMeters);

  const smsOptIn = Boolean(input.smsOptIn);
  const qrToken =
    typeof input.qrToken === "string"
      ? input.qrToken
      : undefined;

  if (
    !promoterSlug ||
    name.length < 2 ||
    phone.length < 10 ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    partySize > 20 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    (
      accuracyMeters !== undefined &&
      (
        !Number.isFinite(accuracyMeters) ||
        accuracyMeters < 0
      )
    )
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
    smsOptIn,
    qrToken,
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
      "Please provide a valid name, phone number, party size, promoter, and location.",
      400,
    );
  }

  try {
    const demo = await env.DB.prepare(`
      SELECT *
      FROM demo_settings
      WHERE id=1
    `).first<any>();

    const isTester =
      demo &&
      body.phone === normalizePhone(String(demo.test_phone ?? ""));

    if (body.qrToken) {
      const qr = await env.DB
        .prepare(`
          SELECT id, used_at
          FROM qr_codes
          WHERE token = ?
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

      if (qr.used_at && !(isTester && demo?.unlimited_joins)) {
        return failure(
          "USED_QR",
          "QR code already used.",
          409,
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

    const venue = await env.DB
      .prepare(`
        SELECT
          id,
          slug,
          name,
          address,
          latitude,
          longitude,
          radius_meters
        FROM venues
        WHERE id = ?
        LIMIT 1
      `)
      .bind(promoter.venue_id)
      .first<VenueRow>();

    if (!venue) {
      return failure(
        "DATABASE_ERROR",
        "Venue configuration could not be loaded.",
        500,
      );
    }

    const distanceMeters = haversineMeters(
      body.latitude,
      body.longitude,
      venue.latitude,
      venue.longitude,
    );

    if (distanceMeters < venue.radius_meters) {
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
      !(isTester && demo?.bypass_duplicates)
    ) {
      return failure(
        "ALREADY_REGISTERED",
        "This phone number is already on tonight's guest list.",
        409,
      );
    }

    if (existingGuest && isTester && demo?.bypass_duplicates) {
      await env.DB.prepare(`
        DELETE FROM guests
        WHERE id = ?
      `).bind(existingGuest.id).run();
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
          event_date,
          sms_opt_in,
          qr_token
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        venue.id,
        promoter.id,
        body.name,
        body.phone,
        body.partySize,
        body.latitude,
        body.longitude,
        body.accuracyMeters ?? null,
        distanceMeters,
        eventDate,
        body.smsOptIn ? 1 : 0,
        body.qrToken ?? null,
      )
      .run();

    if (
      (body.smsOptIn || SMS_TESTERS.has(body.phone)) &&
      env.guest_followups
    ) {
      try {
        await env.guest_followups.send({
          phone: body.phone,
          name: body.name,
          smsOptIn: true,
        });
      } catch (queueError) {
        console.error("SMS follow-up enqueue failed", queueError);
      }
    }

    return success({
      guestId: result.meta.last_row_id,
      venue: venue.name,
      promoter: promoter.name,
      distanceMeters: Math.round(distanceMeters),
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
