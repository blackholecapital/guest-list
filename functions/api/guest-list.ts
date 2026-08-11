import {
  failure,
  success,
  type Env,
} from "../lib/api";

interface GuestRow {
  id: number;
  name: string;
  phone: string;
  party_size: number;
  promoter_name: string;
  promoter_slug: string;
  status: string;
  created_at: string;
  checked_in_at: string | null;
  location_exception: number;
  exception_reason: string | null;
  confirmation_code: string | null;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB
      .prepare(`
        SELECT
          g.id,
          g.name,
          g.phone,
          g.party_size,
          p.name AS promoter_name,
          p.slug AS promoter_slug,
          g.status,
          g.created_at,
          g.checked_in_at
          , g.location_exception
          , g.exception_reason
          , g.confirmation_code
        FROM guests g
        JOIN promoters p ON p.id = g.promoter_id
        JOIN venues v ON v.id = g.venue_id
        WHERE v.slug = 'scores-tampa'
        ORDER BY g.created_at DESC, g.id DESC
        LIMIT 500
      `)
      .all<GuestRow>();

    return success({
      guests: result.results ?? [],
    });
  } catch (error) {
    console.error("guest-list failed", error);

    return failure(
      "DATABASE_ERROR",
      "The guest list could not be loaded.",
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "GET") {
    return failure(
      "METHOD_NOT_ALLOWED",
      "Use GET for this endpoint.",
      405,
    );
  }

  return onRequestGet(context);
};
