import { failure, type Env } from "../lib/api";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.CONTEST_PHOTOS) return failure("STORAGE_UNAVAILABLE", "Photo storage is not configured.", 503);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return failure("VALIDATION_ERROR", "A valid photo id is required.", 400);
  const photo = await env.DB.prepare(`SELECT object_key, content_type FROM contest_photos WHERE id = ?`).bind(id).first<any>();
  if (!photo) return failure("NOT_FOUND", "Photo not found.", 404);
  const object = await env.CONTEST_PHOTOS.get(photo.object_key);
  if (!object) return failure("NOT_FOUND", "Photo not found.", 404);
  return new Response(object.body, { headers: { "Content-Type": photo.content_type, "Cache-Control": "private, max-age=300", "Content-Disposition": "inline" } });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "GET" ? onRequestGet(context) : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
