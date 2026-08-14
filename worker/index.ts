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
}

export default {
  async fetch(request: Request) {
    return Response.json({
      ok: true,
      worker: "guest-list-worker",
    });
  },

  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      const guest = message.body as any;

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
