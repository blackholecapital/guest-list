import { createSalt, hashPassword } from "../lib/passwords";
import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }

  const body = await readJson(request);
  const promoterId = Number(body?.promoterId);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!Number.isInteger(promoterId) || promoterId <= 0 || password.length < 8 || password.length > 128) {
    return failure("VALIDATION_ERROR", "Choose a promoter and use a password between 8 and 128 characters.", 400);
  }

  const salt = createSalt();
  const passwordHash = await hashPassword(password, salt);
  const updated = await env.DB.prepare(`
    UPDATE promoters
    SET password_hash = ?, password_salt = ?
    WHERE id = ?
    RETURNING id, name, slug, login_username
  `).bind(passwordHash, salt, promoterId).first<any>();
  if (!updated) return failure("PROMOTER_NOT_FOUND", "Promoter not found.", 404);
  return success({ promoter: updated });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
