import { success, failure, type Env } from "../lib/api";
import qrcode from "qrcode-generator";

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
}) => {
  const { promoterId } = await request.json() as {
    promoterId:number;
  };

  if (!promoterId) {
    return failure(
      "BAD_REQUEST",
      "Missing promoterId.",
      400,
    );
  }

  const token = crypto.randomUUID();

  await env.DB.prepare(`
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
  `)
  .bind(
    promoterId,
    token,
  )
  .run();

  const url =
    `${new URL(request.url).origin}/join/${token}`;

  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();

  let svg = qr.createSvgTag({
    scalable: true,
  });

  svg = svg.replace(
    "</svg>",
    `
    <rect
      x="38%"
      y="38%"
      width="24%"
      height="24%"
      fill="white"
      rx="8"
    />

    <image
      href="/assets/scores-logo.png"
      x="41%"
      y="41%"
      width="18%"
      height="18%"
      preserveAspectRatio="xMidYMid meet"
    />
    </svg>`
  );

  const qrCode =
    `data:image/svg+xml;base64,${btoa(svg)}`;

  return success({
    url,
    qrCode,
  });
};
