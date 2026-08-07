import qrcode from "qrcode-generator";
import { failure, success, type Env } from "../lib/api";

interface PromoterPassRow {
  id: number;
  pass_limit: number;
  passes_used: number;
  passes_remaining: number;
  reset_days: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json() as {
    promoterId?: number;
    expiresAt?: string;
    maxUses?: number;
  };
  const promoterId = Number(body.promoterId);
  const maxUses = body.maxUses === undefined ? 1 : Number(body.maxUses);
  const requestedExpiration = body.expiresAt
    ? new Date(body.expiresAt)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (!Number.isInteger(promoterId) || promoterId <= 0) {
    return failure("BAD_REQUEST", "Missing promoterId.", 400);
  }

  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10000) {
    return failure("BAD_REQUEST", "maxUses must be between 1 and 10,000.", 400);
  }

  const expiresAt = requestedExpiration.getTime();
  const maximumExpiration = Date.now() + 366 * 24 * 60 * 60 * 1000;

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    expiresAt > maximumExpiration
  ) {
    return failure(
      "BAD_REQUEST",
      "Choose an expiration within the next 366 days.",
      400,
    );
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
        pass_limit - passes_used AS passes_remaining,
        reset_days
    `).bind(promoterId).first<PromoterPassRow>();

    if (!promoter) {
      return failure(
        "PASS_LIMIT_REACHED",
        "No QR passes remain. Passes reset after the configured interval.",
        409,
      );
    }

    const token = crypto.randomUUID();

    try {
      await env.DB.prepare(`
        INSERT INTO qr_codes (promoter_id, token, max_uses, expires_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        promoterId,
        token,
        maxUses,
        requestedExpiration.toISOString(),
      ).run();
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
      resetsInHours: promoter.reset_days * 24,
      expiresAt: requestedExpiration.toISOString(),
      maxUses,
    });
  } catch (error) {
    console.error("generate-qr failed", error);
    return failure("DATABASE_ERROR", "The QR code could not be generated.", 500);
  }
};
