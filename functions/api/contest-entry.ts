import { failure, normalizePhone, success, type Env } from "../lib/api";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

function isAtLeast21(dateOfBirth: string) {
  const birth = new Date(`${dateOfBirth}T12:00:00Z`);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 21 && age < 100;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.CONTEST_PHOTOS) return failure("STORAGE_UNAVAILABLE", "Photo storage is not configured.", 503);
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const phone = normalizePhone(String(form.get("phone") || ""));
  const email = String(form.get("email") || "").trim().toLowerCase();
  const dateOfBirth = String(form.get("dateOfBirth") || "");
  const ageConfirmed = form.get("ageConfirmed") === "yes";
  const smsOptIn = form.get("smsOptIn") === "yes";
  const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);

  if (name.length < 2 || phone.length < 10 || !email.includes("@") || !ageConfirmed || !isAtLeast21(dateOfBirth)) {
    return failure("VALIDATION_ERROR", "Please provide valid contact details and confirm that you are at least 21.", 400);
  }
  if (photos.length < 1 || photos.length > 3) return failure("PHOTO_COUNT", "Please upload between one and three photos.", 400);
  if (photos.some(photo => !allowedTypes.has(photo.type) || photo.size > maxBytes)) return failure("PHOTO_INVALID", "Photos must be JPG, PNG, or WebP and no larger than 8 MB each.", 400);

  const inserted = await env.DB.prepare(`INSERT INTO contest_entries (name, phone, email, date_of_birth, sms_opt_in, age_confirmed) VALUES (?, ?, ?, ?, ?, 1)`).bind(name, phone, email, dateOfBirth, smsOptIn ? 1 : 0).run();
  const entryId = Number(inserted.meta.last_row_id);
  const savedKeys: string[] = [];
  try {
    for (const [index, photo] of photos.entries()) {
      const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const key = `entries/${entryId}/${crypto.randomUUID()}-${index + 1}.${extension}`;
      await env.CONTEST_PHOTOS.put(key, photo.stream(), { httpMetadata: { contentType: photo.type }, customMetadata: { entryId: String(entryId), originalName: photo.name } });
      savedKeys.push(key);
      await env.DB.prepare(`INSERT INTO contest_photos (entry_id, object_key, content_type, file_name) VALUES (?, ?, ?, ?)`).bind(entryId, key, photo.type, photo.name.slice(0, 240)).run();
    }
  } catch (error) {
    await Promise.all(savedKeys.map(key => env.CONTEST_PHOTOS!.delete(key)));
    await env.DB.prepare(`DELETE FROM contest_entries WHERE id = ?`).bind(entryId).run();
    console.error("contest photo save failed", error);
    return failure("UPLOAD_FAILED", "Your photos could not be saved. Please try again.", 500);
  }
  return success({ entryId, status: "pending" }, 201);
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST" ? onRequestPost(context) : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
