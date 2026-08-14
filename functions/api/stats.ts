import { failure, success, type Env } from "../lib/api";
import { reportingWindow, sqlDateWindow, sqlWindow } from "../lib/reporting";

interface SummaryRow { total_registrations: number; total_party_size: number; checked_in: number; not_checked_in: number; }
interface PromoterRow { promoter_id: number; promoter_name: string; promoter_slug: string; registrations: number; total_party_size: number; checked_in: number; not_checked_in: number; }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const reporting = await reportingWindow(request, env);
    const guestsWindow = sqlDateWindow("COALESCE(g.event_date, substr(g.created_at, 1, 10))", reporting);
    const attemptWindow = sqlWindow("a.created_at", reporting);
    const summary = await env.DB.prepare(`
      SELECT COUNT(g.id) AS total_registrations,
        COALESCE(SUM(g.party_size), 0) AS total_party_size,
        COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in,
        COALESCE(SUM(CASE WHEN g.status != 'checked_in' THEN 1 ELSE 0 END), 0) AS not_checked_in
      FROM guests g
      JOIN venues v ON v.id = g.venue_id
      WHERE v.slug = 'scores-tampa'${guestsWindow.clause}
    `).bind(...guestsWindow.values).first<SummaryRow>();

    const promoters = await env.DB.prepare(`
      SELECT p.id AS promoter_id, p.name AS promoter_name, p.slug AS promoter_slug,
        COUNT(g.id) AS registrations,
        COALESCE(SUM(g.party_size), 0) AS total_party_size,
        COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in,
        COALESCE(SUM(CASE WHEN g.status != 'checked_in' THEN 1 ELSE 0 END), 0) AS not_checked_in
      FROM promoters p
      JOIN venues v ON v.id = p.venue_id
      LEFT JOIN guests g ON g.promoter_id = p.id${guestsWindow.clause}
      WHERE v.slug = 'scores-tampa'
      GROUP BY p.id, p.name, p.slug
      ORDER BY registrations DESC, p.name ASC
    `).bind(...guestsWindow.values).all<PromoterRow>();

    const promoterGeofenceAttempts = await env.DB.prepare(`
      SELECT a.id, a.latitude, a.longitude, a.accuracy_meters, a.distance_meters,
        a.location_status, a.outcome, a.created_at,
        p.name AS promoter_name, p.slug AS promoter_slug
      FROM promoter_qr_generation_attempts a
      JOIN promoters p ON p.id = a.promoter_id
      WHERE a.outcome IN ('blocked_inside_geofence', 'location_unavailable')${attemptWindow.clause}
      ORDER BY a.created_at DESC
      LIMIT 50
    `).bind(...attemptWindow.values).all<any>();

    const totalRegistrations = Number(summary?.total_registrations ?? 0);
    const checkedIn = Number(summary?.checked_in ?? 0);
    return success({
      reporting,
      summary: {
        totalRegistrations,
        totalPartySize: Number(summary?.total_party_size ?? 0),
        checkedIn,
        notCheckedIn: Number(summary?.not_checked_in ?? 0),
        conversionPercentage: totalRegistrations > 0 ? Number(((checkedIn / totalRegistrations) * 100).toFixed(1)) : 0,
      },
      promoters: (promoters.results ?? []).map(row => ({
        promoterId: Number(row.promoter_id), promoterName: row.promoter_name, promoterSlug: row.promoter_slug,
        registrations: Number(row.registrations), totalPartySize: Number(row.total_party_size),
        checkedIn: Number(row.checked_in), notCheckedIn: Number(row.not_checked_in),
        conversionPercentage: Number(row.registrations) > 0 ? Number(((Number(row.checked_in) / Number(row.registrations)) * 100).toFixed(1)) : 0,
      })),
      promoterGeofenceAttempts: promoterGeofenceAttempts.results ?? [],
    });
  } catch (error) {
    console.error("stats failed", error);
    return failure("DATABASE_ERROR", "Statistics could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "GET" ? onRequestGet(context) : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
