import { hasAdminSession } from "../lib/admin-session";
import { failure, success, type Env } from "../lib/api";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.CONTEST_PHOTOS) return failure("STORAGE_UNAVAILABLE", "Image storage is not configured.", 503);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return failure("VALIDATION_ERROR", "A valid VIP service is required.", 400);
  const row = await env.DB.prepare(`SELECT image_key, image_content_type FROM vip_services WHERE id = ?`).bind(id).first<any>();
  if (!row?.image_key) return failure("NOT_FOUND", "VIP image not found.", 404);
  const object = await env.CONTEST_PHOTOS.get(String(row.image_key));
  if (!object) return failure("NOT_FOUND", "VIP image not found.", 404);
  return new Response(object.body, {
    headers: {
      "Content-Type": String(row.image_content_type || object.httpMetadata?.contentType || "image/jpeg"),
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": "inline",
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await hasAdminSession(request, env.DB)) {
    return failure("ADMIN_SESSION_REQUIRED", "Your Admin session expired. Log out and sign in again.", 401);
  }
  if (!env.CONTEST_PHOTOS) return failure("STORAGE_UNAVAILABLE", "Image storage is not configured.", 503);
  const form = await request.formData();
  const serviceId = Number(form.get("serviceId"));
  const image = form.get("image");
  if (!Number.isInteger(serviceId) || serviceId < 1 || !(image instanceof File) || image.size < 1) {
    return failure("VALIDATION_ERROR", "Choose a valid VIP offer and image.", 400);
  }
  if (!allowedTypes.has(image.type) || image.size > maxBytes) {
    return failure("IMAGE_INVALID", "Flyers must be JPG, PNG, or WebP and no larger than 8 MB.", 400);
  }
  const service = await env.DB.prepare(`
    SELECT s.id, s.image_key
    FROM vip_services s JOIN venues v ON v.id = s.venue_id
    WHERE s.id = ? AND v.slug = 'scores-tampa'
  `).bind(serviceId).first<any>();
  if (!service) return failure("NOT_FOUND", "VIP offer not found.", 404);

  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const key = `vip/services/${serviceId}/${crypto.randomUUID()}.${extension}`;
  try {
    await env.CONTEST_PHOTOS.put(key, image.stream(), {
      httpMetadata: { contentType: image.type },
      customMetadata: { serviceId: String(serviceId), originalName: image.name.slice(0, 240) },
    });
    await env.DB.prepare(`
      UPDATE vip_services SET image_key = ?, image_content_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(key, image.type, serviceId).run();
    if (service.image_key) {
      try {
        await env.CONTEST_PHOTOS.delete(String(service.image_key));
      } catch (cleanupError) {
        console.error("old VIP image cleanup failed", cleanupError);
      }
    }
    return success({ imageUrl: `/api/vip-service-image?id=${serviceId}&v=${Date.now()}` });
  } catch (error) {
    await env.CONTEST_PHOTOS.delete(key);
    console.error("vip image upload failed", error);
    return failure("IMAGE_SAVE_FAILED", "The VIP flyer could not be saved.", 500);
  }
};

export const onRequest: PagesFunction<Env> = async context => {
  if (context.request.method === "GET") return onRequestGet(context);
  if (context.request.method === "POST") return onRequestPost(context);
  return failure("METHOD_NOT_ALLOWED", "Use GET or POST for this endpoint.", 405);
};
