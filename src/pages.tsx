import VipPackages from "./VipPackages";
import { promoterColor } from "./promoter-theme";
import qrcode from "qrcode-generator";
import {
  LOGIN_ACCOUNTS,
  getDemoSession,
  landingPath,
  loginDemoAccount,
  logoutDemoAccount,
} from "./auth";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type ApiSuccess<T> = {
  ok: true;
  data: T;
};

type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const VENUE = {
  name: "Scores Tampa",
  address: "2310 N. Dale Mabry Highway, Tampa, Florida 33607",
  phone: "(813) 875-7912",
  hours: [
    ["Sunday", "6:00 PM – 3:00 AM"],
    ["Monday", "6:00 PM – 3:00 AM"],
    ["Tuesday", "6:00 PM – 3:00 AM"],
    ["Wednesday", "6:00 PM – 3:00 AM"],
    ["Thursday", "6:00 PM – 3:00 AM"],
    ["Friday", "6:00 PM – 3:00 AM"],
    ["Saturday", "6:00 PM – 3:00 AM"],
  ],
  promoters: [
    { id: 1, name: "Blue", slug: "blue" },
    { id: 2, name: "Red", slug: "red" },
    { id: 3, name: "Yellow", slug: "yellow" },
  ],
};

type DemoGuest = {
  id: number;
  name: string;
  phone: string;
  promoterName: string;
  promoterSlug: string;
  partySize: number;
  registeredAt: string;
  status: "checked_in" | "pending" | "flagged";
  checkedInAt: string | null;
  flagReason: string | null;
  locationException?: boolean;
  confirmationCode?: string | null;
};

