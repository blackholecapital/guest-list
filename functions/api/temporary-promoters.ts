import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

type TemporaryPromoterRow = {
  id: number;
  slug: string;
  name: string;
  active: number;
  temporary_slot: number;
};

async function requireAdmin(request: Request, env: Env) {
  return hasAdminSession(request, env.DB);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT id, slug, name, active, temporary_slot
      FROM promoters
      WHERE promoter_kind = 'temporary'
      ORDER BY temporary_slot
    `).all<TemporaryPromoterRow>();

    return success({
      promoters: (result.results ?? []).map(row => ({
        id: Number(row.id),
        slug: String(row.slug),
        name: String(row.name),
        active: Number(row.active) === 1,
        slot: Number(row.temporary_slot),
      })),
    });
  } catch (error) {
    console.error("temporary promoters GET failed", error);
    return failure("DATABASE_ERROR", "Temporary promoters could not be loaded. Apply the latest D1 migration.", 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }

  const body = await readJson(request);
  const id = Number(body?.id);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!Number.isInteger(id) || id <= 0 || name.length > 80) {
    return failure("VALIDATION_ERROR", "Choose a temporary promoter and enter a name up to 80 characters.", 400);
  }

  try {
    const updated = await env.DB.prepare(`
      UPDATE promoters
      SET name = CASE WHEN ? = '' THEN 'Temporary ' || temporary_slot ELSE ? END,
          active = CASE WHEN ? = '' THEN 0 ELSE 1 END
      WHERE id = ? AND promoter_kind = 'temporary'
      RETURNING id, slug, name, active, temporary_slot
    `).bind(name, name, name, id).first<TemporaryPromoterRow>();

    if (!updated) return failure("NOT_FOUND", "Temporary promoter slot was not found.", 404);
    return success({
      promoter: {
        id: Number(updated.id),
        slug: String(updated.slug),
        name: String(updated.name),
        active: Number(updated.active) === 1,
        slot: Number(updated.temporary_slot),
      },
    });
  } catch (error) {
    console.error("temporary promoter save failed", error);
    return failure("DATABASE_ERROR", "Temporary promoter could not be saved.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return failure("METHOD_NOT_ALLOWED", "Use GET or POST for this endpoint.", 405);
};
