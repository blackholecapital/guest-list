import { failure, readJson, success, type Env } from "../lib/api";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const guestId = Number(body?.guestId);

  if (!Number.isInteger(guestId) || guestId < 1) {
    return failure("VALIDATION_ERROR", "A valid guest ID is required.", 400);
  }

  try {
    const guest = await env.DB
      .prepare(`
        SELECT id, status, checked_in_at
        FROM guests
        WHERE id = ?
        LIMIT 1
      `)
      .bind(guestId)
      .first<{
        id: number;
        status: string;
        checked_in_at: string | null;
      }>();

    if (!guest) {
      return failure("GUEST_NOT_FOUND", "The guest could not be found.", 404);
    }

    if (guest.status === "checked_in") {
      return success({
        guestId,
        status: "checked_in",
        checkedInAt: guest.checked_in_at,
        alreadyCheckedIn: true,
      });
    }

    const checkedInAt = new Date().toISOString();

    await env.DB
      .prepare(`
        UPDATE guests
        SET status = 'checked_in', checked_in_at = ?
        WHERE id = ?
      `)
      .bind(checkedInAt, guestId)
      .run();

    return success({
      guestId,
      status: "checked_in",
      checkedInAt,
      alreadyCheckedIn: false,
    });
  } catch (error) {
    console.error("door-checkin failed", error);
    return failure("DATABASE_ERROR", "The guest could not be checked in.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "POST") {
    return failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
  }

  return onRequestPost(context);
};
