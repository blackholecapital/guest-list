import { failure, readJson, success, type Env } from "../lib/api";
import { createAdminSession } from "../lib/admin-session";
import { createPromoterSession } from "../lib/promoter-session";
import { constantTimeEqual, verifyPassword } from "../lib/passwords";

const staffAccounts = [
  { username: "Door", passwordKey: "DOOR_LOGIN_PASSWORD", role: "door" },
  { username: "Admin", passwordKey: "ADMIN_LOGIN_PASSWORD", role: "admin" },
] as const;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !password) return failure("LOGIN_REQUIRED", "Enter your username and password.", 400);

  const staff = staffAccounts.find(account => account.username.toLowerCase() === username.toLowerCase());
  if (staff) {
    const configuredPassword = env[staff.passwordKey];
    if (!configuredPassword) {
      return failure("LOGIN_NOT_CONFIGURED", "This login has not been configured yet.", 503);
    }
    if (constantTimeEqual(password, configuredPassword)) {
      if (staff.role === "admin") {
        const session = await createAdminSession(env.DB);
        return Response.json({ ok: true, data: { session: { username: staff.username, role: staff.role } } }, {
          headers: { "Cache-Control": "no-store", "Set-Cookie": session.cookie },
        });
      }
      return success({ session: { username: staff.username, role: staff.role } });
    }
  }

  const promoter = await env.DB.prepare(`
    SELECT id, slug, login_username, password_hash, password_salt
    FROM promoters
    WHERE login_username = ? COLLATE NOCASE
      AND active = 1
    LIMIT 1
  `).bind(username).first<any>();

  if (promoter) {
    const loginUsername = String(promoter.login_username);
    const pepper = env.PROMOTER_PASSWORD_PEPPER?.trim() ?? "";
    const matches = promoter.password_hash && promoter.password_salt && pepper.length >= 32
      ? await verifyPassword(
          password,
          String(promoter.password_salt),
          String(promoter.password_hash),
          pepper,
        )
      : false;
    if (matches) {
      const cookie = await createPromoterSession(env.DB, Number(promoter.id));
      return Response.json({
        ok: true,
        data: { session: { username: loginUsername, role: "promoter", promoterSlug: String(promoter.slug) } },
      }, {
        headers: { "Cache-Control": "no-store", "Set-Cookie": cookie },
      });
    }
  }

  return failure("INVALID_LOGIN", "The selected user and password do not match.", 401);
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
