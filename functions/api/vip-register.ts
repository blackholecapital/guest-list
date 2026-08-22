import { failure, normalizePhone, success, type Env } from "../lib/api";

function eventDateNow() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try { body = await request.json(); } catch { body = null; }
  const promoterSlug = typeof body?.promoterSlug === "string" ? body.promoterSlug.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = normalizePhone(String(body?.phone ?? ""));
  const partySize = Number(body?.partySize);
  const serviceId = Number(body?.serviceId);
  const smsOptIn = body?.smsOptIn === true;
  if (!promoterSlug || name.length < 2 || name.length > 100 || phone.length < 10 || phone.length > 15 ||
      !Number.isInteger(partySize) || partySize < 1 || partySize > 20 || !Number.isInteger(serviceId) || serviceId < 1) {
    return failure("VALIDATION_ERROR", "Enter a valid name, mobile number, party size, and VIP offer.", 400);
  }

  try {
    const row = await env.DB.prepare(`
      SELECT v.id AS venue_id, v.name AS venue_name, v.vip_services_enabled,
        v.latitude, v.longitude,
        p.id AS promoter_id, p.name AS promoter_name, p.slug AS promoter_slug,
        s.id AS service_id, s.name AS service_name, s.regular_price_cents,
        s.discount_percent, s.active
      FROM venues v
      JOIN promoters p ON p.venue_id = v.id
      JOIN vip_services s ON s.venue_id = v.id
      WHERE v.slug = 'scores-tampa' AND p.slug = ? AND p.active = 1
        AND p.promoter_kind = 'regular' AND s.id = ?
      LIMIT 1
    `).bind(promoterSlug, serviceId).first<any>();
    if (!row) return failure("VIP_LINK_UNAVAILABLE", "This VIP link or offer is unavailable.", 404);
    if (Number(row.vip_services_enabled) !== 1 || Number(row.active) !== 1) {
      return failure("VIP_DISABLED", "This VIP offer is not active right now.", 403);
    }

    const eventDate = eventDateNow();
    const quotedPriceCents = Math.round(Number(row.regular_price_cents) * (100 - Number(row.discount_percent)) / 100);
    const existing = await env.DB.prepare(`
      SELECT id FROM guests WHERE venue_id = ? AND phone = ? AND event_date = ? LIMIT 1
    `).bind(row.venue_id, phone, eventDate).first<any>();

    let guestId = Number(existing?.id ?? 0);
    let createdGuest = false;
    if (!guestId) {
      const inserted = await env.DB.prepare(`
        INSERT INTO guests (
          venue_id, promoter_id, name, phone, party_size,
          submitted_latitude, submitted_longitude, calculated_distance_meters,
          customer_location_status, event_date, sms_opt_in,
          vip_service_id, vip_service_name, vip_regular_price_cents,
          vip_discount_percent, vip_quoted_price_cents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, -1, 'vip_service', ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        row.venue_id, row.promoter_id, name, phone, partySize,
        Number(row.latitude), Number(row.longitude), eventDate, smsOptIn ? 1 : 0,
        row.service_id, row.service_name, row.regular_price_cents,
        row.discount_percent, quotedPriceCents,
      ).run();
      guestId = Number(inserted.meta.last_row_id);
      createdGuest = true;
    }

    try {
      await env.DB.batch([
        env.DB.prepare(`
          UPDATE guests SET promoter_id = ?, name = ?, party_size = ?, sms_opt_in = ?,
            vip_service_id = ?, vip_service_name = ?, vip_regular_price_cents = ?,
            vip_discount_percent = ?, vip_quoted_price_cents = ?
          WHERE id = ?
        `).bind(
          row.promoter_id, name, partySize, smsOptIn ? 1 : 0,
          row.service_id, row.service_name, row.regular_price_cents,
          row.discount_percent, quotedPriceCents, guestId,
        ),
        env.DB.prepare(`
          INSERT INTO vip_registrations (
            venue_id, promoter_id, service_id, guest_id, event_date, name, phone,
            party_size, service_name, regular_price_cents, discount_percent,
            quoted_price_cents, sms_opt_in
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(venue_id, phone, event_date) DO UPDATE SET
            promoter_id = excluded.promoter_id, service_id = excluded.service_id,
            guest_id = excluded.guest_id, name = excluded.name,
            party_size = excluded.party_size, service_name = excluded.service_name,
            regular_price_cents = excluded.regular_price_cents,
            discount_percent = excluded.discount_percent,
            quoted_price_cents = excluded.quoted_price_cents,
            sms_opt_in = excluded.sms_opt_in, updated_at = CURRENT_TIMESTAMP
        `).bind(
          row.venue_id, row.promoter_id, row.service_id, guestId, eventDate, name, phone,
          partySize, row.service_name, row.regular_price_cents, row.discount_percent,
          quotedPriceCents, smsOptIn ? 1 : 0,
        ),
      ]);
    } catch (error) {
      if (createdGuest) await env.DB.prepare(`DELETE FROM guests WHERE id = ?`).bind(guestId).run();
      throw error;
    }

    let smsQueued = false;
    if (smsOptIn && env.guest_followups) {
      const price = quotedPriceCents > 0 ? ` ($${(quotedPriceCents / 100).toFixed(2)})` : "";
      const discount = Number(row.discount_percent) > 0 ? `, ${Number(row.discount_percent)}% off` : "";
      try {
        await env.guest_followups.send({
          phone, name, smsOptIn: true,
          messageBody: `VIP request confirmed at Scores Tampa through ${row.promoter_name}: ${row.service_name}${discount}${price}. Your party of ${partySize} is on the guest list with free cover. Show this text at the door. Reply STOP to opt out.`,
        });
        smsQueued = true;
      } catch (queueError) {
        console.error("vip registration SMS enqueue failed", queueError);
      }
    }

    return success({
      guestId, upgradedExistingGuest: !createdGuest, smsQueued,
      service: { name: String(row.service_name), discountPercent: Number(row.discount_percent), quotedPriceCents },
      promoter: { name: String(row.promoter_name), slug: String(row.promoter_slug) },
      partySize,
    }, createdGuest ? 201 : 200);
  } catch (error) {
    console.error("vip registration failed", error);
    return failure("VIP_REGISTRATION_FAILED", "Your VIP request could not be completed. Please try again.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context =>
  context.request.method === "POST"
    ? onRequestPost(context)
    : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
