import type { Env } from "./api";

export type ReportingRange = "today" | "week" | "month" | "all";

export type ReportingWindow = {
  range: ReportingRange;
  anchorDate: string;
  startDate: string | null;
  endDate: string | null;
  startUtc: string | null;
  endUtc: string | null;
  label: string;
  weeklyResetDay: number;
};

const TIME_ZONE = "America/New_York";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function tampaDate(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function zonedMidnightUtc(date: string): string {
  const guess = new Date(`${date}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(guess);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  const offset = representedAsUtc - guess.getTime();
  return new Date(guess.getTime() - offset).toISOString().slice(0, 19).replace("T", " ");
}

function prettyDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function reportingWindow(request: Request, env: Env): Promise<ReportingWindow> {
  const url = new URL(request.url);
  const requestedRange = url.searchParams.get("range");
  const range: ReportingRange = requestedRange === "today" || requestedRange === "month" || requestedRange === "all"
    ? requestedRange
    : "week";
  const requestedDate = url.searchParams.get("date") ?? "";
  const anchorDate = DATE_PATTERN.test(requestedDate) ? requestedDate : tampaDate();
  const venue = await env.DB.prepare(`
    SELECT weekly_reset_day
    FROM venues
    WHERE slug = 'scores-tampa'
    LIMIT 1
  `).first<{ weekly_reset_day: number }>();
  const weeklyResetDay = Number.isInteger(venue?.weekly_reset_day)
    ? Math.min(Math.max(Number(venue?.weekly_reset_day), 0), 6)
    : 1;

  if (range === "all") {
    return { range, anchorDate, startDate: null, endDate: null, startUtc: null, endUtc: null, label: "All time", weeklyResetDay };
  }

  let startDate = anchorDate;
  let endDate = addDays(anchorDate, 1);
  if (range === "week") {
    const offset = (dayOfWeek(anchorDate) - weeklyResetDay + 7) % 7;
    startDate = addDays(anchorDate, -offset);
    endDate = addDays(startDate, 7);
  } else if (range === "month") {
    startDate = `${anchorDate.slice(0, 7)}-01`;
    const first = new Date(`${startDate}T12:00:00Z`);
    first.setUTCMonth(first.getUTCMonth() + 1);
    endDate = first.toISOString().slice(0, 10);
  }

  const label = range === "today"
    ? prettyDate(startDate)
    : `${prettyDate(startDate)} – ${prettyDate(addDays(endDate, -1))}`;

  return {
    range,
    anchorDate,
    startDate,
    endDate,
    startUtc: zonedMidnightUtc(startDate),
    endUtc: zonedMidnightUtc(endDate),
    label,
    weeklyResetDay,
  };
}

export function sqlWindow(column: string, window: ReportingWindow) {
  return window.startUtc && window.endUtc
    ? { clause: ` AND ${column} >= ? AND ${column} < ?`, values: [window.startUtc, window.endUtc] }
    : { clause: "", values: [] as string[] };
}

export function sqlDateWindow(column: string, window: ReportingWindow) {
  return window.startDate && window.endDate
    ? { clause: ` AND ${column} >= ? AND ${column} < ?`, values: [window.startDate, window.endDate] }
    : { clause: "", values: [] as string[] };
}
