import { failure, success, type Env } from "../lib/api";
import { contestRoundLabel, getCurrentContestSettings } from "../lib/contest-schedule";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [entriesResult, photosResult, settings] = await Promise.all([
    env.DB.prepare(`SELECT id, name, phone, email, date_of_birth, status, assigned_event_date, assigned_event_time, assigned_round, created_at FROM contest_entries ORDER BY created_at DESC`).all<any>(),
    env.DB.prepare(`SELECT id, entry_id FROM contest_photos ORDER BY id`).all<any>(),
    getCurrentContestSettings(env.DB),
  ]);
  const photoMap = new Map<number, number[]>();
  for (const photo of photosResult.results || []) photoMap.set(Number(photo.entry_id), [...(photoMap.get(Number(photo.entry_id)) || []), Number(photo.id)]);
  const entries = (entriesResult.results || []).map(entry => ({ ...entry, photo_ids: photoMap.get(Number(entry.id)) || [] }));
  return success({ entries, settings: settings ? { title: settings.title, eventDate: settings.event_date, eventTime: settings.event_time, venueName: settings.venue_name, venueAddress: settings.venue_address, approvalMessage: settings.approval_message, reminderMessage: settings.reminder_message, currentRound: settings.current_round, weeklyRounds: settings.weekly_rounds, roundLabel: contestRoundLabel(settings.current_round, settings.weekly_rounds) } : null });
};

export const onRequest: PagesFunction<Env> = async context => context.request.method === "GET" ? onRequestGet(context) : failure("METHOD_NOT_ALLOWED", "Use GET for this endpoint.", 405);
