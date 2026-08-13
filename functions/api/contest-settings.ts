import { failure, readJson, success, type Env } from "../lib/api";

function map(row: any) { return { title: row.title, eventDate: row.event_date, eventTime: row.event_time, venueName: row.venue_name, venueAddress: row.venue_address, approvalMessage: row.approval_message }; }

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === "GET") {
    const row = await env.DB.prepare(`SELECT * FROM contest_settings WHERE id = 1`).first<any>();
    return row ? success({ settings: map(row) }) : failure("NOT_CONFIGURED", "Contest settings are not available.", 404);
  }
  if (request.method === "POST") {
    const body = await readJson(request);
    if (!body) return failure("VALIDATION_ERROR", "Valid contest settings are required.", 400);
    const title = String(body.title || "").trim(), eventDate = String(body.eventDate || ""), eventTime = String(body.eventTime || ""), venueName = String(body.venueName || "").trim(), venueAddress = String(body.venueAddress || "").trim(), approvalMessage = String(body.approvalMessage || "").trim();
    if (!title || !venueName || !venueAddress || !approvalMessage) return failure("VALIDATION_ERROR", "Title, venue, address, and approval message are required.", 400);
    await env.DB.prepare(`UPDATE contest_settings SET title=?, event_date=?, event_time=?, venue_name=?, venue_address=?, approval_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`).bind(title, eventDate, eventTime, venueName, venueAddress, approvalMessage).run();
    return success({ settings: { title, eventDate, eventTime, venueName, venueAddress, approvalMessage } });
  }
  return failure("METHOD_NOT_ALLOWED", "Use GET or POST for this endpoint.", 405);
};
