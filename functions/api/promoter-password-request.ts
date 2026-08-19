import { failure, readJson, success, type Env } from "../lib/api";
import {
  accountEmail,
  createAccountToken,
  hashAccountToken,
  queueAccountEmail,
  validEmail,
} from "../lib/promoter-account";

const neutralResponse = () => success({
  requested: true,
  message: "If that email belongs to an active promoter, a reset link is on the way.",
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) return neutralResponse();

  try {
    const promoter = await env.DB.prepare(`
      SELECT id, name
      FROM promoters
      WHERE email = ? COLLATE NOCASE AND active = 1
      LIMIT 1
    `).bind(email).first<{ id: number; name: string }>();
    if (!promoter) return neutralResponse();

    const recent = await env.DB.prepare(`
      SELECT token_hash
      FROM promoter_account_tokens
      WHERE promoter_id = ?
        AND purpose = 'reset'
        AND used_at IS NULL
        AND created_at > datetime('now', '-15 minutes')
      LIMIT 1
    `).bind(promoter.id).first();
    if (recent) return neutralResponse();

    await env.DB.prepare(`
      DELETE FROM promoter_account_tokens
      WHERE promoter_id = ? AND purpose = 'reset' AND used_at IS NULL
    `).bind(promoter.id).run();
    const token = createAccountToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString().slice(0, 19).replace("T", " ");
    await env.DB.prepare(`
      INSERT INTO promoter_account_tokens (token_hash, promoter_id, purpose, expires_at)
      VALUES (?, ?, 'reset', ?)
    `).bind(await hashAccountToken(token), promoter.id, expiresAt).run();

    const resetUrl = `${new URL(request.url).origin}/promoter-account?token=${encodeURIComponent(token)}`;
    await queueAccountEmail(env, accountEmail(email, promoter.name, resetUrl, "reset"));
    return neutralResponse();
  } catch (error) {
    console.error("promoter password reset request failed", error);
    return neutralResponse();
  }
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
