import { failure, readJson, success, type Env } from "../lib/api";
import { constantTimeEqual, hashPassword } from "../lib/passwords";

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
      return success({ session: { username: staff.username, role: staff.role } });
    }
  }

  const promoter = await env.DB.prepare(`
    SELECT slug, login_username, password_hash, password_salt
    FROM promoters
    WHERE login_username = ? COLLATE NOCASE
      AND active = 1
    LIMIT 1
  `).bind(username).first<any>();

  if (promoter) {
    const loginUsername = String(promoter.login_username);
    const matches = promoter.password_hash && promoter.password_salt
      ? constantTimeEqual(await hashPassword(password, String(promoter.password_salt)), String(promoter.password_hash))
      : false;
    if (matches) {
      return success({ session: { username: loginUsername, role: "promoter", promoterSlug: String(promoter.slug) } });
    }
  }

  return failure("INVALID_LOGIN", "The selected user and password do not match.", 401);
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
