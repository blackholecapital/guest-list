import { normalizePhone, success, type Env } from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB
    .prepare("SELECT * FROM demo_settings WHERE id=1")
    .first();

  return success(row ?? {});
};

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  const body = await request.json() as any;

  await env.DB.prepare(`
    UPDATE demo_settings
    SET
      test_phone=?,
      unlimited_joins=?,
      bypass_duplicates=?,
      always_send_sms=?
    WHERE id=1
  `)
  .bind(
    normalizePhone(String(body.test_phone ?? "")),
    body.unlimited_joins ? 1 : 0,
    body.bypass_duplicates ? 1 : 0,
    body.always_send_sms ? 1 : 0
  )
  .run();

  return success({saved:true});
};
