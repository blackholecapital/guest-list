import qrcode from "qrcode-generator";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getDemoSession } from "./auth";
import { promoterColor } from "./promoter-theme";
import { api, Shell } from "./pages";

type VipService = {
  id: number;
  slot: number;
  name: string;
  description: string;
  regularPriceCents: number;
  regularPrice?: string;
  discountPercent: number;
  quotedPriceCents?: number;
  active?: boolean;
  imageUrl: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function qrDataUrl(url: string) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  return qr.createDataURL(8, 16);
}

export function VipServicePage({ promoterSlug }: { promoterSlug: string }) {
  const session = getDemoSession();
  const isPromoter = session?.role === "promoter" && session.promoterSlug === promoterSlug;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  useEffect(() => {
    void api<any>(`/api/vip-services?promoterSlug=${encodeURIComponent(promoterSlug)}`).then(result => {
      if ("error" in result) { setError(result.error.message); return; }
      setData(result.data);
      const first = result.data?.services?.[0];
      if (first) setSelectedId(Number(first.id));
    });
  }, [promoterSlug]);

  const services: VipService[] = data?.services ?? [];
  const selected = services.find(service => service.id === selectedId) ?? services[0];
  const vipUrl = `${window.location.origin}/vip/${promoterSlug}`;
  const qrImage = useMemo(() => qrDataUrl(vipUrl), [vipUrl]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true); setError(""); setConfirmation(null);
    try {
      const result = await api<any>("/api/vip-register", {
        method: "POST",
        body: JSON.stringify({ promoterSlug, serviceId: selected.id, name, phone, partySize, smsOptIn }),
      });
      if ("error" in result) { setError(result.error.message); return; }
      setConfirmation(result.data);
      setName(""); setPhone("");
    } catch {
      setError("Your VIP request could not be completed. Please try again.");
    } finally { setSubmitting(false); }
  }

  if (error && !data) return <Shell compact={!isPromoter}><main className="page narrow centered"><section className="hero-card expired-pass-card"><p className="eyebrow">VIP Services</p><h1>{error}</h1></section></main></Shell>;
  if (!data) return <Shell compact={!isPromoter}><main className="page narrow centered"><section className="hero-card"><h1>Loading VIP services...</h1></section></main></Shell>;
  if (!data.enabled || services.length === 0) return <Shell compact={!isPromoter}><main className="page narrow centered"><section className="hero-card expired-pass-card"><p className="eyebrow">VIP Services</p><h1>VIP offers are currently paused.</h1><p className="muted">Contact your promoter for current availability.</p></section></main></Shell>;

  return (
    <Shell compact={!isPromoter}>
      <main className="page wide vip-public-page">
        <header className="vip-public-heading">
          <p className="eyebrow">Scores Tampa · Promoter {data.promoter?.name}</p>
          <h1>Own the night.</h1>
          <p>Choose your VIP experience, reserve your guest-list entry, and let our host team know you are coming.</p>
        </header>

        {isPromoter && (
          <section className="data-card vip-share-card" style={{ borderColor: promoterColor(promoterSlug) }}>
            <div className="vip-share-qr"><img src={qrImage} alt={`${data.promoter?.name} VIP services QR code`} /></div>
            <div><p className="eyebrow">Your permanent VIP link</p><h2>Scan, screenshot, or enter the guest below</h2><a href={vipUrl}>{vipUrl}</a><small>This VIP QR never uses your regular guest passes.</small></div>
          </section>
        )}

        <div className="vip-public-layout">
          <section className="vip-offer-showcase">
            <img src={selected?.imageUrl} alt={selected?.name ?? "VIP service"} />
            <div className="vip-offer-overlay">
              <span className="vip-star">★ VIP</span>
              <h2>{selected?.name}</h2>
              <p>{selected?.description}</p>
              <div className="vip-price-line">
                {selected?.regularPriceCents > 0 && <del>{money(selected.regularPriceCents)}</del>}
                {selected?.quotedPriceCents > 0 && <strong>{money(selected.quotedPriceCents)}</strong>}
                {selected?.discountPercent > 0 && <b>{selected.discountPercent}% OFF</b>}
              </div>
            </div>
          </section>

          <form className="hero-card vip-registration-card" onSubmit={submit}>
            <p className="eyebrow">VIP request</p><h2>Get on the VIP list</h2>
            <label>Choose your experience<select value={selectedId} onChange={event => setSelectedId(Number(event.target.value))}>{services.map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
            <label>Full name<input value={name} maxLength={100} onChange={event => setName(event.target.value)} required /></label>
            <label>Mobile number<input type="tel" value={phone} onChange={event => setPhone(event.target.value)} required /></label>
            <label>Party size<select value={partySize} onChange={event => setPartySize(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
            <label className="sms-opt-in"><input type="checkbox" checked={smsOptIn} onChange={event => setSmsOptIn(event.target.checked)} /><span>Text me my VIP and guest-list confirmation. Message/data rates may apply. Reply STOP to opt out.</span></label>
            <button className="primary-button full" disabled={submitting}>{submitting ? "Confirming VIP..." : "Request VIP Service"}</button>
            <small className="vip-payment-note">This reserves your VIP request and free-cover guest-list entry. Payment is not collected yet; the venue confirms final availability and service.</small>
            {error && <div className="error-box">{error}</div>}
            {confirmation && <div className="success-box"><strong>★ VIP request confirmed</strong><span>{confirmation.service.name} through {confirmation.promoter.name}. Your party is now marked VIP on the guest list.</span>{confirmation.smsQueued && <small>Confirmation text queued.</small>}</div>}
          </form>
        </div>
      </main>
    </Shell>
  );
}

export function VipAdminPage() {
  const [enabled, setEnabled] = useState(false);
  const [services, setServices] = useState<VipService[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [serviceStats, setServiceStats] = useState<any[]>([]);
  const [promoterStats, setPromoterStats] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading VIP services...");
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  async function load() {
    const result = await api<any>("/api/vip-admin");
    if ("error" in result) { setIsError(true); setMessage(result.error.message); return; }
    setEnabled(result.data.enabled === true);
    setServices((result.data.services ?? []).map((service: VipService) => ({ ...service, regularPrice: (service.regularPriceCents / 100).toFixed(2) })));
    setSummary(result.data.summary ?? {}); setServiceStats(result.data.serviceStats ?? []);
    setPromoterStats(result.data.promoterStats ?? []); setRecent(result.data.recent ?? []);
    setMessage(""); setIsError(false);
  }
  useEffect(() => { void load(); }, []);

  function updateService(id: number, key: string, value: unknown) {
    setServices(current => current.map(service => service.id === id ? { ...service, [key]: value } : service));
  }

  async function save() {
    setSaving(true); setMessage(""); setIsError(false);
    const result = await api<any>("/api/vip-admin", { method: "POST", body: JSON.stringify({ enabled, services }) });
    setSaving(false);
    if ("error" in result) { setIsError(true); setMessage(result.error.message); return; }
    setMessage("VIP services saved. Promoter navigation and public links are updated.");
    await load();
  }

  async function upload(serviceId: number, file: File | null) {
    if (!file) return;
    setUploadingId(serviceId); setMessage("");
    const form = new FormData(); form.set("serviceId", String(serviceId)); form.set("image", file);
    try {
      const response = await fetch("/api/vip-service-image", { method: "POST", body: form });
      const result = await response.json() as any;
      if (!response.ok || !result.ok) { setIsError(true); setMessage(result.error?.message ?? "Flyer upload failed."); return; }
      updateService(serviceId, "imageUrl", result.data.imageUrl);
      setMessage("VIP flyer uploaded and published."); setIsError(false);
    } catch {
      setIsError(true); setMessage("The VIP flyer could not be uploaded. Please try again.");
    } finally { setUploadingId(null); }
  }

  return (
    <Shell>
      <main className="page wide vip-admin-page">
        <div className="page-heading"><div><p className="eyebrow">Revenue operations</p><h1>VIP Services</h1><p className="muted">Control the promoter VIP funnel, rotating offers, guest-list upgrades, and attributed leads.</p></div></div>
        <button type="button" role="switch" aria-checked={enabled} className={`feature-switch vip-master-switch ${enabled ? "is-on" : "is-off"}`} onClick={() => setEnabled(current => !current)}>
          <span className="feature-switch-copy"><strong>VIP Services Master Switch</strong><small>{enabled ? "Live: promoters see VIP Services and public links accept registrations." : "Paused: promoter navigation is hidden and public registration is blocked."}</small></span><span className="feature-switch-control"><span className="feature-switch-knob" /></span><span className="feature-switch-status">{enabled ? "On" : "Off"}</span>
        </button>
        {message && <div className={isError ? "error-box" : "success-box"}>{message}</div>}

        <section className="stat-grid vip-stat-grid">
          <article><small>VIP Leads</small><strong>{Number(summary.registrations ?? 0)}</strong></article>
          <article><small>VIP Guests</small><strong>{Number(summary.totalGuests ?? 0)}</strong></article>
          <article><small>Checked In</small><strong>{Number(summary.checkedIn ?? 0)}</strong></article>
          <article><small>Potential Value</small><strong>{money(Number(summary.quotedValueCents ?? 0))}</strong></article>
        </section>

        <section className="vip-admin-offer-grid">
          {services.map(service => (
            <article className={`data-card vip-admin-offer ${service.active ? "is-active" : ""}`} key={service.id}>
              <img src={service.imageUrl} alt={service.name} />
              <div className="vip-admin-offer-head"><div><p className="eyebrow">{service.slot === 1 ? "Primary bottle service" : `Rotating special ${service.slot - 1}`}</p><h2>{service.name}</h2></div><button type="button" role="switch" aria-checked={service.active} className={`mini-toggle ${service.active ? "is-on" : ""}`} onClick={() => updateService(service.id, "active", !service.active)}><span />{service.active ? "On" : "Off"}</button></div>
              <label>Offer name<input maxLength={80} value={service.name} onChange={event => updateService(service.id, "name", event.target.value)} /></label>
              <label>Short description<textarea maxLength={500} rows={4} value={service.description} onChange={event => updateService(service.id, "description", event.target.value)} /></label>
              <div className="vip-price-controls"><label>Regular price<input type="number" min="0" max="100000" step="0.01" value={service.regularPrice} onChange={event => updateService(service.id, "regularPrice", event.target.value)} /></label><label>Discount<select value={service.discountPercent} onChange={event => updateService(service.id, "discountPercent", Number(event.target.value))}>{[0,10,20,30,40,50].map(value => <option value={value} key={value}>{value}% off</option>)}</select></label></div>
              <label className="vip-flyer-upload">Flyer or offer image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingId === service.id} onChange={event => void upload(service.id, event.target.files?.[0] ?? null)} /><small>{uploadingId === service.id ? "Uploading..." : "JPG, PNG, or WebP · maximum 8 MB"}</small></label>
            </article>
          ))}
        </section>
        <div className="admin-form-actions"><button className="primary-button" type="button" disabled={saving || services.length !== 4} onClick={() => void save()}>{saving ? "Saving VIP Services..." : "Save & Publish VIP Services"}</button></div>

        <section className="data-card vip-report-card"><div className="section-heading"><div><p className="eyebrow">Offer performance</p><h2>VIP Leads by Offer</h2></div></div><div className="vip-breakdown-grid">{serviceStats.map(stat => <article key={stat.id}><small>{stat.name}</small><strong>{stat.registrations} leads</strong><span>{stat.totalGuests} guests · {stat.checkedIn} checked in</span><b>{money(stat.quotedValueCents)} potential</b></article>)}</div></section>
        <section className="data-card vip-report-card"><div className="section-heading"><div><p className="eyebrow">Promoter attribution</p><h2>VIP Leads by Promoter</h2></div></div><div className="vip-breakdown-grid">{promoterStats.map(stat => <article key={stat.id} style={{ borderColor: promoterColor(stat.slug) }}><small>{stat.slug}</small><strong>{stat.name}</strong><span>{stat.registrations} leads · {stat.totalGuests} guests · {stat.checkedIn} checked in</span><b>{money(stat.quotedValueCents)} potential</b></article>)}</div></section>
        <section className="data-card vip-report-card"><div className="section-heading"><div><p className="eyebrow">Live VIP pipeline</p><h2>Recent Requests</h2></div></div><div className="vip-recent-list">{recent.length === 0 ? <p className="muted">No VIP requests yet.</p> : recent.map(item => <article key={item.id} style={{ borderLeftColor: promoterColor(item.promoterSlug) }}><div><strong>★ {item.name}</strong><span>{item.phone} · Party {item.partySize}</span></div><div><strong>{item.serviceName}</strong><span>{item.discountPercent}% off · {money(item.quotedPriceCents)}</span></div><div><strong>{item.promoterName}</strong><span>{item.status === "checked_in" ? "Checked in" : "Awaiting arrival"}</span></div></article>)}</div></section>
      </main>
    </Shell>
  );
}
