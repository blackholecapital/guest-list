import { failure, success, type Env } from "../lib/api";
import { getPromoterSession } from "../lib/promoter-session";
import { reportingWindow, sqlDateWindow, sqlWindow } from "../lib/reporting";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getPromoterSession(request, env.DB);
  if (!session) return failure("PROMOTER_SESSION_REQUIRED", "Sign in again to view your statistics.", 401);
  try {
    const reporting = await reportingWindow(request, env);
    const guestWindow = sqlDateWindow("COALESCE(event_date, substr(created_at, 1, 10))", reporting);
    const qrWindow = sqlWindow("created_at", reporting);
    const promoter = await env.DB.prepare(`
        SELECT pass_limit, passes_used, reset_days, stats_reset_at,
          MAX(pass_limit - passes_used, 0) AS passes_remaining
        FROM promoters WHERE id = ?
      `).bind(session.promoterId).first<any>();
    const statsResetAt = String(promoter?.stats_reset_at ?? "1970-01-01 00:00:00");
    const [guests, qrs] = await Promise.all([
      env.DB.prepare(`
        SELECT COUNT(*) AS registrations,
          COALESCE(SUM(party_size), 0) AS total_guests,
          COALESCE(SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
        FROM guests
        WHERE promoter_id = ? AND created_at >= ?${guestWindow.clause}
      `).bind(session.promoterId, statsResetAt, ...guestWindow.values).first<any>(),
      env.DB.prepare(`
        SELECT COUNT(*) AS generated, COALESCE(SUM(used_count), 0) AS scanned
        FROM qr_codes
        WHERE promoter_id = ? AND deleted_at IS NULL AND created_at >= ?${qrWindow.clause}
      `).bind(session.promoterId, statsResetAt, ...qrWindow.values).first<any>(),
    ]);
    const registrations = Number(guests?.registrations ?? 0);
    const checkedIn = Number(guests?.checked_in ?? 0);
    const generated = Number(qrs?.generated ?? 0);
    const scanned = Number(qrs?.scanned ?? 0);
    return success({
      reporting,
      promoter: {
        name: session.promoterName,
        slug: session.promoterSlug,
        loginUsername: session.loginUsername,
        passesRemaining: Number(promoter?.passes_remaining ?? 0),
        passLimit: Number(promoter?.pass_limit ?? 0),
        resetDays: Number(promoter?.reset_days ?? 1),
      },
      stats: {
        qrGenerated: generated,
        qrScanned: scanned,
        registrations,
        totalGuests: Number(guests?.total_guests ?? 0),
        checkedIn,
        scanConversionPercentage: generated > 0 ? Number(((scanned / generated) * 100).toFixed(1)) : 0,
        registrationConversionPercentage: scanned > 0 ? Number(((registrations / scanned) * 100).toFixed(1)) : 0,
        checkInConversionPercentage: registrations > 0 ? Number(((checkedIn / registrations) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    console.error("promoter stats failed", error);
    return failure("DATABASE_ERROR", "Your statistics could not be loaded.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "GET"
  ? onRequestGet(context)
  : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
