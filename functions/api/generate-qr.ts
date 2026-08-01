import { success, failure, type Env } from "../lib/api";

function makeSvgQr(data: string): string {
  const escaped = data.replace(/&/g, "&amp;");

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="100%" height="100%" fill="white"/>
  <text x="20" y="260" font-size="20">
    ${escaped}
  </text>
</svg>
`.trim();
}

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

  const svg = makeSvgQr(url);

  return success({
    url,
    qrCode: `data:image/svg+xml;base64,${btoa(svg)}`,
  });
};
