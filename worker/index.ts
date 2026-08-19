import {
  contestRoundLabel,
  fillContestMessage,
  formatContestDate,
  formatContestTime,
  getCurrentContestSettings,
  tampaNow,
} from "../functions/lib/contest-schedule";

export interface Env {
  DB: D1Database;
  GUEST_LIST_CACHE: KVNamespace;
  guest_followups: Queue;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_FROM_NUMBER: string;
  RESEND_API_KEY?: string;
  PROMOTER_EMAIL_FROM?: string;
}

type PromoterAccountEmail = {
  kind: "promoter_account_email";
  to: string;
  subject: string;
  text: string;
  html: string;
};

type OverwatchRequest = {
  protocol?: string;
  capability?: string;
  system?: string;
  window?: "today" | "24h" | "7d" | "30d";
  query?: unknown;
};

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function startDateFor(window: string) {
  const today = tampaNow().date;
  if (window === "30d") return shiftDate(today, -29);
  if (window === "7d") return shiftDate(today, -6);
  if (window === "24h") return shiftDate(today, -1);
  return today;
}

async function overwatchSummary(env: Env, body: OverwatchRequest) {
  const window = ["today", "24h", "7d", "30d"].includes(String(body.window || ""))
    ? String(body.window)
    : "today";
  const startDate = startDateFor(window);

  const [summary, promoters, recent] = await Promise.all([
    env.DB.prepare(`
      SELECT
        COUNT(g.id) AS registrations,
        COALESCE(SUM(g.party_size), 0) AS party_size,
        COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in,
        COALESCE(SUM(CASE WHEN g.status != 'checked_in' THEN 1 ELSE 0 END), 0) AS waiting
      FROM guests g
      JOIN venues v ON v.id = g.venue_id
      WHERE v.slug = 'scores-tampa'
        AND COALESCE(g.event_date, substr(g.created_at, 1, 10)) >= ?1
    `).bind(startDate).first<any>(),
    env.DB.prepare(`
      SELECT p.name, p.slug,
        COUNT(g.id) AS registrations,
        COALESCE(SUM(CASE WHEN g.status = 'checked_in' THEN 1 ELSE 0 END), 0) AS checked_in
      FROM promoters p
      JOIN venues v ON v.id = p.venue_id
      LEFT JOIN guests g ON g.promoter_id = p.id
        AND COALESCE(g.event_date, substr(g.created_at, 1, 10)) >= ?1
      WHERE v.slug = 'scores-tampa' AND p.active = 1
      GROUP BY p.id, p.name, p.slug
      ORDER BY registrations DESC, p.name ASC
    `).bind(startDate).all<any>(),
    env.DB.prepare(`
      SELECT g.id, g.name, g.party_size, g.status, g.created_at,
        g.checked_in_at, p.name AS promoter_name, p.slug AS promoter_slug
      FROM guests g
      JOIN venues v ON v.id = g.venue_id
      JOIN promoters p ON p.id = g.promoter_id
      WHERE v.slug = 'scores-tampa'
        AND COALESCE(g.event_date, substr(g.created_at, 1, 10)) >= ?1
      ORDER BY g.id DESC
      LIMIT 10
    `).bind(startDate).all<any>(),
  ]);

  const registrations = Number(summary?.registrations || 0);
  const checkedIn = Number(summary?.checked_in || 0);
  const partySize = Number(summary?.party_size || 0);
  const waiting = Number(summary?.waiting || 0);
  const conversion = registrations ? Number(((checkedIn / registrations) * 100).toFixed(1)) : 0;
  const promoterRows = promoters.results || [];

  return {
    ok: true,
    data: {
      source: "scores-guest-list-d1",
      asOf: new Date().toISOString(),
      metrics: {
        contacts: registrations,
        calls: 0,
        appointments: checkedIn,
        pipelineValue: partySize,
        registrations,
        checkedIn,
        partySize,
        waiting,
        promoters: promoterRows.length,
        conversionPercentage: conversion,
      },
      pipeline: { Registered: waiting, "Checked In": checkedIn },
      alerts: [],
      activity: (recent.results || []).map((row: any) => ({
        id: `guest_${row.id}`,
        title: `${row.name || "Guest"} · party of ${Number(row.party_size || 1)}`,
        detail: `${row.status === "checked_in" ? "Checked in" : "Registered"} · ${row.promoter_name || row.promoter_slug || "promoter"}`,
        at: row.checked_in_at || row.created_at || null,
      })),
      promoterBreakdown: promoterRows.map((row: any) => ({
        name: row.name,
        slug: row.slug,
        registrations: Number(row.registrations || 0),
        checkedIn: Number(row.checked_in || 0),
      })),
      links: {},
      window,
    },
  };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/overwatch") {
      const body = await request.json().catch(() => ({})) as OverwatchRequest;
      if (body.protocol !== "eila-connect/1") {
        return Response.json({ ok: false, error: "EILA_CONNECT_PROTOCOL_REQUIRED" }, { status: 400 });
      }
      if (body.system && body.system !== "guest-list") {
        return Response.json({ ok: false, error: "EILA_CONNECT_SYSTEM_MISMATCH" }, { status: 400 });
      }
      try {
        return Response.json(await overwatchSummary(env, body));
      } catch (error) {
        console.error("Guest List Overwatch read failed", error);
        return Response.json({ ok: false, error: "GUEST_LIST_OVERWATCH_READ_FAILED" }, { status: 500 });
      }
    }

    return Response.json({
      ok: true,
      worker: "guest-list-worker",
      overwatch: true,
    });
  },

  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      const guest = message.body as any;

      if (guest.kind === "promoter_account_email") {
        const email = guest as PromoterAccountEmail;
        const apiKey = env.RESEND_API_KEY?.trim() ?? "";
        const from = env.PROMOTER_EMAIL_FROM?.trim() ?? "";
        if (!apiKey || !from) {
          console.error("promoter email delivery is not configured", { to: email.to });
          message.retry({ delaySeconds: 300 });
          continue;
        }
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": `promoter-account-${message.id}`,
            },
            body: JSON.stringify({
              from,
              to: [email.to],
              subject: email.subject,
              text: email.text,
              html: email.html,
            }),
          });
          if (!response.ok) {
            throw new Error(`Resend returned HTTP ${response.status}`);
          }
          message.ack();
        } catch (error) {
          console.error("promoter account email delivery failed", { to: email.to, error });
          message.retry({ delaySeconds: 60 });
        }
        continue;
      }

      if (!guest.smsOptIn) {
        message.ack();
        continue;
      }

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              btoa(
                `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
              ),
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: env.TWILIO_FROM_NUMBER,
            To: guest.phone,
            Body: guest.messageBody ??
              "You're confirmed on the Scores Tampa guest list.",
          }),
        },
      );

      message.ack();
    }
  },

  async scheduled(_controller: ScheduledController, env: Env) {
    const now = tampaNow();
    const settings = await getCurrentContestSettings(env.DB, now.date);
    if (!settings || settings.event_date !== now.date || now.hour < 12) return;

    const entries = await env.DB.prepare(`
      SELECT id, name, phone
      FROM contest_entries
      WHERE status = 'approved'
        AND sms_opt_in = 1
        AND assigned_event_date = ?
      ORDER BY id
    `).bind(now.date).all<{ id: number; name: string; phone: string }>();

    for (const entry of entries.results || []) {
      const reserved = await env.DB.prepare(`
        INSERT OR IGNORE INTO contest_sms_notifications (
          entry_id, notification_type, event_date
        ) VALUES (?, 'day_of_reminder', ?)
      `).bind(entry.id, now.date).run();
      if (Number(reserved.meta.changes || 0) === 0) continue;

      const messageBody = fillContestMessage(settings.reminder_message, {
        name: entry.name,
        title: settings.title,
        venue: settings.venue_name,
        date: formatContestDate(settings.event_date),
        time: formatContestTime(settings.event_time),
        round: contestRoundLabel(settings.current_round, settings.weekly_rounds),
      });

      try {
        await env.guest_followups.send({
          phone: entry.phone,
          name: entry.name,
          smsOptIn: true,
          messageBody,
        });
      } catch (error) {
        await env.DB.prepare(`
          DELETE FROM contest_sms_notifications
          WHERE entry_id = ?
            AND notification_type = 'day_of_reminder'
            AND event_date = ?
        `).bind(entry.id, now.date).run();
        throw error;
      }
    }
  },
};
