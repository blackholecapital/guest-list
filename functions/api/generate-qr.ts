import qrcode from "qrcode-generator";
import { failure, success, type Env } from "../lib/api";

interface PromoterPassRow {
  id: number;
  pass_limit: number;
  passes_used: number;
  passes_remaining: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json() as { promoterId?: number };
  const promoterId = Number(body.promoterId);

  if (!Number.isInteger(promoterId) || promoterId <= 0) {
    return failure("BAD_REQUEST", "Missing promoterId.", 400);
  }

  try {
    await env.DB.prepare(`
      UPDATE promoters
      SET passes_used = 0,
          last_reset_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND (
          last_reset_at IS NULL OR
          datetime(last_reset_at, '+' || reset_days || ' days') <= CURRENT_TIMESTAMP
        )
    `).bind(promoterId).run();

    const promoter = await env.DB.prepare(`
      UPDATE promoters
      SET passes_used = passes_used + 1
      WHERE id = ?
        AND active = 1
        AND passes_used < pass_limit
      RETURNING
        id,
        pass_limit,
        passes_used,
        pass_limit - passes_used AS passes_remaining
    `).bind(promoterId).first<PromoterPassRow>();

    if (!promoter) {
      return failure(
        "PASS_LIMIT_REACHED",
        "No QR passes remain. Passes reset every 24 hours.",
        409,
      );
    }

    const token = crypto.randomUUID();

    try {
      await env.DB.prepare(`
        INSERT INTO qr_codes (promoter_id, token, max_uses, expires_at)
        VALUES (?, ?, 1, datetime('now', '+1 day'))
      `).bind(promoterId, token).run();
    } catch (error) {
      await env.DB.prepare(`
        UPDATE promoters
        SET passes_used = MAX(passes_used - 1, 0)
        WHERE id = ?
      `).bind(promoterId).run();
      throw error;
    }

    const url = `${new URL(request.url).origin}/join/${token}`;
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();

    return success({
      url,
      qrCode: qr.createDataURL(8, 16),
      passesRemaining: promoter.passes_remaining,
      passLimit: promoter.pass_limit,
      resetsInHours: 24,
    });
  } catch (error) {
    console.error("generate-qr failed", error);
    return failure("DATABASE_ERROR", "The QR code could not be generated.", 500);
  }
};
