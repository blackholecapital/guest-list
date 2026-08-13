import { failure, readJson, success, type Env } from "../lib/api";

function formatDate(value: string) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "a date to be announced"; }
function formatTime(value: string) { return value ? new Date(`2000-01-01T${value}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "a time to be announced"; }

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request); const id = Number(body?.id); const status = body?.status;
  if (!Number.isInteger(id) || (status !== "approved" && status !== "denied")) return failure("VALIDATION_ERROR", "A valid applicant and decision are required.", 400);
  const entry = await env.DB.prepare(`SELECT id, name, phone, sms_opt_in FROM contest_entries WHERE id=?`).bind(id).first<any>();
  if (!entry) return failure("NOT_FOUND", "Applicant not found.", 404);
  await env.DB.prepare(`UPDATE contest_entries SET status=?, reviewed_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status, id).run();
  let smsQueued = false;
  if (status === "approved" && entry.sms_opt_in && env.guest_followups) {
    const settings = await env.DB.prepare(`SELECT * FROM contest_settings WHERE id=1`).first<any>();
    if (settings) {
      const messageBody = String(settings.approval_message).replaceAll("{name}", entry.name).replaceAll("{title}", settings.title).replaceAll("{venue}", settings.venue_name).replaceAll("{date}", formatDate(settings.event_date)).replaceAll("{time}", formatTime(settings.event_time));
      await env.guest_followups.send({ phone: entry.phone, name: entry.name, smsOptIn: true, messageBody }); smsQueued = true;
    }
  }
  return success({ id, status, smsQueued });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST" ? onRequestPost(context) : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
