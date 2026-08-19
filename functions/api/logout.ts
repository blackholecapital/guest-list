import { revokeAdminSession } from "../lib/admin-session";
import { revokePromoterSession } from "../lib/promoter-session";
import { failure, type Env } from "../lib/api";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const [adminCookie, promoterCookie] = await Promise.all([
    revokeAdminSession(request, env.DB),
    revokePromoterSession(request, env.DB),
  ]);
  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", adminCookie);
  headers.append("Set-Cookie", promoterCookie);
  return Response.json({ ok: true, data: { loggedOut: true } }, { headers });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST"
  ? onRequestPost(context)
  : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
