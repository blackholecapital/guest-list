export type ContestSettingsRow = {
  id: number;
  title: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  approval_message: string;
  reminder_message: string;
  current_round: number;
  weekly_rounds: number;
};

const TAMPA_TIME_ZONE = "America/New_York";

export function tampaNow(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: TAMPA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

export function addContestDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function contestRoundLabel(currentRound: number, weeklyRounds: number) {
  return currentRound <= weeklyRounds
    ? `Weekly Contest ${currentRound} of ${weeklyRounds}`
    : "Grand Finale";
}

export function formatContestDate(value: string) {
  return value
    ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "a date to be announced";
}

export function formatContestTime(value: string) {
  const normalized = value && value.length === 5 ? `${value}:00` : value;
  return value
    ? new Date(`2000-01-01T${normalized}Z`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : "a time to be announced";
}

export function fillContestMessage(template: string, values: {
  name: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  round: string;
}) {
  return template
    .replaceAll("{name}", values.name)
    .replaceAll("{title}", values.title)
    .replaceAll("{venue}", values.venue)
    .replaceAll("{date}", values.date)
    .replaceAll("{time}", values.time)
    .replaceAll("{round}", values.round);
}

export async function getCurrentContestSettings(db: D1Database, today = tampaNow().date) {
  const row = await db.prepare(`SELECT * FROM contest_settings WHERE id = 1`).first<ContestSettingsRow>();
  if (!row) return null;

  let eventDate = row.event_date;
  let currentRound = Number(row.current_round || 1);
  const weeklyRounds = Math.max(1, Number(row.weekly_rounds || 4));
  while (eventDate && eventDate < today && currentRound <= weeklyRounds) {
    eventDate = addContestDays(eventDate, 7);
    currentRound += 1;
  }

  if (eventDate !== row.event_date || currentRound !== Number(row.current_round)) {
    await db.prepare(`
      UPDATE contest_settings
      SET event_date = ?, current_round = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).bind(eventDate, currentRound).run();
  }

  return { ...row, event_date: eventDate, current_round: currentRound, weekly_rounds: weeklyRounds };
}
