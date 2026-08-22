import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

const fallbackImages = [
  "/assets/executive-package.png",
  "/assets/dinner-package.png",
  "/assets/birthday-package.png",
  "/assets/executive-package.png",
];

async function requireAdmin(request: Request, env: Env) {
  return hasAdminSession(request, env.DB);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }
  try {
    const venue = await env.DB.prepare(`
      SELECT id, vip_services_enabled FROM venues WHERE slug = 'scores-tampa' LIMIT 1
    `).first<any>();
    if (!venue) return failure("VENUE_NOT_FOUND", "The venue is not configured.", 404);

    const [services, summary, serviceStats, promoterStats, recent] = await Promise.all([
      env.DB.prepare(`
        SELECT id, slot, name, description, regular_price_cents, discount_percent,
          active, image_key, updated_at
        FROM vip_services WHERE venue_id = ? ORDER BY slot
      `).bind(venue.id).all<any>(),
      env.DB.prepare(`
        SELECT COUNT(*) AS registrations,
          COALESCE(SUM(party_size), 0) AS total_guests,
          COALESCE(SUM(quoted_price_cents), 0) AS quoted_value_cents,
          COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
        FROM vip_registrations r
        JOIN guests g ON g.id = r.guest_id
        WHERE r.venue_id = ?
      `).bind(venue.id).first<any>(),
      env.DB.prepare(`
        SELECT s.id, s.slot, s.name, COUNT(r.id) AS registrations,
          COALESCE(SUM(r.party_size), 0) AS total_guests,
          COALESCE(SUM(r.quoted_price_cents), 0) AS quoted_value_cents,
          COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
        FROM vip_services s
        LEFT JOIN vip_registrations r ON r.service_id = s.id
        LEFT JOIN guests g ON g.id = r.guest_id
        WHERE s.venue_id = ?
        GROUP BY s.id, s.slot, s.name
        ORDER BY s.slot
      `).bind(venue.id).all<any>(),
      env.DB.prepare(`
        SELECT p.id, p.slug, p.name, COUNT(r.id) AS registrations,
          COALESCE(SUM(r.party_size), 0) AS total_guests,
          COALESCE(SUM(r.quoted_price_cents), 0) AS quoted_value_cents,
          COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
        FROM promoters p
        LEFT JOIN vip_registrations r ON r.promoter_id = p.id
        LEFT JOIN guests g ON g.id = r.guest_id
        WHERE p.venue_id = ? AND p.promoter_kind = 'regular'
        GROUP BY p.id, p.slug, p.name
        ORDER BY registrations DESC, p.id
      `).bind(venue.id).all<any>(),
      env.DB.prepare(`
        SELECT r.id, r.name, r.phone, r.party_size, r.service_name,
          r.discount_percent, r.quoted_price_cents, r.created_at,
          p.name AS promoter_name, p.slug AS promoter_slug, g.status
        FROM vip_registrations r
        JOIN promoters p ON p.id = r.promoter_id
        JOIN guests g ON g.id = r.guest_id
        WHERE r.venue_id = ?
        ORDER BY r.created_at DESC
        LIMIT 100
      `).bind(venue.id).all<any>(),
    ]);

    const mapStat = (row: any) => ({
      ...row,
      registrations: Number(row.registrations ?? 0),
      totalGuests: Number(row.total_guests ?? 0),
      checkedIn: Number(row.checked_in ?? 0),
      quotedValueCents: Number(row.quoted_value_cents ?? 0),
    });

    return success({
      enabled: Number(venue.vip_services_enabled) === 1,
      services: (services.results ?? []).map((row: any) => ({
        id: Number(row.id),
        slot: Number(row.slot),
        name: String(row.name),
        description: String(row.description ?? ""),
        regularPriceCents: Number(row.regular_price_cents ?? 0),
        discountPercent: Number(row.discount_percent ?? 0),
        active: Number(row.active) === 1,
        imageUrl: row.image_key
          ? `/api/vip-service-image?id=${Number(row.id)}&v=${encodeURIComponent(String(row.updated_at))}`
          : fallbackImages[Math.max(0, Math.min(3, Number(row.slot) - 1))],
      })),
      summary: mapStat(summary ?? {}),
      serviceStats: (serviceStats.results ?? []).map(mapStat),
      promoterStats: (promoterStats.results ?? []).map(mapStat),
      recent: (recent.results ?? []).map((row: any) => ({
        id: Number(row.id), name: String(row.name), phone: String(row.phone),
        partySize: Number(row.party_size), serviceName: String(row.service_name),
        discountPercent: Number(row.discount_percent), quotedPriceCents: Number(row.quoted_price_cents),
        promoterName: String(row.promoter_name), promoterSlug: String(row.promoter_slug),
        status: String(row.status), createdAt: String(row.created_at),
      })),
    });
  } catch (error) {
    console.error("vip admin load failed", error);
    return failure("DATABASE_ERROR", "VIP service settings could not be loaded.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }
  const body = await readJson(request);
  const enabled = body?.enabled === true;
  const services = Array.isArray(body?.services) ? body.services : [];
  if (services.length !== 4) return failure("VALIDATION_ERROR", "All four VIP offer slots are required.", 400);

  const normalized = services.map((item: any) => ({
    id: Number(item?.id),
    name: typeof item?.name === "string" ? item.name.trim() : "",
    description: typeof item?.description === "string" ? item.description.trim() : "",
    regularPriceCents: Math.round(Number(item?.regularPrice) * 100),
    discountPercent: Number(item?.discountPercent),
    active: item?.active === true,
  }));
  if (normalized.some(item =>
    !Number.isInteger(item.id) || item.id < 1 || item.name.length < 2 || item.name.length > 80 ||
    item.description.length > 500 || !Number.isInteger(item.regularPriceCents) || item.regularPriceCents < 0 || item.regularPriceCents > 10000000 ||
    ![0, 10, 20, 30, 40, 50].includes(item.discountPercent)
  )) return failure("VALIDATION_ERROR", "Check each offer name, description, price, and discount.", 400);

  try {
    const venue = await env.DB.prepare(`SELECT id FROM venues WHERE slug = 'scores-tampa' LIMIT 1`).first<any>();
    if (!venue) return failure("VENUE_NOT_FOUND", "The venue is not configured.", 404);
    const statements = [
      env.DB.prepare(`UPDATE venues SET vip_services_enabled = ? WHERE id = ?`).bind(enabled ? 1 : 0, venue.id),
      ...normalized.map(item => env.DB.prepare(`
        UPDATE vip_services
        SET name = ?, description = ?, regular_price_cents = ?, discount_percent = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND venue_id = ?
      `).bind(item.name, item.description, item.regularPriceCents, item.discountPercent, item.active ? 1 : 0, item.id, venue.id)),
    ];
    const results = await env.DB.batch(statements);
    if (results.slice(1).some(result => Number(result.meta.changes ?? 0) !== 1)) {
      throw new Error("D1 did not confirm all four VIP service updates");
    }
    return success({ saved: true, enabled });
  } catch (error) {
    console.error("vip admin save failed", error);
    return failure("VIP_SAVE_FAILED", "VIP service settings could not be saved.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return failure("METHOD_NOT_ALLOWED", "Use GET or POST for this endpoint.", 405);
};
