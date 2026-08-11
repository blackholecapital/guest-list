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
};
