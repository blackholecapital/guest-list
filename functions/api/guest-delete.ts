import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

type GuestRow = {
  id: number;
  name: string;
  status: string;
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure(
      "ADMIN_SESSION_REQUIRED",
      "Your Admin session expired. Log out and sign in again.",
      401,
    );
  }

  const body = await readJson(request);
  const guestId = Number(body?.guestId);
  if (!Number.isInteger(guestId) || guestId < 1) {
    return failure("VALIDATION_ERROR", "Choose a valid guest to delete.", 400);
  }

  try {
    const guest = await env.DB.prepare(`
      SELECT g.id, g.name, g.status
      FROM guests g
      JOIN venues v ON v.id = g.venue_id
      WHERE g.id = ? AND v.slug = 'scores-tampa'
      LIMIT 1
    `).bind(guestId).first<GuestRow>();

    if (!guest) {
      return failure("GUEST_NOT_FOUND", "That guest is no longer on the list.", 404);
    }

    const deleted = await env.DB.prepare(`
      DELETE FROM guests
      WHERE id = ?
        AND venue_id = (SELECT id FROM venues WHERE slug = 'scores-tampa')
    `).bind(guestId).run();

    if (Number(deleted.meta.changes ?? 0) !== 1) {
      throw new Error("D1 did not confirm exactly one deleted guest");
    }

    return success({
      deleted: true,
      guest: {
        id: Number(guest.id),
        name: String(guest.name),
        status: String(guest.status),
      },
      analyticsUpdated: true,
    });
  } catch (error) {
    console.error("guest delete failed", error);
    return failure(
      "GUEST_DELETE_FAILED",
      "The guest could not be deleted. No deletion was confirmed.",
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async context =>
  context.request.method === "POST"
    ? onRequestPost(context)
    : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
