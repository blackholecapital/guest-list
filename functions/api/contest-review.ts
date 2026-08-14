import { failure, readJson, success, type Env } from "../lib/api";
import { contestRoundLabel, fillContestMessage, formatContestDate, formatContestTime, getCurrentContestSettings } from "../lib/contest-schedule";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson(request); const id = Number(body?.id); const status = body?.status;
  if (!Number.isInteger(id) || (status !== "approved" && status !== "denied")) return failure("VALIDATION_ERROR", "A valid applicant and decision are required.", 400);
  const entry = await env.DB.prepare(`SELECT id, name, phone, sms_opt_in FROM contest_entries WHERE id=?`).bind(id).first<any>();
  if (!entry) return failure("NOT_FOUND", "Applicant not found.", 404);
  const settings = status === "approved" ? await getCurrentContestSettings(env.DB) : null;
  await env.DB.prepare(`
    UPDATE contest_entries
    SET status=?, reviewed_at=CURRENT_TIMESTAMP,
      assigned_event_date=?, assigned_event_time=?, assigned_round=?
    WHERE id=?
  `).bind(
    status,
    status === "approved" ? settings?.event_date ?? null : null,
    status === "approved" ? settings?.event_time ?? null : null,
    status === "approved" ? settings?.current_round ?? null : null,
    id,
  ).run();
  let smsQueued = false;
  if (status === "approved" && entry.sms_opt_in && env.guest_followups && settings) {
    const messageBody = fillContestMessage(String(settings.approval_message), {
      name: entry.name,
      title: settings.title,
      venue: settings.venue_name,
      date: formatContestDate(settings.event_date),
      time: formatContestTime(settings.event_time),
      round: contestRoundLabel(settings.current_round, settings.weekly_rounds),
    });
    await env.guest_followups.send({ phone: entry.phone, name: entry.name, smsOptIn: true, messageBody }); smsQueued = true;
  }
  return success({ id, status, smsQueued });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "POST" ? onRequestPost(context) : failure("METHOD_NOT_ALLOWED", "Use POST for this endpoint.", 405);
