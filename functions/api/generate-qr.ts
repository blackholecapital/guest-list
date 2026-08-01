import { success, failure, type Env } from "../lib/api";
import QRCode from "qrcode";

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  const { promoterId } = await request.json() as {
    promoterId: number;
  };

  if (!promoterId) {
    return failure(
      "BAD_REQUEST",
      "Missing promoterId.",
      400,
    );
  }

  const token = crypto.randomUUID();

  await env.DB.prepare(
    `
    INSERT INTO qr_codes (
      promoter_id,
      token,
      expires_at
    )
    VALUES (
      ?,
      ?,
      datetime('now','+1 day')
    )
    `,
  )
    .bind(promoterId, token)
    .run();

  const url = `${new URL(request.url).origin}/join/${token}`;

  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
  });

  return success({
    url,
    qrCode: qrDataUrl,
  });
};
