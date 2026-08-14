import { createSalt, hashPassword } from "../lib/passwords";
import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let stage = "checking the Admin session";
  try {
    if (!await hasAdminSession(request, env.DB)) {
      return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
    }

    const body = await readJson(request);
    const promoterId = Number(body?.promoterId);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!Number.isInteger(promoterId) || promoterId <= 0 || password.length < 8 || password.length > 128) {
      return failure("VALIDATION_ERROR", "Choose a promoter and use a password between 8 and 128 characters.", 400);
    }

    stage = "securing the new password";
    const pepper = env.PROMOTER_PASSWORD_PEPPER?.trim() ?? "";
    if (pepper.length < 32) {
      return failure(
        "PASSWORD_SECURITY_NOT_CONFIGURED",
        "Promoter password security is not configured. Set PROMOTER_PASSWORD_PEPPER in Cloudflare Pages.",
        503,
      );
    }
    const salt = createSalt();
    const passwordHash = await hashPassword(password, salt, pepper);

    stage = "writing the promoter record";
    const write = await env.DB.prepare(`
      UPDATE promoters
      SET password_hash = ?, password_salt = ?
      WHERE id = ?
    `).bind(passwordHash, salt, promoterId).run();
    if (!write.success || Number(write.meta.changes ?? 0) !== 1) {
      return failure("PROMOTER_NOT_FOUND", "Promoter not found; no password was changed.", 404);
    }

    stage = "verifying the saved promoter record";
    const updated = await env.DB.prepare(`
      SELECT id, name, slug, login_username, password_hash, password_salt
      FROM promoters
      WHERE id = ?
      LIMIT 1
    `).bind(promoterId).first<any>();
    if (!updated || updated.password_hash !== passwordHash || updated.password_salt !== salt) {
      throw new Error("D1 did not return the saved credential values");
    }

    return success({ promoter: updated, saved: true });
  } catch (error) {
    console.error(`Promoter password update failed while ${stage}`, error);
    return failure(
      "PASSWORD_UPDATE_FAILED",
      `The password could not be saved while ${stage}. No successful save was confirmed.`,
      500,
    );
  }
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
