import { failure, success, type Env } from "../lib/api";

interface SummaryRow {
  total_registrations: number;
  total_party_size: number;
  checked_in: number;
  not_checked_in: number;
}

interface PromoterRow {
  promoter_id: number;
  promoter_name: string;
  promoter_slug: string;
  registrations: number;
  total_party_size: number;
  checked_in: number;
  not_checked_in: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const summary = await env.DB
      .prepare(`
        SELECT
          COUNT(g.id) AS total_registrations,
          COALESCE(SUM(g.party_size), 0) AS total_party_size,
          COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in,
          COALESCE(SUM(CASE WHEN g.status != 'checked_in' THEN 1 ELSE 0 END), 0) AS not_checked_in
        FROM guests g
        JOIN venues v ON v.id = g.venue_id
        WHERE v.slug = 'scores-tampa'
      `)
      .first<SummaryRow>();

    const promoters = await env.DB
      .prepare(`
        SELECT
          p.id AS promoter_id,
          p.name AS promoter_name,
          p.slug AS promoter_slug,
          COUNT(g.id) AS registrations,
          COALESCE(SUM(g.party_size), 0) AS total_party_size,
          COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in,
          COALESCE(SUM(CASE WHEN g.status != 'checked_in' THEN 1 ELSE 0 END), 0) AS not_checked_in
        FROM promoters p
        JOIN venues v ON v.id = p.venue_id
        LEFT JOIN guests g ON g.promoter_id = p.id
        WHERE v.slug = 'scores-tampa'
        GROUP BY p.id, p.name, p.slug
        ORDER BY registrations DESC, p.name ASC
      `)
      .all<PromoterRow>();

    const totalRegistrations = summary?.total_registrations ?? 0;
    const checkedIn = summary?.checked_in ?? 0;

    return success({
      summary: {
        totalRegistrations,
        totalPartySize: summary?.total_party_size ?? 0,
        checkedIn,
        notCheckedIn: summary?.not_checked_in ?? 0,
        conversionPercentage:
          totalRegistrations > 0
            ? Number(((checkedIn / totalRegistrations) * 100).toFixed(1))
            : 0,
      },
      promoters: (promoters.results ?? []).map((row) => ({
        promoterId: row.promoter_id,
        promoterName: row.promoter_name,
        promoterSlug: row.promoter_slug,
        registrations: row.registrations,
        totalPartySize: row.total_party_size,
        checkedIn: row.checked_in,
        notCheckedIn: row.not_checked_in,
        conversionPercentage:
          row.registrations > 0
            ? Number(((row.checked_in / row.registrations) * 100).toFixed(1))
            : 0,
      })),
    });
  } catch (error) {
    console.error("stats failed", error);
    return failure("DATABASE_ERROR", "Statistics could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "GET") {
    return failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
  }

  return onRequestGet(context);
};
