import { failure, normalizePhone, phoneNumbersMatch, readJson, success, type Env } from "../lib/api";

function eventDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const promoterSlug = typeof body?.promoterSlug === "string"
    ? body.promoterSlug.trim().toLowerCase()
    : "";
  const qrToken = typeof body?.qrToken === "string" ? body.qrToken.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : "";
  const smsOptIn = body?.smsOptIn === true;

  if (!promoterSlug || name.length < 2 || phone.length < 10) {
    return failure("VALIDATION_ERROR", "Enter a valid name and phone number.", 400);
  }

  try {
    const promoter = await env.DB.prepare(`
      SELECT
        p.id,
        p.venue_id,
        p.name,
        p.slug,
        p.active,
        v.name AS venue_name,
        v.location_assistance_enabled
      FROM promoters p
      JOIN venues v ON v.id = p.venue_id
      WHERE p.slug = ? AND v.slug = 'scores-tampa'
      LIMIT 1
    `).bind(promoterSlug).first<any>();

    if (!promoter || promoter.active !== 1) {
      return failure("PROMOTER_NOT_FOUND", "This promoter link is not active.", 404);
    }

    if (promoter.location_assistance_enabled !== 1) {
      return failure(
        "LOCATION_HELP_DISABLED",
        "Location assistance is currently turned off.",
        403,
      );
    }

    const demo = await env.DB.prepare(`
      SELECT test_phone, bypass_duplicates
      FROM demo_settings
      WHERE id = 1
    `).first<{ test_phone: string | null; bypass_duplicates: number }>();

    const testPhone = String(demo?.test_phone ?? "");
    const isTester = phoneNumbersMatch(phone, testPhone);
    const duplicateProtectionDisabled = demo?.bypass_duplicates === 1;

    if (qrToken) {
      const qr = await env.DB.prepare(`
        SELECT q.id, q.expires_at, q.deleted_at
        FROM qr_codes q
        WHERE q.token = ? AND q.promoter_id = ?
        LIMIT 1
      `).bind(qrToken, promoter.id).first<any>();

      if (!qr || qr.deleted_at) {
        return failure("INVALID_QR", "This guest-list pass is not valid.", 400);
      }
      if (qr.expires_at && new Date(qr.expires_at).getTime() <= Date.now()) {
        return failure("QR_EXPIRED", "This guest-list pass has expired.", 410);
      }
    }

    const date = eventDate();
    const existing = await env.DB.prepare(`
      SELECT id FROM guests
      WHERE venue_id = ? AND phone = ? AND event_date = ?
      LIMIT 1
    `).bind(promoter.venue_id, phone, date).first<{ id: number }>();

    if (existing && !isTester && !duplicateProtectionDisabled) {
      return failure("ALREADY_REGISTERED", "This phone number is already on tonight's list.", 409);
    }
    const confirmationCode = `LOC-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const result = await env.DB.prepare(`
      INSERT INTO guests (
        venue_id, promoter_id, name, phone, party_size,
        submitted_latitude, submitted_longitude, submitted_accuracy_meters,
        calculated_distance_meters, event_date, sms_opt_in, qr_token,
        location_exception, exception_reason, confirmation_code,
        customer_location_status
      ) VALUES (?, ?, ?, ?, 1, 0, 0, NULL, 0, ?, ?, ?, 1, ?, ?, 'location_help')
    `).bind(
      promoter.venue_id,
      promoter.id,
      name,
      phone,
      date,
      smsOptIn ? 1 : 0,
      qrToken || null,
      "Phone location services unavailable",
      confirmationCode,
    ).run();

    const confirmationText =
      `Scores Tampa location-help confirmation ${confirmationCode}. ` +
      `You are on the guest list through ${promoter.name}. Show this message at the door.`;

    if (smsOptIn && env.guest_followups) {
      try {
        await env.guest_followups.send({
          phone,
          name,
          smsOptIn: true,
          messageBody: confirmationText,
        });
      } catch (queueError) {
        console.error("location-help SMS enqueue failed", queueError);
      }
    }

    return success({
      guestId: result.meta.last_row_id,
      promoter: promoter.name,
      confirmationCode,
      confirmationText,
      smsQueued: smsOptIn,
    }, 201);
  } catch (error) {
    console.error("location-help failed", error);
    return failure("DATABASE_ERROR", "Location assistance could not add you right now.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "POST") {
    return failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
  }
  return onRequestPost(context);
};
