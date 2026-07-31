import { success, failure, type Env } from "../lib/api";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const { promoterId } = await request.json() as { promoterId:number };

  if (!promoterId) return failure("BAD_REQUEST","Missing promoterId.",400);

  const token = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO qr_codes (promoter_id, token, expires_at) VALUES (?, ?, datetime('now','+1 day'))"
  ).bind(promoterId, token).run();

  return success({ url: `/join/${token}` });
};
