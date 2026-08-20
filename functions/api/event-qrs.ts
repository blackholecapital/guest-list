import qrcode from "qrcode-generator";
import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

type AssignmentRow = {
  event_id: number;
  event_name: string;
  event_created_at: string;
  expires_at: string;
  promoter_id: number;
  promoter_name: string;
  promoter_slug: string;
  promoter_kind: string;
  temporary_slot: number | null;
  legacy_token: string | null;
  scans: number;
  registrations: number;
  total_guests: number;
  checked_in: number;
};

type EventAssignment = {
  promoterId: number;
  promoterName: string;
  promoterSlug: string;
  promoterKind: string;
  temporarySlot: number | null;
  url: string;
  qrCode: string;
  scans: number;
  registrations: number;
  totalGuests: number;
  checkedIn: number;
  awaitingCheckIn: number;
  registrationConversion: number;
  checkInConversion: number;
};

function qrDataUrl(url: string) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return qr.createDataURL(8, 16);
}

async function requireAdmin(request: Request, env: Env) {
  return hasAdminSession(request, env.DB);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        e.id AS event_id,
        e.name AS event_name,
        e.created_at AS event_created_at,
        e.expires_at,
        p.id AS promoter_id,
        a.display_name AS promoter_name,
        p.slug AS promoter_slug,
        p.promoter_kind,
        p.temporary_slot,
        q.token AS legacy_token,
        COALESCE(q.used_count, 0) + (
          SELECT COUNT(*) FROM special_event_scans s
          WHERE s.event_id = e.id AND s.promoter_id = p.id
        ) AS scans,
        COUNT(DISTINCT g.id) AS registrations,
        COALESCE(SUM(g.party_size), 0) AS total_guests,
        COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
      FROM special_events e
      JOIN special_event_assignments a ON a.event_id = e.id
      JOIN promoters p ON p.id = a.promoter_id
      LEFT JOIN qr_codes q ON q.id = a.legacy_qr_code_id
      LEFT JOIN guests g ON g.promoter_id = p.id AND (
        g.special_event_id = e.id OR
        (q.token IS NOT NULL AND g.qr_token = q.token)
      )
      WHERE e.deleted_at IS NULL
      GROUP BY e.id, a.id, p.id, q.id
      ORDER BY e.created_at DESC, p.promoter_kind, p.temporary_slot, p.id
    `).all<AssignmentRow>();

    const origin = new URL(request.url).origin;
    const eventMap = new Map<number, {
      id: number;
      name: string;
      createdAt: string;
      expiresAt: string;
      assignments: EventAssignment[];
    }>();

    for (const row of result.results ?? []) {
      const eventId = Number(row.event_id);
      let event = eventMap.get(eventId);
      if (!event) {
        event = {
          id: eventId,
          name: String(row.event_name),
          createdAt: String(row.event_created_at),
          expiresAt: String(row.expires_at),
          assignments: [],
        };
        eventMap.set(eventId, event);
      }
      const url = row.legacy_token
        ? `${origin}/join/${row.legacy_token}`
        : `${origin}/event/${eventId}/${row.promoter_slug}`;
      const registrations = Number(row.registrations ?? 0);
      const scans = Number(row.scans ?? 0);
      const checkedIn = Number(row.checked_in ?? 0);
      event.assignments.push({
        promoterId: Number(row.promoter_id),
        promoterName: String(row.promoter_name),
        promoterSlug: String(row.promoter_slug),
        promoterKind: String(row.promoter_kind),
        temporarySlot: row.temporary_slot === null ? null : Number(row.temporary_slot),
        url,
        qrCode: qrDataUrl(url),
        scans,
        registrations,
        totalGuests: Number(row.total_guests ?? 0),
        checkedIn,
        awaitingCheckIn: Math.max(registrations - checkedIn, 0),
        registrationConversion: scans > 0 ? Number(((registrations / scans) * 100).toFixed(1)) : 0,
        checkInConversion: registrations > 0 ? Number(((checkedIn / registrations) * 100).toFixed(1)) : 0,
      });
    }

    const events = Array.from(eventMap.values()).map(event => {
      const scans = event.assignments.reduce((sum, item) => sum + item.scans, 0);
      const registrations = event.assignments.reduce((sum, item) => sum + item.registrations, 0);
      const totalGuests = event.assignments.reduce((sum, item) => sum + item.totalGuests, 0);
      const checkedIn = event.assignments.reduce((sum, item) => sum + item.checkedIn, 0);
      return {
        ...event,
        scans,
        registrations,
        totalGuests,
        checkedIn,
        awaitingCheckIn: Math.max(registrations - checkedIn, 0),
        registrationConversion: scans > 0 ? Number(((registrations / scans) * 100).toFixed(1)) : 0,
        checkInConversion: registrations > 0 ? Number(((checkedIn / registrations) * 100).toFixed(1)) : 0,
      };
    });

    return success({ events });
  } catch (error) {
    console.error("event-qrs GET failed", error);
    return failure("DATABASE_ERROR", "Special-event flyers could not be loaded. Apply the latest D1 migration.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }

  const body = await readJson(request);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const expiration = typeof body?.expiresAt === "string" ? new Date(body.expiresAt) : new Date(NaN);
  const rawIds = Array.isArray(body?.promoterIds) ? body.promoterIds : [];
  const promoterIds = Array.from(new Set(rawIds.map(Number))).filter(id => Number.isInteger(id) && id > 0);
  if (name.length < 1 || name.length > 100 || !Number.isFinite(expiration.getTime()) || expiration.getTime() <= Date.now()) {
    return failure("VALIDATION_ERROR", "Enter an event name and a future expiration date.", 400);
  }
  if (promoterIds.length < 1 || promoterIds.length > 18) {
    return failure("VALIDATION_ERROR", "Assign at least one and no more than 18 promoters.", 400);
  }

  let eventId: number | null = null;
  try {
    const placeholders = promoterIds.map(() => "?").join(", ");
    const valid = await env.DB.prepare(`
      SELECT id, name FROM promoters
      WHERE id IN (${placeholders}) AND active = 1
    `).bind(...promoterIds).all<{ id: number; name: string }>();
    if ((valid.results ?? []).length !== promoterIds.length) {
      return failure("VALIDATION_ERROR", "One or more selected promoters are not active.", 400);
    }

    const venue = await env.DB.prepare("SELECT id FROM venues WHERE slug = 'scores-tampa' LIMIT 1")
      .first<{ id: number }>();
    if (!venue) return failure("VENUE_NOT_FOUND", "Venue configuration does not exist.", 404);

    const created = await env.DB.prepare(`
      INSERT INTO special_events (venue_id, name, expires_at)
      VALUES (?, ?, ?) RETURNING id
    `).bind(venue.id, name, expiration.toISOString()).first<{ id: number }>();
    if (!created) throw new Error("Event insert returned no ID");
    eventId = Number(created.id);

    const promoterNames = new Map((valid.results ?? []).map(row => [Number(row.id), String(row.name)]));
    await env.DB.batch(promoterIds.map(promoterId => env.DB.prepare(`
      INSERT INTO special_event_assignments (event_id, promoter_id, display_name)
      VALUES (?, ?, ?)
    `).bind(eventId, promoterId, promoterNames.get(promoterId) ?? "Promoter")));

    return success({ eventId, assignmentsCreated: promoterIds.length }, 201);
  } catch (error) {
    if (eventId !== null) await env.DB.prepare("DELETE FROM special_events WHERE id = ?").bind(eventId).run();
    console.error("event-qrs POST failed", error);
    return failure("DATABASE_ERROR", "Special-event flyer assignments could not be created.", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }
  const body = await readJson(request);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return failure("BAD_REQUEST", "Choose a valid special event.", 400);

  try {
    const deleted = await env.DB.prepare(`
      UPDATE special_events SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL RETURNING id
    `).bind(id).first<{ id: number }>();
    if (!deleted) return failure("NOT_FOUND", "Special event not found.", 404);
    await env.DB.prepare(`
      UPDATE qr_codes SET deleted_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT legacy_qr_code_id FROM special_event_assignments
        WHERE event_id = ? AND legacy_qr_code_id IS NOT NULL
      )
    `).bind(id).run();
    return success({ id: deleted.id });
  } catch (error) {
    console.error("event-qrs DELETE failed", error);
    return failure("DATABASE_ERROR", "Special event could not be deleted.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  if (context.request.method === "DELETE") return onRequestDelete(context);
  return failure("METHOD_NOT_ALLOWED", "Use GET, POST, or DELETE for this endpoint.", 405);
};
