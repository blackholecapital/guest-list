import { success, failure, type Env } from "../lib/api";
import { reportingWindow, sqlDateWindow, sqlWindow } from "../lib/reporting";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const reporting = await reportingWindow(request, env);
    const qrWindow = sqlWindow("created_at", reporting);
    const guestWindow = sqlDateWindow("COALESCE(event_date, substr(created_at, 1, 10))", reporting);
    const qr = await env.DB.prepare(`
      SELECT COUNT(*) AS generated, COALESCE(SUM(used_count), 0) AS scanned
      FROM qr_codes WHERE deleted_at IS NULL${qrWindow.clause}
    `).bind(...qrWindow.values).first<any>();
    const guests = await env.DB.prepare(`
      SELECT COUNT(*) AS registrations, COALESCE(SUM(party_size), 0) AS total_guests,
        COALESCE(SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
      FROM guests WHERE 1 = 1${guestWindow.clause}
    `).bind(...guestWindow.values).first<any>();
    return success({
      reporting,
      qrGenerated: Number(qr?.generated ?? 0), qrScanned: Number(qr?.scanned ?? 0),
      guestRegistered: Number(guests?.registrations ?? 0), totalGuests: Number(guests?.total_guests ?? 0),
      checkedIn: Number(guests?.checked_in ?? 0),
    });
  } catch (error) {
    console.error("analytics failed", error);
    return failure("DATABASE_ERROR", "Analytics failed", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "GET" ? onRequestGet(context) : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
