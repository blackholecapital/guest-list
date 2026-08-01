import { success, failure, type Env } from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const rows = await env.DB.prepare(`
      SELECT
        p.id,
        p.slug,
        p.name,
        p.active,
        p.pass_limit,
        p.reset_days,

        COALESCE(
          SUM(g.party_size),
          0
        ) AS passes_used,

        (
          p.pass_limit -
          COALESCE(SUM(g.party_size),0)
        ) AS passes_remaining,

        (
          SELECT COUNT(*)
          FROM qr_codes q
          WHERE q.promoter_id = p.id
        ) AS qr_generated,

        (
          SELECT COALESCE(SUM(q.used_count),0)
          FROM qr_codes q
          WHERE q.promoter_id = p.id
        ) AS qr_scanned

      FROM promoters p

      LEFT JOIN guests g
        ON g.promoter_id = p.id

      GROUP BY p.id

      ORDER BY p.id
    `)
    .all();

    return success({
      promoters: rows.results,
    });

  } catch (error) {
    console.error(error);

    return failure(
      "DATABASE_ERROR",
      "Unable to load promoters.",
      500,
    );
  }
};
