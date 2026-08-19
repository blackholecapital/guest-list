import { failure, normalizePhone, readJson, success, type Env } from "../lib/api";

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
  const body = await readJson(request);

  if (!body) {
    return failure("VALIDATION_ERROR", "A valid JSON request body is required.", 400);
  }

  const testPhone = normalizePhone(String(body.test_phone ?? ""));

  if (testPhone && testPhone.length < 10) {
    return failure("VALIDATION_ERROR", "Enter a valid test phone number.", 400);
  }

  await env.DB.prepare(`
    INSERT INTO demo_settings (
      id,
      test_phone,
      unlimited_joins,
      bypass_duplicates,
      always_send_sms
    )
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      test_phone=excluded.test_phone,
      unlimited_joins=excluded.unlimited_joins,
      bypass_duplicates=excluded.bypass_duplicates,
      always_send_sms=excluded.always_send_sms
  `)
  .bind(
    testPhone,
    body.unlimited_joins ? 1 : 0,
    body.bypass_duplicates ? 1 : 0,
    body.always_send_sms ? 1 : 0
  )
  .run();

  return success({
    saved: true,
    test_phone: testPhone,
    unlimited_joins: body.unlimited_joins ? 1 : 0,
    bypass_duplicates: body.bypass_duplicates ? 1 : 0,
    always_send_sms: body.always_send_sms ? 1 : 0,
  });
};
