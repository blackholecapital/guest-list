import { hasAdminSession } from "../lib/admin-session";
import { failure, readJson, success, type Env } from "../lib/api";
import {
  accountEmail,
  createAccountToken,
  hashAccountToken,
  queueAccountEmail,
  validEmail,
} from "../lib/promoter-account";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }
  const body = await readJson(request);
  const promoterId = Number(body?.promoterId);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!Number.isInteger(promoterId) || promoterId <= 0 || !validEmail(email)) {
    return failure("VALIDATION_ERROR", "Choose a promoter and enter a valid email address.", 400);
  }

  try {
    const promoter = await env.DB.prepare(`
      SELECT id, name, slug
      FROM promoters
      WHERE id = ? AND active = 1
      LIMIT 1
    `).bind(promoterId).first<{ id: number; name: string; slug: string }>();
    if (!promoter) return failure("PROMOTER_NOT_FOUND", "Promoter not found.", 404);

    try {
      await env.DB.prepare("UPDATE promoters SET email = ? WHERE id = ?")
        .bind(email, promoterId)
        .run();
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        return failure("EMAIL_IN_USE", "That email address is already assigned to another promoter.", 409);
      }
      throw error;
    }

    await env.DB.prepare(`
      DELETE FROM promoter_account_tokens
      WHERE promoter_id = ? AND used_at IS NULL
    `).bind(promoterId).run();
    const token = createAccountToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString().slice(0, 19).replace("T", " ");
    await env.DB.prepare(`
      INSERT INTO promoter_account_tokens (token_hash, promoter_id, purpose, expires_at)
      VALUES (?, ?, 'invite', ?)
    `).bind(await hashAccountToken(token), promoterId, expiresAt).run();

    const inviteUrl = `${new URL(request.url).origin}/promoter-account?token=${encodeURIComponent(token)}`;
    const emailQueued = await queueAccountEmail(
      env,
      accountEmail(email, promoter.name, inviteUrl, "invite"),
    );
    return success({
      promoter: { id: promoter.id, name: promoter.name, slug: promoter.slug, email },
      inviteUrl,
      emailQueued,
      expiresAt,
    });
  } catch (error) {
    console.error("promoter invitation failed", error);
    return failure("INVITE_FAILED", "The promoter invitation could not be created.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
