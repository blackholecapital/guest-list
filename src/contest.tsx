import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getDemoSession, logoutDemoAccount } from "./auth";

type ContestSettings = {
  title: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  approvalMessage: string;
};

type Entry = {
  id: number;
  name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
  photo_ids: number[];
};

const fallbackSettings: ContestSettings = {
  title: "$1K Lingerie Contest",
  eventDate: "2026-08-19",
  eventTime: "",
  venueName: "Scores Tampa",
  venueAddress: "2310 N Dale Mabry Hwy, Tampa, FL 33607",
  approvalMessage: "Congratulations, {name}! You've been selected for the {title} at {venue} on {date} at {time}. Reply STOP to opt out.",
};

async function jsonApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json() as { ok: boolean; data?: T; error?: { message: string } };
  if (!response.ok || !body.ok || !body.data) throw new Error(body.error?.message || "Request failed.");
  return body.data;
}

function campaignStartLabel(settings: ContestSettings) {
  const eventDate = settings.eventDate || fallbackSettings.eventDate;
  const date = new Date(`${eventDate}T12:00:00`);
  const day = date.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : day % 10 === 1 ? "st" : day % 10 === 2 ? "nd" : day % 10 === 3 ? "rd" : "th";
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${weekday}, ${month} ${day}${suffix}`;
}

function withContestDefaults(settings: ContestSettings) {
  return {
    ...fallbackSettings,
    ...settings,
    eventDate: settings.eventDate || fallbackSettings.eventDate,
  };
}

function ContestHeader({ admin = false }: { admin?: boolean }) {
  const session = getDemoSession();
  return <header className="contest-topbar">
    <a href={admin ? "/stats" : "/contest"} className="brand">
      <img className="brand-logo" src="/assets/scores-logo.png" alt="Scores Tampa" />
      <span className="brand-copy"><strong>Scores Tampa</strong><small>{admin ? "Contest Admin" : "Lingerie Contest"}</small></span>
    </a>
    {admin && session && <nav><a href="/guest-list">Guest List</a><a href="/stats">Stats</a><a href="/admin">Admin</a><button className="nav-logout" onClick={logoutDemoAccount}>Log Out</button></nav>}
  </header>;
}

function ContestFlyer({ className = "" }: { className?: string }) {
  return <div className={`contest-flyer-wrap ${className}`.trim()}>
    <img
      src="/assets/scores-lingerie-contest-flyer-v2.jpeg"
      alt="$1K Lingerie Contest at Scores Tampa — weekly $300 contests followed by a $1,000 finale"
    />
  </div>;
}

export function ContestEventPage() {
  const [settings, setSettings] = useState(fallbackSettings);

  useEffect(() => {
    void jsonApi<{ settings: ContestSettings }>("/api/contest-settings")
      .then(response => setSettings(withContestDefaults(response.settings)))
      .catch(() => {});
  }, []);

  return <div className="contest-shell contest-event-shell">
    <ContestHeader />
    <main className="contest-event-page">
      <section className="contest-event-hero">
        <div className="contest-stage-glow" />
        <ContestFlyer className="contest-event-flyer" />
        <div className="contest-event-intro">
          <p className="contest-neon-kicker">Open to all women · No experience necessary</p>
          <h1><span className="contest-chrome">The $1K Lingerie</span><span className="contest-script">Contest</span></h1>
          <p className="contest-start-banner"><span aria-hidden="true">📅</span> Starting {campaignStartLabel(settings)}</p>
          <p className="contest-event-lead"><strong>The $1K Lingerie Contest is about to begin!</strong> We’re hosting an amateur lingerie contest at Scores Tampa. Think you’ve got what it takes? Come show us!</p>
          <a className="contest-register-cta" href="/contest/register">Register now <span>→</span></a>
          <small><span aria-hidden="true">📲</span> Register using the link. Once registered, you’ll receive a text or email confirmation with your details.</small>
        </div>
      </section>

      <section className="contest-event-details">
        <div className="contest-copy-card contest-copy-wide">
          <p className="eyebrow"><span aria-hidden="true">🏆</span> Every Wednesday — one winner!</p>
          <h2>Bring the energy. Win the room.</h2>
          <p>Each week, contestants will be judged based on crowd participation, one secret judge, and one member of Scores management. Bring your friends—the crowd matters.</p>
        </div>
        <div className="contest-copy-card contest-weekly-prize">
          <span className="contest-card-icon">💵</span>
          <p className="eyebrow">Weekly winner gets</p>
          <h3>$300 cash + a bar tab</h3>
          <p>Celebrate the win! <span aria-hidden="true">🍾🥂</span></p>
        </div>
        <div className="contest-copy-card contest-finale-prize">
          <span className="contest-card-icon">🏆</span>
          <p className="eyebrow">Grand finale</p>
          <h3>Top four face off</h3>
          <p>After we crown our top four weekly winners, they’ll compete in the Grand Finale.</p>
          <div className="contest-medal-prizes"><strong><span aria-hidden="true">🥇</span> 1st place — $1,000 cash</strong><strong><span aria-hidden="true">🥈</span> 2nd place — $250 cash</strong></div>
        </div>
        <div className="contest-judging-card">
          <p className="eyebrow">How judging works</p>
          <div><span aria-hidden="true">👑</span><strong>Crowd participation</strong><small>Bring your friends and own the room.</small></div>
          <div><span aria-hidden="true">🕵️</span><strong>One secret judge</strong><small>One anonymous judge scores every contestant.</small></div>
          <div><span aria-hidden="true">⭐</span><strong>One member of management</strong><small>One Scores management vote completes the panel.</small></div>
        </div>
      </section>

      <section className="contest-event-close">
        <p className="contest-neon-kicker">Ladies… who could use some extra cash? <span aria-hidden="true">👀💋</span></p>
        <h2>Sign up. Bring your friends.<br />Work the crowd. <span className="contest-crown-line">Take the crown. <span className="contest-crown-icon" aria-hidden="true">👑</span></span></h2>
        <a className="contest-register-cta" href="/contest/register">Enter the contest <span>→</span></a>
        <p className="contest-register-prompt"><span aria-hidden="true">👇</span> Register at the link below! <span aria-hidden="true">👇</span></p>
        <div className="contest-event-meta"><p><span aria-hidden="true">📍</span> Scores Tampa</p><p><span aria-hidden="true">📅</span> Starting {campaignStartLabel(settings)}</p></div>
        <div className="contest-venue contest-event-venue"><strong>Scores Tampa</strong><span>2310 N Dale Mabry Hwy, Tampa, FL 33607</span><a href="tel:+18138757912">813-875-7912</a></div>
      </section>
    </main>
  </div>;
}

export function ContestEntryPage() {
  const [settings, setSettings] = useState(fallbackSettings);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [photoNames, setPhotoNames] = useState<string[]>([]);

  useEffect(() => { void jsonApi<{ settings: ContestSettings }>("/api/contest-settings").then(r => setSettings(withContestDefaults(r.settings))).catch(() => {}); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError("");
    const form = event.currentTarget;
    try {
      await jsonApi("/api/contest-entry", { method: "POST", body: new FormData(form) });
      setSuccess(true); form.reset(); setPhotoNames([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Entry could not be submitted."); }
    finally { setSubmitting(false); }
  }

  return <div className="contest-shell">
    <ContestHeader />
    <main className="contest-entry-page">
      <section className="contest-promo-panel">
        <div className="contest-stage-glow" />
        <ContestFlyer />
        <div className="contest-promo-copy">
          <a className="contest-back-link" href="/contest">← Event details</a>
          <p className="contest-neon-kicker">Official registration</p>
          <h1><span className="contest-chrome">$1K Lingerie</span><span className="contest-script">Contest</span></h1>
          <p className="contest-start-banner"><span aria-hidden="true">📅</span> Starting {campaignStartLabel(settings)}</p>
          <div className="contest-prize-path" aria-label="Contest format">
            <span><strong>💵 $300</strong> Weekly winner + bar tab 🍾🥂</span>
            <i>→</i>
            <span><strong>🏆 $1,000</strong> Grand finale winner 👑</span>
          </div>
          <p>Open to all women. No experience necessary. One winner every Wednesday, with the top four weekly winners advancing to the grand finale.</p>
          <div className="contest-venue"><strong>{settings.venueName}</strong><span>{settings.venueAddress}</span><a href="tel:+18138757912">813-875-7912</a></div>
        </div>
      </section>

      <section className="contest-form-panel">
        {success ? <div className="contest-success"><span>✓</span><p className="eyebrow">Entry received</p><h2>You’re officially in the running.</h2><p>Our team will review your submission and follow up by text or email with your contest details.</p><button className="secondary-button" onClick={() => setSuccess(false)}>Submit another entry</button></div> : <>
          <div className="contest-form-prize"><span>$1,000</span><small>Championship prize</small></div>
          <p className="eyebrow">Enter the contest</p><h2>Take your shot.</h2><p className="muted">All contestants must be 21 or older. Your photos are private and available only to authorized contest staff.</p>
          <form className="contest-form" onSubmit={submit}>
            <label>Full name<input name="name" autoComplete="name" required minLength={2} /></label>
            <div className="contest-field-row"><label>Phone number<input name="phone" type="tel" autoComplete="tel" required /></label><label>Email address<input name="email" type="email" autoComplete="email" required /></label></div>
            <label>Date of birth<input name="dateOfBirth" type="date" required /></label>
            <label className="contest-upload">Photos <small>Upload 1–3 clear photos · JPG, PNG, or WebP · 8 MB each</small><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={e => { const files = Array.from(e.target.files || []).slice(0, 3); if ((e.target.files?.length || 0) > 3) e.target.value = ""; setPhotoNames(files.map(f => f.name)); }} /><span>{photoNames.length ? `${photoNames.length} photo${photoNames.length === 1 ? "" : "s"} selected` : "Choose photos"}</span></label>
            <label className="contest-check"><input name="ageConfirmed" type="checkbox" value="yes" required /><span>I confirm that I am at least 21 years old and that the submitted photos are of me.</span></label>
            <label className="contest-check"><input name="smsOptIn" type="checkbox" value="yes" /><span>I agree to receive contest updates by SMS. Message and data rates may apply. Reply STOP to opt out.</span></label>
            {error && <div className="error-box">{error}</div>}
            <button className="primary-button full" disabled={submitting}>{submitting ? "Submitting…" : "Submit my entry"}</button>
          </form>
        </>}
      </section>
    </main>
  </div>;
}

export function ContestAdminPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState(fallbackSettings);
  const [filter, setFilter] = useState<"all" | Entry["status"]>("all");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try { const data = await jsonApi<{ entries: Entry[]; settings: ContestSettings }>("/api/contest"); setEntries(data.entries); setSettings(data.settings); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not load contest entries."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const shown = useMemo(() => entries.filter(e => filter === "all" || e.status === filter), [entries, filter]);

  async function review(id: number, status: "approved" | "denied") {
    setEntries(current => current.map(e => e.id === id ? { ...e, status } : e));
    try { const data = await jsonApi<{ smsQueued: boolean }>("/api/contest-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); setMessage(status === "approved" ? `Applicant approved${data.smsQueued ? " and SMS queued." : "."}` : "Applicant declined."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Review could not be saved."); void load(); }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await jsonApi("/api/contest-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); setMessage("Contest date, time, and approval message saved."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Settings could not be saved."); }
    finally { setSaving(false); }
  }

  const counts = { all: entries.length, pending: entries.filter(e => e.status === "pending").length, approved: entries.filter(e => e.status === "approved").length, denied: entries.filter(e => e.status === "denied").length };
  return <div className="contest-admin-shell"><ContestHeader admin /><main className="page wide contest-admin-page">
    <div className="page-heading"><div><p className="eyebrow">Applications</p><h1>Lingerie Contest</h1><p className="muted">Review applicants, view photos, and manage the event invitation.</p></div><div className="contest-admin-links"><a className="secondary-button" href="/contest" target="_blank">Event page ↗</a><a className="secondary-button" href="/contest/register" target="_blank">Registration ↗</a></div></div>
    <form className="contest-settings-card" onSubmit={saveSettings}><div><p className="eyebrow">Event settings</p><h2>Contest details</h2></div><label>Event title<input value={settings.title} onChange={e => setSettings({ ...settings, title: e.target.value })} required /></label><label>Date<input type="date" value={settings.eventDate} onChange={e => setSettings({ ...settings, eventDate: e.target.value })} /></label><label>Time<input type="time" value={settings.eventTime} onChange={e => setSettings({ ...settings, eventTime: e.target.value })} /></label><label className="contest-message-field">Approval SMS<textarea rows={3} value={settings.approvalMessage} onChange={e => setSettings({ ...settings, approvalMessage: e.target.value })} /><small>Variables: {"{name}"}, {"{title}"}, {"{venue}"}, {"{date}"}, {"{time}"}</small></label><button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save event"}</button></form>
    {message && <div className="notice-box">{message}</div>}
    <div className="contest-filter-row">{(["all", "pending", "approved", "denied"] as const).map(key => <button key={key} className={`filter-pill ${filter === key ? "is-active" : ""}`} onClick={() => setFilter(key)}>{key[0].toUpperCase()+key.slice(1)} ({counts[key]})</button>)}</div>
    <section className="contest-entry-grid">{shown.map(entry => <article className="contest-entry-card" key={entry.id}><div className="contest-entry-heading"><div><span className="contest-avatar">{entry.name.slice(0,1).toUpperCase()}</span><div><h3>{entry.name}</h3><small>Applied {new Date(entry.created_at).toLocaleString()}</small></div></div><span className={`contest-status ${entry.status}`}>{entry.status}</span></div><div className="contest-photo-strip">{entry.photo_ids.map((id, index) => <a key={id} href={`/api/contest-photo?id=${id}`} target="_blank"><img src={`/api/contest-photo?id=${id}`} alt={`${entry.name} submission ${index+1}`} /></a>)}</div><dl><div><dt>Phone</dt><dd><a href={`tel:${entry.phone}`}>{entry.phone}</a></dd></div><div><dt>Email</dt><dd><a href={`mailto:${entry.email}`}>{entry.email}</a></dd></div><div><dt>Date of birth</dt><dd>{new Date(`${entry.date_of_birth}T12:00:00`).toLocaleDateString()}</dd></div></dl><div className="contest-card-actions"><a href={`tel:${entry.phone}`}>Call</a><a href={`sms:${entry.phone}`}>Text</a><a href={`mailto:${entry.email}`}>Email</a><button className="contest-deny" onClick={() => void review(entry.id, "denied")} aria-label={`Decline ${entry.name}`}>✕ Deny</button><button className="contest-approve" onClick={() => void review(entry.id, "approved")} aria-label={`Approve ${entry.name}`}>✓ Approve</button></div></article>)}</section>
    {!shown.length && <div className="contest-empty"><h3>No {filter === "all" ? "" : filter} entries yet</h3><p>New applications will appear here automatically.</p></div>}
  </main></div>;
}
