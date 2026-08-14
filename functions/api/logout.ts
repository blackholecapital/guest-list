import { revokeAdminSession } from "../lib/admin-session";
import { failure, type Env } from "../lib/api";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const cookie = await revokeAdminSession(request, env.DB);
  return Response.json({ ok: true, data: { loggedOut: true } }, {
    headers: { "Cache-Control": "no-store", "Set-Cookie": cookie },
  });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