const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(VENUE.address)}`;
const TEL_URL = "tel:+18138757112";

const DEMO_GUESTS: DemoGuest[] = [];

const DEMO_STATS = {
  summary: {
    totalRegistrations: 0,
    totalPartySize: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    conversionPercentage: 0,
  },
  promoters: [
    {
      promoterId: 1,
      promoterName: "Blue",
      promoterSlug: "blue",
      registrations: 0,
      totalPartySize: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      redFlags: 0,
      conversionPercentage: 0,
    },
    {
      promoterId: 2,
      promoterName: "Red",
      promoterSlug: "red",
      registrations: 0,
      totalPartySize: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      redFlags: 0,
      conversionPercentage: 0,
    },
    {
      promoterId: 3,
      promoterName: "Yellow",
      promoterSlug: "yellow",
      registrations: 0,
      totalPartySize: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      redFlags: 0,
      conversionPercentage: 0,
    },
  ],
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateInputValue(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function promoterQrDataUrl(slug: string) {
  const qr = qrcode(0, "M");
  qr.addData(`${window.location.origin}/p/${slug}`);
  qr.make();
  return qr.createDataURL(8, 16);
}

async function api<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const body = await response.json() as ApiResponse<T>;

  if (!response.ok && body.ok) {
    return {
      ok: false,
      error: {
        code: "REQUEST_FAILED",
        message: "Request failed.",
      },
    };
  }

  return body;
}

function Shell({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  const session = getDemoSession();

  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="/" className="brand">
          <img
            className="brand-logo"
            src="/assets/scores-logo.png"
            alt="Scores Tampa"
          />
          <span className="brand-copy">
            <strong>Scores Tampa</strong>
            <small>Guest List</small>
          </span>
        </a>

        {!compact && session && (
          <nav>
            {(session.role === "door" || session.role === "admin") && (
              <a href="/guest-list">Guest List</a>
            )}
            {session.role === "admin" && <a href="/stats">Stats</a>}
            {session.role === "admin" && <a href="/promoters">Promoters</a>}
            {session.role === "admin" && <a href="/contest-admin">Contest</a>}
            {session.role === "promoter" && (
              <a href={`/promoter/${session.promoterSlug}`}>My QR Codes</a>
            )}
            {session.role === "admin" && <a href="/admin">Admin</a>}
            <button
              className="nav-logout"
              type="button"
              onClick={logoutDemoAccount}
            >
              Log Out
            </button>
          </nav>
        )}
      </header>

      {children}

      <footer
        style={{
          marginTop: 60,
          padding: "30px 20px",
          textAlign: "center",
          borderTop: "1px solid #333",
          color: "#999"
        }}
      >
        <img
          src="/assets/scores-logo.png"
          alt="Scores Tampa"
          style={{height:50,marginBottom:12}}
        />

        <div style={{marginBottom:10}}>
          Scores Tampa<br/>
          2310 N Dale Mabry Highway<br/>
          Tampa, FL 33607<br/>
          (813) 875-7912
        </div>

        <div>
          <a href="/privacy.html">Privacy Policy</a>
          {" | "}
          <a href="/terms.html">Terms & Conditions</a>
        </div>

      </footer>

    </div>
  );
}

export function LoginPage() {
  const existingSession = getDemoSession();
  const [username, setUsername] = useState(LOGIN_ACCOUNTS[0].username);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setSigningIn(true);

    try {
      const session = await loginDemoAccount(username, password);
      if (!session) {
        setMessage("The selected user and password do not match.");
        return;
      }

      window.location.assign(landingPath(session));
    } catch {
      setMessage("The selected user and password do not match.");
    } finally {
      setSigningIn(false);
    }
  }

  if (existingSession) {
    window.location.replace(landingPath(existingSession));
    return null;
  }

  return (
    <Shell compact>
      <main className="page narrow centered login-page">
        <section className="hero-card login-card">
          <p className="eyebrow">Demo access</p>
          <h1>Sign In</h1>
          <p className="muted">Choose your assigned role to continue.</p>

          <form className="guest-form" onSubmit={handleLogin}>
            <label>
              User
              <select
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value as typeof username);
                  setPassword("");
                  setMessage("");
                }}
              >
                {LOGIN_ACCOUNTS.map((account) => (
                  <option key={account.username} value={account.username}>
                    {account.username}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button className="primary-button full" type="submit" disabled={signingIn}>
              {signingIn ? "Signing In..." : "Sign In"}
            </button>

            {message && <div className="error-box">{message}</div>}
          </form>
        </section>
      </main>
    </Shell>
  );
}

export function PromoterPage({
  promoterSlug,
  qrToken,
}: {
  promoterSlug: string;
  qrToken?: string;
}) {
  const [promoterName, setPromoterName] = useState(promoterSlug);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "locating" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const helpUrl = `/location-help?promoter=${encodeURIComponent(promoterSlug)}${
    qrToken ? `&token=${encodeURIComponent(qrToken)}` : ""
  }`;

  useEffect(() => {
    void api<any>("/api/promoters").then((result) => {
      if ("error" in result || !Array.isArray(result.data?.promoters)) {
        return;
      }

      const promoter = result.data.promoters.find(
        (item: any) => item.slug === promoterSlug,
      );

      if (promoter?.name) {
        setPromoterName(String(promoter.name));
      }
    });
  }, [promoterSlug]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim() || phone.replace(/\D/g, "").length < 10) {
      setStatus("error");
      setMessage("Enter a valid name and phone number.");
      return;
    }

    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Location is not supported on this device.");
      return;
    }

    setStatus("locating");
    setMessage("Checking your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus("submitting");
        setMessage("Adding you to the guest list...");

        const result = await api<{
          guestId: number;
          venue: string;
          promoter: string;
          distanceMeters: number;
          status: string;
        }>("/api/check-in", {
          method: "POST",
          body: JSON.stringify({
            promoterSlug: promoterSlug ?? "",
            qrToken,
            name: name.trim(),
            phone,
            partySize,
            smsOptIn,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }),
        });

        if ("error" in result) {
          setStatus("error");
          setMessage(result.error.message);
          return;
        }

        setStatus("success");
        setMessage(
          `You're on the guest list through ${result.data.promoter}.`,
        );
      },
      (error) => {
        setStatus("error");

        if (error.code === error.PERMISSION_DENIED) {
          setMessage(
            "Location permission is required to join the guest list.",
          );
          return;
        }

        setMessage("We could not verify your location. Try again.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  if (status === "success") {
    return (
      <Shell compact>
        <main className="page narrow centered">
          <section className="hero-card success-card">
            <div className="success-icon">✓</div>
            <p className="eyebrow">You're on the list</p>
            <h1>See you inside.</h1>
            <p>{message}</p>
            <p className="muted">
              Have your phone ready when you reach the door.
            </p>

</section>
        </main>
      </Shell>
    );
  }

  return (
    <Shell compact>
      <main className="page signup-page">
        <section className="hero-card signup-card">
          <div className="signup-form-panel">
            <p className="eyebrow">Guest list access</p>
            <h1>Join Scores Tampa</h1>
            <p className="promoter-label">
              Promoter: <strong>{promoterName}</strong>
            </p>

            <form onSubmit={handleSubmit} className="guest-form">
              <label>
                Full name
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

              <label>
                Phone number
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="(813) 555-1212"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </label>

              <label>
                Party size
                <select
                  value={partySize}
                  onChange={(event) =>
                    setPartySize(Number(event.target.value))
                  }
                >
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(
                    (size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div className="location-note">
                <span aria-hidden="true">⌖</span>
                <div>
                  <p>Location is used to enforce the venue registration rules.</p>
                  <p>
                    Your phone's Location Services must be enabled to use this function.
                  </p>
                  <a className="location-help-link" href={helpUrl}>
                    Having location problems? Click here.
                  </a>
                </div>
              </div>

              <label className="checkbox-row sms-opt-in">
                <input
                  type="checkbox"
                  checked={smsOptIn}
                  onChange={(event) => setSmsOptIn(event.target.checked)}
                />
                <span>
                  Optional SMS updates. By opting in, you agree to receive
                  guest list confirmations and venue updates. Message/data
                  rates may apply.
                </span>
              </label>

              <button
                className="primary-button full"
                type="submit"
                disabled={status === "locating" || status === "submitting"}
              >
                {status === "locating"
                  ? "Checking location..."
                  : status === "submitting"
                    ? "Joining..."
                    : "Join Guest List"}
              </button>

              {message && status === "error" && (
                <div className="error-box">{message}</div>
              )}
            </form>
          </div>

          <aside className="venue-panel" aria-label="Scores Tampa venue details">
            <div>
              <p className="eyebrow">The Scores experience</p>
              <h2>Prime steaks. Fine food. VIP nights.</h2>
              <p className="venue-copy">
                Join the guest list, arrive hungry, and stay for Tampa nightlife
                with a full dinner menu, craft cocktails, and VIP service.
              </p>
            </div>

            <div className="venue-detail-list">
              <a
                className="venue-detail"
                href="https://maps.google.com/?q=2310+N+Dale+Mabry+Highway+Tampa+FL+33607"
                target="_blank"
                rel="noreferrer"
              >
                <span className="venue-icon" aria-hidden="true">◆</span>
                <span>
                  <small>Location</small>
                  <strong>{VENUE.address}</strong>
                </span>
              </a>

              <a className="venue-detail" href={`tel:${VENUE.phone.replace(/\D/g, "")}`}>
                <span className="venue-icon" aria-hidden="true">☎</span>
                <span>
                  <small>Phone</small>
                  <strong>{VENUE.phone}</strong>
                </span>
              </a>

              <div className="venue-detail">
                <span className="venue-icon" aria-hidden="true">◷</span>
                <span>
                  <small>Hours</small>
                  <strong>Open nightly, 6:00 PM – 3:00 AM</strong>
                </span>
              </div>
            </div>

            <a
              className="menu-promo"
              href="https://www.scorestampa.com/menu/"
              target="_blank"
              rel="noreferrer"
              aria-label="View the Scores Tampa dinner menu"
            >
              <span className="menu-promo-icon" aria-hidden="true">✦</span>
              <div>
                <strong>View the full dinner menu</strong>
                <p>Prime cuts, chef-driven entrees, craft cocktails, and more.</p>
              </div>
            </a>
          </aside>
        </section>
      </main>
    </Shell>
  );
}

export function LocationHelpPage() {
  const params = new URLSearchParams(window.location.search);
  const promoterSlug = params.get("promoter")?.trim().toLowerCase() ?? "";
  const qrToken = params.get("token")?.trim() ?? "";
  const [promoterName, setPromoterName] = useState(promoterSlug || "your promoter");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  useEffect(() => {
    if (!promoterSlug) return;
    void api<any>("/api/promoters").then((result) => {
      if ("error" in result || !Array.isArray(result.data?.promoters)) return;
      const promoter = result.data.promoters.find(
        (item: any) => item.slug === promoterSlug,
      );
      if (promoter?.name) setPromoterName(String(promoter.name));
    });
  }, [promoterSlug]);

  async function submitLocationHelp(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await api<any>("/api/location-help", {
        method: "POST",
        body: JSON.stringify({ promoterSlug, qrToken, name, phone, smsOptIn }),
      });
      if ("error" in result) {
        setError(result.error.message);
        return;
      }
      setConfirmation(result.data);
    } catch {
      setError("Location assistance could not add you right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <Shell compact>
        <main className="page narrow centered">
          <section className="hero-card success-card location-help-confirmation">
            <div className="success-icon">✓</div>
            <p className="eyebrow">Location assistance confirmed</p>
            <h1>You're still on the list.</h1>
            <div className="confirmation-code">{confirmation.confirmationCode}</div>
            <p>{confirmation.confirmationText}</p>
            <p className="muted">
              Show this screen or the confirmation text to the door staff.
            </p>
          </section>
        </main>
      </Shell>
    );
  }

  return (
    <Shell compact>
      <main className="page narrow centered location-help-page">
        <section className="hero-card location-help-card">
          <p className="eyebrow">Guest list assistance</p>
          <h1>Having location trouble?</h1>
          <p>
            Sorry you're having issues with Location Services. During beta testing,
            we can still place you on the list through <strong>{promoterName}</strong>.
          </p>

          <div className="notice-box">
            This creates a location-service exception for door staff. It does not
            count as a verified geographic registration.
          </div>

          <form className="guest-form" onSubmit={submitLocationHelp}>
            <label>
              Full name
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label>
              Phone number
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>
            <label className="checkbox-row sms-opt-in">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(event) => setSmsOptIn(event.target.checked)}
              />
              <span>
                Text me the location-help confirmation to show at the door.
                Message/data rates may apply.
              </span>
            </label>
            <button className="primary-button full" disabled={submitting}>
              {submitting ? "Adding you..." : "Join With Location Help"}
            </button>
            {error && <div className="error-box">{error}</div>}
          </form>
        </section>
      </main>
    </Shell>
  );
}

export function GuestListPage() {
  const [guests, setGuests] = useState<DemoGuest[]>(DEMO_GUESTS);
  const [notice, setNotice] = useState<string | null>(
    "Loading live guest-list data...",
  );
  const [filter, setFilter] = useState<"all" | "checked_in" | "pending" | "flagged">("all");
  const [search, setSearch] = useState("");

  const loadGuests = useCallback(async () => {
    try {
      const result = await api<any>("/api/guest-list");

      if ("error" in result) {
        setGuests(DEMO_GUESTS);
        setNotice("Live guest-list data is temporarily unavailable.");
        return;
      }

      const payload = result.data as any;
      const rawGuests = Array.isArray(payload?.guests) ? payload.guests : [];

      if (rawGuests.length === 0) {
        setGuests(DEMO_GUESTS);
        setNotice(null);
        return;
      }

      const mapped: DemoGuest[] = rawGuests.map((guest: any, index: number) => ({
        id: Number(guest.id ?? index + 1),
        name: String(guest.name ?? "Guest"),
        phone: String(guest.phone ?? ""),
        promoterName: String(
          guest.promoter_name ??
          guest.promoter ??
          guest.promoterName ??
          "Promoter",
        ),
        promoterSlug: String(
          guest.promoter_slug ?? guest.promoterSlug ?? "promoter",
        ).toLowerCase(),
        partySize: Number(guest.party_size ?? guest.partySize ?? 1),
        registeredAt: String(
          guest.created_at ??
          guest.createdAt ??
          guest.registeredAt ??
          new Date().toISOString()
        ),
        status:
          guest.status === "checked_in"
            ? "checked_in"
            : guest.status === "flagged"
              ? "flagged"
              : "pending",
        checkedInAt: guest.checkedInAt ?? guest.checked_in_at ?? null,
        flagReason: guest.flagReason ?? guest.exception_reason ?? null,
        locationException: Boolean(guest.location_exception),
        confirmationCode: guest.confirmation_code ?? null,
      }));

      setGuests(mapped);
      setNotice(null);
    } catch {
      setGuests(DEMO_GUESTS);
      setNotice("Live guest-list data is temporarily unavailable.");
    }
  }, []);

  useEffect(() => {






    void loadGuests();
    const timer = window.setInterval(() => {
      void loadGuests();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [loadGuests]);

  const counts = useMemo(() => {
    return {
      all: guests.length,
      checked_in: guests.filter((guest) => guest.status === "checked_in").length,
      pending: guests.filter((guest) => guest.status === "pending").length,
      flagged: guests.filter(
        (guest) => guest.status === "flagged" || guest.locationException,
      ).length,
    };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "flagged"
            ? guest.status === "flagged" || guest.locationException
            : guest.status === filter;
      const haystack =
        `${guest.name} ${guest.phone} ${guest.promoterName}`.toLowerCase();
      const matchesSearch = haystack.includes(search.trim().toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, guests, search]);

  async function handleCheckIn(guestId: number) {
    setGuests((current) =>
      current.map((guest) =>
        guest.id === guestId
          ? {
              ...guest,
              status: "checked_in",
              checkedInAt: new Date().toISOString(),
            }
          : guest,
      ),
    );

    try {
      const result = await api<any>("/api/door-checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ guestId }),
      });

      if ("error" in result) {
        setNotice("Guest checked in locally for demo mode.");
      }
    } catch {
      setNotice("Guest checked in locally for demo mode.");
    }
  }

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Door operations</p>
            <h1>Guest List</h1>
            <p className="muted">
              Live list for the door tablet. Polling every 10 seconds.
            </p>
          </div>
        </div>

        {notice && <div className="notice-box">{notice}</div>}

        <section className="guest-toolbar">
          <input
            className="search-input"
            type="search"
            placeholder="Search name, phone, or promoter"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="filter-row">
            <button
              className={`filter-pill ${filter === "all" ? "is-active" : ""}`}
              type="button"
              onClick={() => setFilter("all")}
            >
              All ({counts.all})
            </button>
            <button
              className={`filter-pill ${filter === "checked_in" ? "is-active success" : ""}`}
              type="button"
              onClick={() => setFilter("checked_in")}
            >
              Checked In ({counts.checked_in})
            </button>
            <button
              className={`filter-pill ${filter === "pending" ? "is-active" : ""}`}
              type="button"
              onClick={() => setFilter("pending")}
            >
              Pending ({counts.pending})
            </button>
            <button
              className={`filter-pill ${filter === "flagged" ? "is-active danger" : ""}`}
              type="button"
              onClick={() => setFilter("flagged")}
            >
              Red Flags ({counts.flagged})
            </button>
          </div>
        </section>

        <section className="guest-list-grid">
          {filteredGuests.map((guest) => (
            <article
              className="guest-list-card promoter-color-card"
              key={guest.id}
              style={{ borderColor: promoterColor(guest.promoterSlug) }}
            >
              <div className="guest-card-top">
                <div>
                  <strong>
                    {guest.name}
                    {guest.locationException && (
                      <span
                        className="location-exception-flag"
                        title="Location-service exception — verify confirmation text"
                        aria-label="Location-service exception"
                      >
                        ⚑
                      </span>
                    )}
                  </strong>
                  <span>{guest.phone}</span>
                </div>

                <span
                  className={`status-badge ${
                    guest.status === "checked_in"
                      ? "status-success"
                      : guest.status === "flagged"
                        ? "status-danger"
                        : "status-neutral"
                  }`}
                >
                  {guest.status === "checked_in"
                    ? "Checked In"
                    : guest.status === "flagged"
                      ? "Red Flag"
                      : "Pending"}
                </span>
              </div>

              <div className="guest-card-meta">
                <div>
                  <small>Invited by</small>
                  <strong
                    className="guest-promoter-name"
                    style={{ color: promoterColor(guest.promoterSlug) }}
                  >
                    {guest.promoterName}
                  </strong>
                </div>
                <div>
                  <small>Party</small>
                  <strong>{guest.partySize}</strong>
                </div>
                <div>
                  <small>Registered</small>
                  <strong>{formatDateTime(guest.registeredAt)}</strong>
                </div>
              </div>

              {guest.flagReason && (
                <div className="flag-note">{guest.flagReason}</div>
              )}

              {guest.locationException && (
                <div className="location-exception-note">
                  <strong>Location-service exception</strong>
                  <span>{guest.confirmationCode}</span>
                  <small>Verify the guest's confirmation text at the door.</small>
                </div>
              )}

              <div className="guest-card-actions">
                {guest.status === "pending" ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void handleCheckIn(guest.id)}
                  >
                    Check In
                  </button>
                ) : guest.status === "checked_in" ? (
                  <span className="status-inline success-text">
                    ✓ Clean conversion
                  </span>
                ) : (
                  <span className="status-inline danger-text">
                    ⚑ Geofence red flag
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </Shell>
  );
}

async function savePromoterSettings(promoter:any) {
  return api<any>("/api/promoters", {
    method: "POST",
    body: JSON.stringify({
      id: promoter.promoterId,
      name: String(promoter.promoterName ?? "").trim(),
      passLimit: Number(promoter.passLimit ?? 25),
      resetDays: Number(promoter.resetDays ?? 1),
    }),
  });
}

let leafletLoader: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  const existing = (window as any).L;
  if (existing) return Promise.resolve(existing);
  if (leafletLoader) return leafletLoader;

  leafletLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      stylesheet.dataset.leafletCss = "true";
      document.head.appendChild(stylesheet);
    }

    const present = document.querySelector<HTMLScriptElement>('script[data-leaflet-js]');
    if (present) {
      present.addEventListener("load", () => resolve((window as any).L), { once: true });
      present.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.dataset.leafletJs = "true";
    script.onload = () => resolve((window as any).L);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return leafletLoader;
}

function RegistrationMap({ promoters, reportingQuery }: { promoters: any[]; reportingQuery: string }) {
  const mapElementId = "registration-coverage-map";
  const [mapData, setMapData] = useState<any>(null);
  const [mapMessage, setMapMessage] = useState("Loading registration map...");

  useEffect(() => {
    let cancelled = false;
    let map: any = null;

    void Promise.all([api<any>(`/api/registration-map?${reportingQuery}`), loadLeaflet()])
      .then(([result, L]) => {
        if (cancelled) return;
        if ("error" in result) {
          setMapMessage(result.error.message);
          return;
        }

        const payload = result.data;
        setMapData(payload);
        setMapMessage("");
        const element = document.getElementById(mapElementId);
        if (!element) return;

        map = L.map(element, { scrollWheelZoom: false, minZoom: 7, maxZoom: 18 });
        const bounds = payload.bounds;
        map.fitBounds([
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        ]);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        for (const point of payload.points.filter((item: any) => item.onMap)) {
          const marker = L.circleMarker([point.latitude, point.longitude], {
            radius: 7,
            color: "#ffffff",
            weight: 1,
            fillColor: promoterColor(point.promoterSlug),
            fillOpacity: 0.9,
          }).addTo(map);
          marker.bindTooltip(
            `${point.promoterName}<br>${new Date(point.registeredAt).toLocaleString()}<br>${
              point.locationSource === "promoter_qr_fallback"
                ? "Promoter QR location (guest fallback)"
                : point.status === "checked_in" ? "Checked in" : "Registered"
            }`,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMapMessage("The map could not be loaded.");
      });

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [reportingQuery]);

  return (
    <section className="data-card registration-map-card">
      <div className="section-heading registration-map-heading">
        <div>
          <p className="eyebrow">Geographic performance</p>
          <h2>Tampa Bay Registration Map</h2>
          <p className="muted">
            Registration locations across Tampa, Clearwater, St. Petersburg, New Tampa,
            Wesley Chapel, Zephyrhills, and surrounding areas.
          </p>
        </div>
        <div className="map-counts">
          <span><strong>{mapData?.onMapCount ?? 0}</strong> on map</span>
          <span><strong>{mapData?.offMapCount ?? 0}</strong> off map</span>
        </div>
      </div>

      <div className="registration-map-layout">
        <div className="registration-map-wrap">
          <div id={mapElementId} className="registration-map" />
          {mapMessage && <div className="map-loading">{mapMessage}</div>}
        </div>

        <aside className="registration-map-sidebar">
          <h3>Promoters</h3>
          <div className="map-legend">
            {promoters.map((promoter) => (
              <div key={promoter.promoterSlug}>
                <span style={{ background: promoterColor(promoter.promoterSlug) }} />
                {promoter.promoterName}
              </div>
            ))}
          </div>

          <h3>Off-map registrations</h3>
          {mapData?.offMapByPromoter?.length ? (
            <div className="off-map-list">
              {mapData.offMapByPromoter.map((item: any) => (
                <div key={item.slug}>
                  <span style={{ background: promoterColor(item.slug) }} />
                  <strong>{item.name}</strong>
                  <b>{item.count}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No registrations outside the Tampa Bay map.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

export function StatsPage() {
  const [data, setData] = useState(DEMO_STATS);
  const [promoterGeofenceAttempts, setPromoterGeofenceAttempts] = useState<any[]>([]);
  const [savingPromoterId, setSavingPromoterId] = useState<number | null>(null);
  const [savedPromoterId, setSavedPromoterId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(
    "Loading live statistics...",
  );
  const [reportingRange, setReportingRange] = useState<"today" | "week" | "month" | "all">("week");
  const [reportingDate, setReportingDate] = useState(() => dateInputValue(0));
  const [reportingLabel, setReportingLabel] = useState("Current week");
  const reportingQuery = useMemo(() => {
    const params = new URLSearchParams({ range: reportingRange });
    if (reportingRange !== "all") params.set("date", reportingDate);
    return params.toString();
  }, [reportingDate, reportingRange]);

  const loadStats = useCallback(async () => {
    try {
      const [statsResult, analyticsResult, promotersResult] = await Promise.all([
        api<any>(`/api/stats?${reportingQuery}`),
        api<any>(`/api/analytics?${reportingQuery}`),
        api<any>("/api/promoters"),
      ]);

      if ("error" in statsResult) {
        setData(DEMO_STATS);
        setNotice("Live statistics are temporarily unavailable.");
        return;
      }

      const payload = statsResult.data as any;
      const analytics =
        "error" in analyticsResult
          ? {}
          : analyticsResult.data;
      const promoterSettings =
        "error" in promotersResult || !Array.isArray(promotersResult.data?.promoters)
          ? []
          : promotersResult.data.promoters;

      if (!payload?.summary || !Array.isArray(payload?.promoters)) {
        setData(DEMO_STATS);
        setNotice("Live statistics are temporarily unavailable.");
        return;
      }

      const liveStats = {
        summary: {
          totalRegistrations: Number(payload.summary.totalRegistrations ?? 0),
          totalPartySize: Number(payload.summary.totalPartySize ?? 0),
          checkedIn: Number(payload.summary.checkedIn ?? 0),
          notCheckedIn: Number(payload.summary.notCheckedIn ?? 0),
          conversionPercentage: Number(payload.summary.conversionPercentage ?? 0),
          qrGenerated: Number(analytics.qrGenerated ?? 0),
          qrScanned: Number(analytics.qrScanned ?? 0),
        },
        promoters: payload.promoters.map((promoter: any) => {
          const settings = promoterSettings.find(
            (item: any) => item.slug === promoter.promoterSlug,
          );

          return {
          promoterId: Number(promoter.promoterId ?? 0),
          promoterName: String(promoter.promoterName ?? "Promoter"),
          promoterSlug: String(promoter.promoterSlug ?? "promoter"),
          registrations: Number(promoter.registrations ?? 0),
          totalPartySize: Number(promoter.totalPartySize ?? 0),
          checkedIn: Number(promoter.checkedIn ?? 0),
          notCheckedIn: Number(promoter.notCheckedIn ?? 0),
          redFlags: Number(promoter.notCheckedIn ?? 0),
          conversionPercentage: Number(promoter.conversionPercentage ?? 0),
          passLimit: Number(settings?.pass_limit ?? 25),
          passesRemaining: Number(settings?.passes_remaining ?? 25),
          resetDays: Number(settings?.reset_days ?? 1),
          };
        }),
      };

      setData(liveStats);
      setPromoterGeofenceAttempts(
        Array.isArray(payload.promoterGeofenceAttempts)
          ? payload.promoterGeofenceAttempts
          : [],
      );
      setReportingLabel(String(payload.reporting?.label ?? "Selected period"));
      setNotice(null);
    } catch {
      setData(DEMO_STATS);
      setNotice("Live statistics are temporarily unavailable.");
    }
  }, [reportingQuery]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Performance</p>
            <h1>Analytics Dashboard</h1>
          </div>
        </div>

        <section className="reporting-toolbar" aria-label="Analytics date range">
          <div className="reporting-presets">
            {([['today', 'Day'], ['week', 'Week'], ['month', 'Month'], ['all', 'All time']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={reportingRange === value ? "is-active" : ""}
                onClick={() => setReportingRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            View date
            <input
              type="date"
              value={reportingDate}
              disabled={reportingRange === "all"}
              onChange={event => setReportingDate(event.target.value)}
            />
          </label>
          <strong>{reportingLabel}</strong>
        </section>

        <section className="venue-strip">
          <article className="venue-info-card">
            <a
              className="venue-icon action-icon"
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Scores Tampa in maps"
            >
              ⌖
            </a>
            <div>
              <small>Venue</small>
              <strong>{VENUE.address}</strong>
            </div>
          </article>

          <article className="venue-info-card">
            <a
              className="venue-icon action-icon"
              href={TEL_URL}
              aria-label="Call Scores Tampa"
            >
              ☎
            </a>
            <div>
              <small>Phone</small>
              <strong>{VENUE.phone}</strong>
            </div>
          </article>

          <article className="venue-info-card">
            <span className="venue-icon">◷</span>
            <div>
              <small>Tonight</small>
              <strong>6:00 PM – 3:00 AM</strong>
            </div>
          </article>
        </section>

        {notice && <div className="notice-box">{notice}</div>}

        <section className="stat-grid">
          <StatCard label="QR Generated" value={(data.summary as any).qrGenerated ?? 0} />
          <StatCard label="QR Scanned" value={(data.summary as any).qrScanned ?? 0} />
          <StatCard label="Guest Registered" value={data.summary.totalRegistrations} />
          <StatCard label="Checked In" value={data.summary.checkedIn} />

          <StatCard
            label="Registrations"
            value={data.summary.totalRegistrations}
          />
          <StatCard
            label="Total Guests"
            value={data.summary.totalPartySize}
          />
          <StatCard
            label="Checked In"
            value={data.summary.checkedIn}
          />
          <StatCard
            label="Conversion"
            value={`${data.summary.conversionPercentage}%`}
          />
        </section>

        <RegistrationMap promoters={data.promoters} reportingQuery={reportingQuery} />

        <section className="data-card promoter-geofence-audit">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Promoter geofence audit</p>
              <h2>Blocked QR Generation Attempts</h2>
              <p className="muted">
                Promoters cannot generate guest passes inside the venue geofence.
                Location failures are also logged for review.
              </p>
            </div>
            <span className="geofence-alert-count">
              {promoterGeofenceAttempts.length} recent alerts
            </span>
          </div>

          {promoterGeofenceAttempts.length ? (
            <div className="geofence-audit-list">
              {promoterGeofenceAttempts.map((attempt: any) => (
                <article key={attempt.id}>
                  <strong>⚑ {attempt.promoter_name}</strong>
                  <span>
                    {attempt.outcome === "blocked_inside_geofence"
                      ? `Blocked inside geofence · ${Math.round(Number(attempt.distance_meters ?? 0))} m from venue`
                      : "Location unavailable while attempting QR generation"}
                  </span>
                  <small>{new Date(attempt.created_at).toLocaleString()}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No promoter geofence violations recorded.</p>
          )}
        </section>

        <section className="data-card promoter-performance-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Promoter performance</p>
              <h2>Analytics Funnel</h2>
              <div className="mini-stat-grid">
                <article><small>QR Generated</small><strong>{(data.summary as any).qrGenerated ?? 0}</strong></article>
                <article><small>QR Scanned</small><strong>{(data.summary as any).qrScanned ?? 0}</strong></article>
                <article><small>Guest Registered</small><strong>{data.summary.totalRegistrations}</strong></article>
                <article><small>Checked In</small><strong>{data.summary.checkedIn}</strong></article>
              </div>
              <h2>By Promoter</h2>
            </div>
          </div>

          <div className="promoter-stats-grid">
            {data.promoters.map((promoter) => (
              <article
                className="promoter-stat-card promoter-color-card"
                key={promoter.promoterSlug}
                style={{ borderColor: promoterColor(promoter.promoterSlug) }}
              >
                <strong>{promoter.promoterName}</strong>

                <div className="promoter-pass-controls">
                <select
                  aria-label={`${promoter.promoterName} daily pass limit`}
                  value={(promoter as any).passLimit ?? 25}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setData((current) => ({
                      ...current,
                      promoters: current.promoters.map((item: any) =>
                        item.promoterSlug === promoter.promoterSlug
                          ? { ...item, passLimit: value }
                          : item,
                      ),
                    }));
                    setSavedPromoterId(null);
                  }}
                >
                  <option value="10">10 passes</option>
                  <option value="25">25 passes</option>
                  <option value="50">50 passes</option>
                </select>

                <select
                  aria-label={`${promoter.promoterName} reset interval`}
                  value={(promoter as any).resetDays ?? 1}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setData((current) => ({
                      ...current,
                      promoters: current.promoters.map((item: any) =>
                        item.promoterSlug === promoter.promoterSlug
                          ? { ...item, resetDays: value }
                          : item,
                      ),
                    }));
                    setSavedPromoterId(null);
                  }}
                >
                  <option value="1">Reset 1 day</option>
                  <option value="3">Reset 3 days</option>
                  <option value="7">Reset 7 days</option>
                  <option value="14">Reset 14 days</option>
                  <option value="30">Reset 30 days</option>
                </select>

                <button
                  className="secondary-button compact-button promoter-save-button"
                  type="button"
                  disabled={savingPromoterId === promoter.promoterId}
                  onClick={() => {
                    setSavingPromoterId(promoter.promoterId);
                    setSavedPromoterId(null);
                    void savePromoterSettings(promoter).then((result) => {
                      setSavingPromoterId(null);
                      if (!("error" in result)) {
                        setSavedPromoterId(promoter.promoterId);
                        void loadStats();
                      }
                    });
                  }}
                >
                  {savingPromoterId === promoter.promoterId
                    ? "Saving..."
                    : savedPromoterId === promoter.promoterId
                      ? "Saved"
                      : "Save"}
                </button>
                </div>

                <div className="promoter-stat-row promoter-passes-row">
                  <span>Passes available</span>
                  <strong>{(promoter as any).passesRemaining ?? 25}</strong>
                </div>

                <div className="promoter-stat-row">
                  <span>Registrations</span>
                  <span>{promoter.registrations}</span>
                </div>

                <div className="promoter-stat-row">
                  <span>Total Guests</span>
                  <span>{promoter.totalPartySize}</span>
                </div>

                <div className="promoter-stat-row">
                  <span>Checked In</span>
                  <span>{promoter.checkedIn}</span>
                </div>

                <div className="promoter-stat-row">
                  <span>Red Flags</span>
                  <span>{(promoter as any).redFlags ?? 0}</span>
                </div>

                <div className="promoter-stat-row">
                  <span>Conversion</span>
                  <span>{promoter.conversionPercentage}%</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="stat-card">
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

export function PromotersDashboardPage() {
  const [data, setData] = useState(DEMO_STATS);
  const [guests, setGuests] = useState(DEMO_GUESTS);
  const [notice, setNotice] = useState<string | null>(
    "Loading live promoter data...",
  );

  useEffect(() => {
    void Promise.all([
      api<any>("/api/stats"),
      api<any>("/api/guest-list"),
      api<any>("/api/promoters"),
    ]).then(([statsResult, guestResult, promotersResult]) => {
      if (!("error" in statsResult) && statsResult.data?.summary) {
        setData({
          summary: {
            totalRegistrations: Number(statsResult.data.summary.totalRegistrations ?? 0),
            totalPartySize: Number(statsResult.data.summary.totalPartySize ?? 0),
            checkedIn: Number(statsResult.data.summary.checkedIn ?? 0),
            notCheckedIn: Number(statsResult.data.summary.notCheckedIn ?? 0),
            conversionPercentage: Number(statsResult.data.summary.conversionPercentage ?? 0),
          },
          promoters: Array.isArray(statsResult.data.promoters)
            ? statsResult.data.promoters.map((promoter: any) => {
                const settings =
                  "error" in promotersResult
                    ? null
                    : promotersResult.data?.promoters?.find(
                        (item: any) => item.slug === promoter.promoterSlug,
                      );

                return {
                promoterId: Number(promoter.promoterId ?? 0),
                promoterName: String(promoter.promoterName ?? "Promoter"),
                promoterSlug: String(promoter.promoterSlug ?? "promoter"),
                registrations: Number(promoter.registrations ?? 0),
                totalPartySize: Number(promoter.totalPartySize ?? 0),
                checkedIn: Number(promoter.checkedIn ?? 0),
                notCheckedIn: Number(promoter.notCheckedIn ?? 0),
                redFlags: Number(promoter.notCheckedIn ?? 0),
                conversionPercentage: Number(promoter.conversionPercentage ?? 0),
                passLimit: Number(settings?.pass_limit ?? 25),
                passesRemaining: Number(settings?.passes_remaining ?? 25),
                resetDays: Number(settings?.reset_days ?? 1),
                };
              })
            : [],
        });
        setNotice(null);
      }

      if (!("error" in guestResult) && Array.isArray(guestResult.data?.guests)) {
        setGuests(
          guestResult.data.guests.map((guest: any) => ({
            id: Number(guest.id ?? 0),
            name: String(guest.name ?? "Guest"),
            phone: String(guest.phone ?? ""),
            promoterName: String(guest.promoter_name ?? "Promoter"),
            promoterSlug: String(guest.promoter_slug ?? ""),
            partySize: Number(guest.party_size ?? 1),
            registeredAt: String(guest.created_at ?? new Date().toISOString()),
            status:
              guest.status === "checked_in" || guest.status === "flagged"
                ? guest.status
                : "pending",
            checkedInAt: guest.checked_in_at ? String(guest.checked_in_at) : null,
            flagReason: null,
          })),
        );
      }
    }).catch(() => {
      setNotice("Live promoter data is temporarily unavailable.");
    });
  }, []);

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Promoter tools</p>
            <h1>Promoter Dashboard</h1>
            <p className="muted">
              QR assets, registration performance, and recent guest activity.
            </p>
          </div>
        </div>

        {notice && <div className="notice-box">{notice}</div>}

        <section className="promoter-dashboard-grid">
          {data.promoters.map((promoter) => {
            const recentGuests = guests
              .filter((guest) => guest.promoterSlug === promoter.promoterSlug)
              .slice(0, 3);
            const resetDays = Number((promoter as any).resetDays ?? 1);

            return (
              <article
                className="data-card promoter-dashboard-card promoter-color-card"
                key={promoter.promoterSlug}
                style={{ borderColor: promoterColor(promoter.promoterSlug) }}
              >
                <div className="promoter-dashboard-head">
                  <div>
                    <p className="eyebrow">Promoter</p>
                    <h2>{promoter.promoterName}</h2>
                    <code>/p/{promoter.promoterSlug}</code>
                  </div>

                  <div
                    style={{
                      border:`5px solid ${promoterColor(promoter.promoterSlug)}`,
                      borderRadius:"18px",
                      padding:"8px",
                      background:"#111"
                    }}
                  >
                    <img
                      className="promoter-qr-image"
                      src={promoterQrDataUrl(promoter.promoterSlug)}
                      alt={`${promoter.promoterName} guest-list QR code`}
                    />
                  </div>
                </div>

                <div className="mini-stat-grid promoter-dashboard-stats">
                  <article>
                    <small>Passes Available</small>
                    <strong>{(promoter as any).passesRemaining ?? 25}</strong>
                  </article>
                  <article>
                    <small>Pass Reset</small>
                    <strong>
                      Every {resetDays} {resetDays === 1 ? "day" : "days"}
                    </strong>
                  </article>
                  <article>
                    <small>Registrations</small>
                    <strong>{promoter.registrations}</strong>
                  </article>
                  <article>
                    <small>Total Guests</small>
                    <strong>{promoter.totalPartySize}</strong>
                  </article>
                  <article>
                    <small>Checked In</small>
                    <strong>{promoter.checkedIn}</strong>
                  </article>
                  <article>
                    <small>Conversion</small>
                    <strong>{promoter.conversionPercentage}%</strong>
                  </article>
                </div>

                <div className="promoter-dashboard-actions">
                  <a
                    className="secondary-button compact-button"
                    href={`/promoter/${promoter.promoterSlug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Promoter Page
                  </a>
                  <a
                    className="primary-button compact-button"
                    href={`/p/${promoter.promoterSlug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Guest Page
                  </a>
                </div>

                <p className="mini-subheading">Recent registrations</p>
                <div className="recent-registration-list">
                  {recentGuests.length > 0 ? recentGuests.map((guest) => (
                    <div className="recent-registration-row" key={guest.id}>
                      <div>
                        <strong>{guest.name}</strong>
                        <small>{guest.phone}</small>
                      </div>
                      <div>
                        <span>Party of {guest.partySize}</span>
                        <small>{formatDateTime(guest.registeredAt)}</small>
                      </div>
                    </div>
                  )) : (
                    <div className="recent-registration-row">
                      <div>
                        <strong>No registrations yet</strong>
                        <small>New guests will appear here.</small>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <section className="data-card promoter-ticket-preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Client scan test</p>
              <h2>All Promoter Tickets</h2>
            </div>
          </div>
          <img
            src="/assets/scores_tampa_all_3_qr_test_page.png"
            alt="Combined Scores Tampa promoter ticket QR test page"
          />
        </section>
      </main>
    </Shell>
  );
}

export function AdminPage() {

  const [demoPhone,setDemoPhone]=useState("");
  const [demoUnlimited,setDemoUnlimited]=useState(true);
  const [demoDuplicate,setDemoDuplicate]=useState(true);
  const [demoSms,setDemoSms]=useState(true);


  const [adminKey, setAdminKey] = useState(
    () => window.sessionStorage.getItem("guest-list-admin-key") ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [promoterStats, setPromoterStats] = useState(DEMO_STATS.promoters);
  const [savingPromoterId, setSavingPromoterId] = useState<number | null>(null);
  const [savedPromoterId, setSavedPromoterId] = useState<number | null>(null);
  const [promoterMessage, setPromoterMessage] = useState("");
  const [promoterPasswords, setPromoterPasswords] = useState<Record<number, string>>({});
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Record<number, boolean>>({});
  const [passwordStatus, setPasswordStatus] = useState<Record<number, { type: "success" | "error"; message: string }>>({});
  const [savingPasswordId, setSavingPasswordId] = useState<number | null>(null);
  const [exportingStats, setExportingStats] = useState(false);
  const [eventPromoterId, setEventPromoterId] = useState("1");
  const [eventName, setEventName] = useState("");
  const [eventExpiresOn, setEventExpiresOn] = useState(() => dateInputValue(14));
  const [specialEvents, setSpecialEvents] = useState<any[]>([]);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [eventQr, setEventQr] = useState<{
    url: string;
    qrCode: string;
    expiresAt: string;
  } | null>(null);
  const [eventQrMessage, setEventQrMessage] = useState("");
  const [generatingEventQr, setGeneratingEventQr] = useState(false);

  const loadSpecialEvents = useCallback(async () => {
    const result = await api<any>("/api/event-qrs");
    if (!("error" in result) && Array.isArray(result.data?.events)) {
      setSpecialEvents(result.data.events);
    }
  }, []);

  const [venue, setVenue] = useState({
    name: VENUE.name,
    address: VENUE.address,
    phone: VENUE.phone,
    latitude: 27.962,
    longitude: -82.506,
    radiusMeters: 457,
    customerCooldownDays: 14,
    geofenceEnabled: true,
    weeklyResetDay: 1,
  });

  const [hours, setHours] = useState(
    VENUE.hours.map(([day, time]) => ({
      day,
      open: time.split(" – ")[0] ?? "6:00 PM",
      close: time.split(" – ")[1] ?? "3:00 AM",
    })),
  );

  useEffect(() => {
    void api<any>("/api/config").then((result) => {
      if ("error" in result) {
        return;
      }

      const remote = result.data?.venue;

      if (!remote) {
        return;
      }

      setVenue({
        name: String(remote.name ?? ""),
        address: String(remote.address ?? ""),
        phone: String(remote.phone ?? ""),
        latitude: Number(remote.latitude ?? 0),
        longitude: Number(remote.longitude ?? 0),
        radiusMeters: Number(remote.radiusMeters ?? 457),
        customerCooldownDays: Number(remote.customerCooldownDays ?? 14),
        geofenceEnabled: Boolean(remote.geofenceEnabled ?? true),
        weeklyResetDay: Number(remote.weeklyResetDay ?? 1),
      });

      if (Array.isArray(remote.hours) && remote.hours.length > 0) {
        setHours(remote.hours);
      }
    });
  }, []);

  useEffect(() => {
    void loadSpecialEvents();

    void api<any>("/api/demo-settings").then((r)=>{
      if("error" in r) return;

      setDemoPhone(r.data.test_phone ?? "");
      setDemoUnlimited(Boolean(r.data.unlimited_joins));
      setDemoDuplicate(Boolean(r.data.bypass_duplicates));
      setDemoSms(Boolean(r.data.always_send_sms));
    });

    void Promise.all([
      api<any>("/api/stats"),
      api<any>("/api/promoters"),
    ]).then(([result, promotersResult]) => {
      if ("error" in result || !Array.isArray(result.data?.promoters)) {
        return;
      }

      const promoterSettings =
        "error" in promotersResult || !Array.isArray(promotersResult.data?.promoters)
          ? []
          : promotersResult.data.promoters;

      setPromoterStats(
        result.data.promoters.map((promoter: any) => {
          const settings = promoterSettings.find(
            (item: any) => item.slug === promoter.promoterSlug,
          );

          return {
          promoterId: Number(promoter.promoterId ?? 0),
          promoterName: String(settings?.name ?? promoter.promoterName ?? "Promoter"),
          promoterSlug: String(promoter.promoterSlug ?? "promoter"),
          registrations: Number(promoter.registrations ?? 0),
          totalPartySize: Number(promoter.totalPartySize ?? 0),
          checkedIn: Number(promoter.checkedIn ?? 0),
          notCheckedIn: Number(promoter.notCheckedIn ?? 0),
          redFlags: Number(promoter.notCheckedIn ?? 0),
          conversionPercentage: Number(promoter.conversionPercentage ?? 0),
          passLimit: Number(settings?.pass_limit ?? 25),
          resetDays: Number(settings?.reset_days ?? 1),
          loginUsername: String(settings?.login_username ?? ""),
          };
        }),
      );
    });
  }, [loadSpecialEvents]);

  function updateVenue(
    field: keyof typeof venue,
    value: string,
  ) {
    setVenue((current) => ({
      ...current,
      [field]:
        field === "latitude" ||
        field === "longitude" ||
        field === "radiusMeters"
          ? Number(value)
          : value,
    }));
  }

  function useCurrentLocation() {
    setMessage("");
    setIsError(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setVenue((current) => ({
          ...current,
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        }));

        setMessage("Venue coordinates updated from this device.");
      },
      () => {
        setIsError(true);
        setMessage("Could not read the current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  async function saveDemoSettings() {

    await api("/api/demo-settings",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        test_phone:demoPhone,
        unlimited_joins:demoUnlimited,
        bypass_duplicates:demoDuplicate,
        always_send_sms:demoSms
      })
    });

    setMessage("Demo settings saved.");

  }

  async function downloadStats() {
    if (!adminKey) {
      setIsError(true);
      setMessage("Enter the admin configuration key before downloading guest data.");
      return;
    }
    setExportingStats(true);
    setMessage("");
    try {
      const response = await fetch("/api/stats-export?range=all", {
        headers: { "X-Admin-Key": adminKey },
      });
      if (!response.ok) {
        const body = await response.json() as { error?: { message?: string } };
        throw new Error(body.error?.message || "Stats export failed.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `scores-guest-list-${dateInputValue(0)}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setIsError(false);
      setMessage("Stats CSV downloaded.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Stats export failed.");
    } finally {
      setExportingStats(false);
    }
  }

  async function savePromoterPassword(promoterId: number) {
    const password = promoterPasswords[promoterId] ?? "";
    if (password.length < 8 || password.length > 128) {
      setPasswordStatus(current => ({
        ...current,
        [promoterId]: { type: "error", message: "Use a password between 8 and 128 characters." },
      }));
      return;
    }

    setSavingPasswordId(promoterId);
    setPasswordStatus(current => {
      const next = { ...current };
      delete next[promoterId];
      return next;
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const result = await api<any>("/api/promoter-password", {
        method: "POST",
        body: JSON.stringify({ promoterId, password }),
        signal: controller.signal,
      });
      if ("error" in result) {
        setPasswordStatus(current => ({
          ...current,
          [promoterId]: { type: "error", message: result.error.message },
        }));
        return;
      }

      const loginUsername = String(result.data?.promoter?.login_username ?? "promoter");
      setVisiblePasswordIds(current => ({ ...current, [promoterId]: true }));
      setPasswordStatus(current => ({
        ...current,
        [promoterId]: {
          type: "success",
          message: `Saved in D1. ${loginUsername}'s new login password is active and visible above.`,
        },
      }));
    } catch (error) {
      const message = error instanceof DOMException && error.name === "AbortError"
        ? "The save timed out after 15 seconds. Nothing was confirmed; please try again."
        : error instanceof Error
          ? `Password was not saved: ${error.message}`
          : "Password was not saved. Please try again.";
      setPasswordStatus(current => ({
        ...current,
        [promoterId]: { type: "error", message },
      }));
    } finally {
      window.clearTimeout(timeoutId);
      setSavingPasswordId(null);
    }
  }

  async function generateEventQR(event: FormEvent) {
    event.preventDefault();
    setGeneratingEventQr(true);
    setEventQr(null);
    setEventQrMessage("");

    const expiration = new Date(`${eventExpiresOn}T23:59:59`);

    try {
      const result = await api<any>("/api/generate-qr", {
        method: "POST",
        body: JSON.stringify({
          promoterId: Number(eventPromoterId),
          expiresAt: expiration.toISOString(),
          maxUses: 10000,
          eventName: eventName.trim(),
          isSpecialEvent: true,
        }),
      });

      if ("error" in result) {
        setEventQrMessage(result.error.message);
        return;
      }

      setEventQr({
        url: String(result.data.url),
        qrCode: String(result.data.qrCode),
        expiresAt: String(result.data.expiresAt),
      });
      setEventQrMessage(
        `Event QR created. It expires after ${eventExpiresOn}.`,
      );
      setEventName("");
      await loadSpecialEvents();
    } catch {
      setEventQrMessage("The event QR code could not be generated.");
    } finally {
      setGeneratingEventQr(false);
    }
  }

  async function deleteSpecialEvent(id: number, name: string) {
    if (!window.confirm(`Delete ${name}? Its QR code will stop working.`)) {
      return;
    }

    setDeletingEventId(id);
    const result = await api<any>("/api/event-qrs", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    setDeletingEventId(null);

    if ("error" in result) {
      setEventQrMessage(result.error.message);
      return;
    }

    setEventQr(null);
    setEventQrMessage(`${name} deleted.`);
    await loadSpecialEvents();
  }

  async function saveVenue(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setIsError(false);

    window.sessionStorage.setItem(
      "guest-list-admin-key",
      adminKey,
    );

    try {
      const result = await api<any>("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          ...venue,
          hours,
          customerCooldownDays: venue.customerCooldownDays,
          geofenceEnabled: venue.geofenceEnabled,
        }),
      });

      if ("error" in result) {
        setIsError(true);
        setMessage(result.error.message);
        return;
      }

      setMessage("Venue configuration saved.");
    } catch {
      setIsError(true);
      setMessage("Venue configuration could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Venue configuration</p>
            <h1>Admin</h1>
            <p className="muted">
              Configure this deployment for any nightclub or venue.
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={() => void downloadStats()} disabled={exportingStats}>
            {exportingStats ? "Preparing CSV..." : "Download Stats CSV"}
          </button>
        </div>

        <form className="data-card event-qr-card" onSubmit={generateEventQR}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Special event flyers</p>
              <h2>Expiring QR Code</h2>
              <p className="muted">
                Create one reusable flyer code that stops accepting guests after
                the selected date.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label className="full-field">
              Event name
              <input
                type="text"
                maxLength={100}
                placeholder="Example: Labor Day Weekend"
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                required
              />
            </label>

            <label>
              Promoter color
              <select
                value={eventPromoterId}
                onChange={(event) => setEventPromoterId(event.target.value)}
              >
                {promoterStats.map((promoter) => (
                  <option key={promoter.promoterId} value={promoter.promoterId}>
                    {promoter.promoterName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Valid through
              <input
                type="date"
                min={dateInputValue(0)}
                max={dateInputValue(365)}
                value={eventExpiresOn}
                onChange={(event) => setEventExpiresOn(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="admin-form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={generatingEventQr}
            >
              {generatingEventQr ? "Generating..." : "Generate Event QR"}
            </button>
          </div>

          {eventQrMessage && (
            <div className={eventQr ? "success-box" : "error-box"}>
              {eventQrMessage}
            </div>
          )}

          {eventQr && (
            <div className="event-qr-result">
              <div
                className="event-qr-frame"
                style={{
                  borderColor: promoterColor(
                    promoterStats.find(
                      (promoter) => promoter.promoterId === Number(eventPromoterId),
                    )?.promoterSlug ?? "",
                  ),
                }}
              >
                <img src={eventQr.qrCode} alt="Expiring event QR code" />
              </div>
              <div>
                <strong>Flyer link</strong>
                <p className="event-qr-url">{eventQr.url}</p>
                <small>
                  Expires {new Date(eventQr.expiresAt).toLocaleString()}
                </small>
              </div>
            </div>
          )}
        </form>

        <section className="data-card special-events-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Persistent event assets</p>
              <h2>Special Event Flyers & Conversions</h2>
              <p className="muted">
                Saved flyers remain here until deleted. Scans and guest conversions update from live D1 data.
              </p>
            </div>
          </div>

          {specialEvents.length === 0 ? (
            <div className="notice-box">No saved special-event flyers yet.</div>
          ) : (
            <div className="special-event-list">
              {specialEvents.map((event) => (
                <article className="special-event-item" key={event.id}>
                  <div
                    className="event-qr-frame"
                    style={{ borderColor: promoterColor(event.promoterSlug) }}
                  >
                    <img src={event.qrCode} alt={`${event.name} QR code`} />
                  </div>

                  <div className="special-event-details">
                    <div className="special-event-heading">
                      <div>
                        <p className="eyebrow">{event.promoterName}</p>
                        <h3>{event.name}</h3>
                        <small>
                          Expires {event.expiresAt ? new Date(event.expiresAt).toLocaleString() : "never"}
                        </small>
                      </div>
                      <button
                        className="danger-button compact-button"
                        type="button"
                        disabled={deletingEventId === event.id}
                        onClick={() => void deleteSpecialEvent(event.id, event.name)}
                      >
                        {deletingEventId === event.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    <a className="event-qr-url" href={event.url} target="_blank" rel="noreferrer">
                      {event.url}
                    </a>

                    <div className="special-event-funnel">
                      <article><small>QR Generated</small><strong>1</strong></article>
                      <article><small>Scanned</small><strong>{event.scans}</strong></article>
                      <article><small>Registered</small><strong>{event.registrations}</strong></article>
                      <article><small>Total Guests</small><strong>{event.totalGuests}</strong></article>
                      <article><small>Checked In</small><strong>{event.checkedIn}</strong></article>
                      <article><small>Awaiting Check-In</small><strong>{event.awaitingCheckIn}</strong></article>
                      <article><small>Scan → Register</small><strong>{event.registrationConversion}%</strong></article>
                      <article><small>Register → Check In</small><strong>{event.checkInConversion}%</strong></article>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="data-card">

          <div className="section-heading">
            <div>
              <p className="eyebrow">Beta Testing</p>
              <h2>Demo Settings</h2>
            </div>
          </div>

          <div className="admin-form-grid">

            <label>
              Test Phone Number
              <input
                value={demoPhone}
                onChange={(e)=>setDemoPhone(e.target.value)}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={demoUnlimited}
                onChange={(e)=>setDemoUnlimited(e.target.checked)}
              />
              Unlimited QR Joins
            </label>

            <label>
              <input
                type="checkbox"
                checked={demoDuplicate}
                onChange={(e)=>setDemoDuplicate(e.target.checked)}
              />
              Ignore Duplicate Protection
            </label>

            <label>
              <input
                type="checkbox"
                checked={demoSms}
                onChange={(e)=>setDemoSms(e.target.checked)}
              />
              Always Send SMS
            </label>

          </div>

          <div className="admin-form-actions">

            <button
              type="button"
              className="primary-button"
              onClick={()=>void saveDemoSettings()}
            >
              Save Demo Settings
            </button>

          </div>

        </section>

        <form
          className="data-card venue-editor-card"
          onSubmit={saveVenue}
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Deployment venue</p>
              <h2>Venue Settings</h2>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              Venue name
              <input
                value={venue.name}
                onChange={(event) =>
                  updateVenue("name", event.target.value)
                }
                required
              />
            </label>

            <label>
              Phone
              <input
                type="tel"
                value={venue.phone}
                onChange={(event) =>
                  updateVenue("phone", event.target.value)
                }
              />
            </label>

            <label className="full-field">
              Street address
              <input
                value={venue.address}
                onChange={(event) =>
                  updateVenue("address", event.target.value)
                }
                required
              />
            </label>

            <label>
              Latitude
              <input
                type="number"
                step="0.0000001"
                value={venue.latitude}
                onChange={(event) =>
                  updateVenue("latitude", event.target.value)
                }
                required
              />
            </label>

            <label>
              Longitude
              <input
                type="number"
                step="0.0000001"
                value={venue.longitude}
                onChange={(event) =>
                  updateVenue("longitude", event.target.value)
                }
                required
              />
            </label>

            <label>
              Customer phone cooldown (days)
              <select
                value={venue.customerCooldownDays}
                onChange={(event) =>
                  setVenue((current) => ({
                    ...current,
                    customerCooldownDays: Number(event.target.value),
                  }))
                }
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i} value={i}>{i} days</option>
                ))}
              </select>
            </label>

            <label>
              Geofence protection
              <select
                value={venue.geofenceEnabled ? "on" : "off"}
                onChange={(event) =>
                  setVenue((current) => ({
                    ...current,
                    geofenceEnabled: event.target.value === "on",
                  }))
                }
              >
                <option value="on">Enabled</option>
                <option value="off">Disabled</option>
              </select>
            </label>

            <label>
              Weekly analytics starts
              <select
                value={venue.weeklyResetDay}
                onChange={event => setVenue(current => ({ ...current, weeklyResetDay: Number(event.target.value) }))}
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </label>

            <label>
              Restricted radius, meters
              <input
                type="number"
                min="50"
                max="10000"
                value={venue.radiusMeters}
                onChange={(event) =>
                  updateVenue("radiusMeters", event.target.value)
                }
                required
              />
            </label>

            <label>
              Admin configuration key
              <input
                type="password"
                value={adminKey}
                onChange={(event) =>
                  setAdminKey(event.target.value)
                }
                required
              />
            </label>
          </div>

          <div className="admin-form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={useCurrentLocation}
            >
              Use Current Location
            </button>

            <button
              className="primary-button"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Venue"}
            </button>
          </div>

          {message && (
            <div className={isError ? "error-box" : "notice-box"}>
              {message}
            </div>
          )}
        </form>

        <section className="data-card config-card hours-editor-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operating hours</p>
              <h2>Weekly Schedule</h2>
            </div>
          </div>

          <div className="hours-editor-list">
            {hours.map((row, index) => (
              <div className="hours-editor-row" key={row.day}>
                <strong>{row.day}</strong>

                <input
                  value={row.open}
                  aria-label={`${row.day} opening time`}
                  onChange={(event) => {
                    const value = event.target.value;

                    setHours((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, open: value }
                          : item,
                      ),
                    );
                  }}
                />

                <span>to</span>

                <input
                  value={row.close}
                  aria-label={`${row.day} closing time`}
                  onChange={(event) => {
                    const value = event.target.value;

                    setHours((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, close: value }
                          : item,
                      ),
                    );
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="data-card promoter-admin-card">
          <div className="section-heading admin-promoter-heading">
            <div>
              <p className="eyebrow">Promoter overview</p>
              <h2>Promoter Management</h2>
              <p className="muted">Change display names and rotate promoter login passwords without changing QR links.</p>
            </div>
            <a className="secondary-button compact-button" href="/promoters">
              Open Promoter Dashboard
            </a>
          </div>

          <div className="promoter-stats-grid">
            {promoterStats.map((promoter) => (
              <article
                className="promoter-stat-card promoter-color-card"
                key={promoter.promoterSlug}
                style={{ borderColor: promoterColor(promoter.promoterSlug) }}
              >
                <label className="promoter-name-field">
                  Display name
                  <input
                    type="text"
                    maxLength={80}
                    value={promoter.promoterName}
                    onChange={(event) => {
                      const promoterName = event.target.value;
                      setPromoterStats((current) => current.map((item) =>
                        item.promoterId === promoter.promoterId
                          ? { ...item, promoterName }
                          : item,
                      ));
                      setSavedPromoterId(null);
                      setPromoterMessage("");
                    }}
                    aria-label={`${promoter.promoterSlug} promoter display name`}
                  />
                </label>
                <small className="promoter-link-note">QR link: /p/{promoter.promoterSlug}</small>
                <small className="promoter-link-note">Login: {(promoter as any).loginUsername || "Assigned promoter account"}</small>
                <button
                  className="secondary-button compact-button promoter-save-button"
                  type="button"
                  disabled={
                    savingPromoterId === promoter.promoterId ||
                    promoter.promoterName.trim().length === 0
                  }
                  onClick={() => {
                    setSavingPromoterId(promoter.promoterId);
                    setSavedPromoterId(null);
                    setPromoterMessage("");
                    void savePromoterSettings(promoter).then((result) => {
                      setSavingPromoterId(null);
                      if ("error" in result) {
                        setPromoterMessage(result.error.message);
                        return;
                      }

                      const savedName = String(result.data?.promoter?.name ?? promoter.promoterName);
                      setPromoterStats((current) => current.map((item) =>
                        item.promoterId === promoter.promoterId
                          ? { ...item, promoterName: savedName }
                          : item,
                      ));
                      setSavedPromoterId(promoter.promoterId);
                      setPromoterMessage(`${savedName} saved.`);
                    });
                  }}
                >
                  {savingPromoterId === promoter.promoterId
                    ? "Saving..."
                    : savedPromoterId === promoter.promoterId
                      ? "Saved"
                      : "Save Name"}
                </button>
                <div className="promoter-password-control">
                  <input
                    type={visiblePasswordIds[promoter.promoterId] ? "text" : "password"}
                    minLength={8}
                    maxLength={128}
                    placeholder="New login password"
                    value={promoterPasswords[promoter.promoterId] ?? ""}
                    onChange={event => {
                      setPromoterPasswords(current => ({ ...current, [promoter.promoterId]: event.target.value }));
                      setPasswordStatus(current => {
                        const next = { ...current };
                        delete next[promoter.promoterId];
                        return next;
                      });
                    }}
                    aria-label={`New password for ${promoter.promoterName}`}
                  />
                  <button
                    className="secondary-button compact-button promoter-password-visibility"
                    type="button"
                    disabled={!(promoterPasswords[promoter.promoterId] ?? "")}
                    onClick={() => setVisiblePasswordIds(current => ({
                      ...current,
                      [promoter.promoterId]: !current[promoter.promoterId],
                    }))}
                  >
                    {visiblePasswordIds[promoter.promoterId] ? "Hide" : "Show"}
                  </button>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    disabled={savingPasswordId === promoter.promoterId || (promoterPasswords[promoter.promoterId] ?? "").length < 8}
                    onClick={() => void savePromoterPassword(promoter.promoterId)}
                  >
                    {savingPasswordId === promoter.promoterId ? "Updating..." : "Update Password"}
                  </button>
                </div>
                {passwordStatus[promoter.promoterId] && (
                  <div
                    className={`promoter-password-status ${passwordStatus[promoter.promoterId].type}`}
                    role={passwordStatus[promoter.promoterId].type === "error" ? "alert" : "status"}
                  >
                    {passwordStatus[promoter.promoterId].type === "success" ? "✓ " : "⚠ "}
                    {passwordStatus[promoter.promoterId].message}
                  </div>
                )}
                <div className="promoter-stat-row">
                  <span>Registrations</span>
                  <span>{promoter.registrations}</span>
                </div>
                <div className="promoter-stat-row">
                  <span>Checked In</span>
                  <span>{promoter.checkedIn}</span>
                </div>
                <div className="promoter-stat-row">
                  <span>Conversion</span>
                  <span>{promoter.conversionPercentage}%</span>
                </div>
              </article>
            ))}
          </div>
          {promoterMessage && <div className="notice-box promoter-save-notice">{promoterMessage}</div>}
        </section>
      </main>
    </Shell>
  );
}

export function PromoterControlPage({ promoterSlug }: { promoterSlug: string }) {
  const [promoter, setPromoter] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrMessage, setQrMessage] = useState("");
  const [generatingQr, setGeneratingQr] = useState(false);

  useEffect(() => {
    void api<any>("/api/promoters").then((result) => {
      if (!("error" in result)) {
        const found = result.data?.promoters?.find(
          (p: any) => p.slug === promoterSlug,
        );

        if (found) {
          setPromoter({
            id: Number(found.id),
            name: String(found.name),
            slug: String(found.slug),
            passLimit: Number(found.pass_limit ?? 25),
            passesRemaining: Number(found.passes_remaining ?? 25),
            resetDays: Number(found.reset_days ?? 1),
          });
        }
      }
    });
  }, [promoterSlug]);

  async function generateQR() {
    if (!promoter?.id) {
      return;
    }

    setQrMessage("");
    setQrUrl("");
    setQrImage("");
    setGeneratingQr(true);

    const submitAttempt = async (location: Record<string, unknown>) =>
      api<any>("/api/generate-qr", {
        method: "POST",
        body: JSON.stringify({ promoterId: promoter.id, ...location }),
      });

    let result: any;
    try {
      if (!navigator.geolocation) {
        result = await submitAttempt({ locationStatus: "unsupported" });
      } else {
        result = await new Promise<any>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              void submitAttempt({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: position.coords.accuracy,
                locationStatus: "captured",
              }).then(resolve, reject);
            },
            (error) => {
              void submitAttempt({
                locationStatus: error.code === 1 ? "permission_denied" : "location_error",
              }).then(resolve, reject);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
          );
        });
      }
    } catch {
      setGeneratingQr(false);
      setQrMessage("Location verification failed. No QR pass was used. Try again.");
      return;
    }

    setGeneratingQr(false);

    if ("error" in result) {
      setQrMessage(result.error.message);
      return;
    }

    setQrUrl(result.data.url);
    setQrImage(result.data.qrCode);
    setPromoter((current: any) => ({
      ...current,
      passesRemaining: Number(result.data.passesRemaining ?? 0),
    }));
  }

  return (
    <Shell>
      <main className="page narrow">
        <section className="hero-card">
          <p className="eyebrow">Promoter controls</p>

          <h1>{promoter?.name ?? promoterSlug}</h1>

          <p>
            Passes Remaining: {promoter?.passesRemaining ?? 0}
          </p>
          <p>
            Reset: every {promoter?.resetDays ?? 1} {promoter?.resetDays === 1 ? "day" : "days"}
          </p>

          <button
            className="primary-button"
            disabled={!promoter || promoter.passesRemaining <= 0 || generatingQr}
            onClick={() => void generateQR()}
          >
            {generatingQr ? "Checking Location..." : "Generate QR Code"}
          </button>

          <p className="promoter-location-disclosure">
            Location Services are required. QR generation is blocked inside the
            venue geofence and every blocked attempt is reported to Admin.
          </p>

          {qrMessage && (
            <div className="promoter-geofence-warning">
              <strong>⚑ QR GENERATION BLOCKED</strong>
              <span>{qrMessage}</span>
            </div>
          )}

          {qrUrl && (
            <div>
              <p>{qrUrl}</p>

              <div
                style={{
                  border:`6px solid ${promoterColor(promoterSlug)}`,
                  borderRadius:"20px",
                  padding:"12px",
                  display:"inline-block"
                }}
              >
                <img
                  src={qrImage}
                  alt="Promoter QR code"
                />
              </div>
            </div>
          )}

          <VipPackages />
        </section>
      </main>
    </Shell>
  );
}


export function JoinTokenPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<any>(`/api/qr-lookup?token=${token}`).then((r) => {
      if ("error" in r) {
        setError(r.error.message);
        return;
      }

      setData(r.data);
    });
  }, [token]);

  if (error) {
    return (
      <Shell compact>
        <main className="page narrow centered">
          <section className="hero-card expired-pass-card">
            <p className="eyebrow">Guest pass unavailable</p>
            <h1>{error}</h1>
            <p className="muted">
              Contact your promoter for a current guest-list pass.
            </p>
          </section>
        </main>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <main className="page narrow centered">
          <section className="hero-card">
            <h1>Loading guest list...</h1>
          </section>
        </main>
      </Shell>
    );
  }

  return (
    <PromoterPage
      promoterSlug={data.promoterSlug}
      qrToken={token}
    />
  );
}

export function NotFoundPage() {
  return (
    <Shell>
      <main className="page narrow centered">
        <section className="hero-card">
          <p className="eyebrow">404</p>
          <h1>Page not found</h1>
          <a className="primary-button" href="/">
            Go Home
          </a>
        </section>
      </main>
    </Shell>
  );
}
