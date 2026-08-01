import { failure } from "../lib/api";
import QRCode from "qrcode";

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const data = url.searchParams.get("data");

  if (!data) {
    return failure(
      "BAD_REQUEST",
      "Missing QR data.",
      400,
    );
  }

  const png = await QRCode.toBuffer(data, {
    width: 512,
    margin: 2,
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
