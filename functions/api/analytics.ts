import { success, failure, type Env } from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const qr = await env.DB.prepare(`
      SELECT
        COUNT(*) as generated,
        COALESCE(SUM(used_count),0) as scanned
      FROM qr_codes
    `).first<any>();

    const guests = await env.DB.prepare(`
      SELECT
        COUNT(*) as registrations,
        COALESCE(SUM(party_size),0) as total_guests,
        COALESCE(SUM(
          CASE
            WHEN status='checked_in'
            THEN 1
            ELSE 0
          END
        ),0) as checked_in
      FROM guests
    `).first<any>();

    return success({
      qrGenerated: qr?.generated ?? 0,
      qrScanned: qr?.scanned ?? 0,
      guestRegistered: guests?.registrations ?? 0,
      totalGuests: guests?.total_guests ?? 0,
      checkedIn: guests?.checked_in ?? 0,
    });

  } catch(error) {
    console.error(error);
    return failure(
      "DATABASE_ERROR",
      "Analytics failed",
      500,
    );
  }
};
