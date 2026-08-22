import { failure, success, type Env } from "../lib/api";

const fallbackImages = [
  "/assets/executive-package.png",
  "/assets/dinner-package.png",
  "/assets/birthday-package.png",
  "/assets/executive-package.png",
];

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const promoterSlug = new URL(request.url).searchParams.get("promoterSlug")?.trim().toLowerCase() ?? "";
  try {
    const venue = await env.DB.prepare(`
      SELECT id, name, vip_services_enabled
      FROM venues
      WHERE slug = 'scores-tampa'
      LIMIT 1
    `).first<any>();
    if (!venue) return failure("VENUE_NOT_FOUND", "The venue is not configured.", 404);

    const promoter = promoterSlug
      ? await env.DB.prepare(`
          SELECT id, slug, name
          FROM promoters
          WHERE venue_id = ? AND slug = ? AND active = 1 AND promoter_kind = 'regular'
          LIMIT 1
        `).bind(venue.id, promoterSlug).first<any>()
      : null;
    if (promoterSlug && !promoter) {
      return failure("PROMOTER_NOT_FOUND", "This VIP promoter link is unavailable.", 404);
    }

    const rows = await env.DB.prepare(`
      SELECT id, slot, name, description, regular_price_cents, discount_percent,
        active, image_key, updated_at
      FROM vip_services
      WHERE venue_id = ? AND active = 1
      ORDER BY slot
    `).bind(venue.id).all<any>();

    return success({
      enabled: Number(venue.vip_services_enabled) === 1,
      venueName: String(venue.name),
      promoter: promoter ? {
        id: Number(promoter.id),
        slug: String(promoter.slug),
        name: String(promoter.name),
      } : null,
      services: (rows.results ?? []).map((row: any) => ({
        id: Number(row.id),
        slot: Number(row.slot),
        name: String(row.name),
        description: String(row.description ?? ""),
        regularPriceCents: Number(row.regular_price_cents ?? 0),
        discountPercent: Number(row.discount_percent ?? 0),
        quotedPriceCents: Math.round(Number(row.regular_price_cents ?? 0) * (100 - Number(row.discount_percent ?? 0)) / 100),
        imageUrl: row.image_key
          ? `/api/vip-service-image?id=${Number(row.id)}&v=${encodeURIComponent(String(row.updated_at))}`
          : fallbackImages[Math.max(0, Math.min(3, Number(row.slot) - 1))],
      })),
    });
  } catch (error) {
    console.error("vip services failed", error);
    return failure("DATABASE_ERROR", "VIP services could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context =>
  context.request.method === "GET"
    ? onRequestGet(context)
    : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
