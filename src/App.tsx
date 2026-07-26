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

type Guest = {
  id: number;
  name: string;
  phone: string;
  party_size: number;
  promoter_name: string;
  promoter_slug: string;
  status: "registered" | "checked_in";
  created_at: string;
  checked_in_at: string | null;
};

type GuestListData = {
  guests: Guest[];
};

type StatsData = {
  summary: {
    totalRegistrations: number;
    totalPartySize: number;
    checkedIn: number;
    notCheckedIn: number;
    conversionPercentage: number;
  };
  promoters: Array<{
    promoterId: number;
    promoterName: string;
    promoterSlug: string;
    registrations: number;
    totalPartySize: number;
    checkedIn: number;
    notCheckedIn: number;
    conversionPercentage: number;
  }>;
};

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
    { id: 1, name: "Mike D.", slug: "mike" },
    { id: 2, name: "Sarah K.", slug: "sarah" },
    { id: 3, name: "James R.", slug: "james" },
  ],
};

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

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

function formatTime(value: string): string {
  const date = new Date(value.replace(" ", "T") + "Z");

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Shell({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
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

        {!compact && (
          <nav>
            <a href="/guest-list">Guest List</a>
            <a href="/stats">Stats</a>
            <a href="/admin#promoters">Promoters</a>
            <a href="/admin">Admin</a>
          </nav>
        )}
      </header>

      {children}
    </div>
  );
}

function PromoterPage({ promoterSlug }: { promoterSlug: string }) {
  const promoterNames: Record<string, string> = {
    mike: "Mike D.",
    sarah: "Sarah K.",
    james: "James R.",
  };

  const promoterName = promoterNames[promoterSlug] ?? promoterSlug;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [status, setStatus] = useState<
    "idle" | "locating" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

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
            promoterSlug,
            name: name.trim(),
            phone,
            partySize,
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
      <main className="page narrow">
        <section className="hero-card">
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
              <span>⌖</span>
              <p>
                Location is used to enforce the venue registration rules.
              </p>
            </div>

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
        </section>
      </main>
    </Shell>
  );
}

function GuestListPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingIn, setCheckingIn] = useState<number | null>(null);

  const loadGuests = useCallback(async () => {
    const result = await api<GuestListData>("/api/guest-list");

    if ("error" in result) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setGuests(result.data.guests);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadGuests();

    const interval = window.setInterval(() => {
      void loadGuests();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadGuests]);

  async function checkIn(guestId: number) {
    setCheckingIn(guestId);

    const result = await api<{
      guestId: number;
      status: string;
      checkedInAt: string | null;
    }>("/api/door-checkin", {
      method: "POST",
      body: JSON.stringify({ guestId }),
    });

    if ("error" in result) {
      setError(result.error.message);
      setCheckingIn(null);
      return;
    }

    setGuests((current) =>
      current.map((guest) =>
        guest.id === guestId
          ? {
              ...guest,
              status: "checked_in",
              checked_in_at: result.data.checkedInAt,
            }
          : guest,
      ),
    );

    setCheckingIn(null);
  }

  const activeCount = useMemo(
    () => guests.filter((guest) => guest.status !== "checked_in").length,
    [guests],
  );

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Door operations</p>
            <h1>Guest List</h1>
            <p className="muted">
              {activeCount} waiting · refreshes every 10 seconds
            </p>
          </div>

          <button className="secondary-button" onClick={() => void loadGuests()}>
            Refresh
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        {loading ? (
          <div className="empty-state">Loading guest list...</div>
        ) : guests.length === 0 ? (
          <div className="empty-state">No guests yet.</div>
        ) : (
          <div className="guest-table">
            {guests.map((guest) => (
              <article
                className={`guest-row ${
                  guest.status === "checked_in" ? "checked" : ""
                }`}
                key={guest.id}
              >
                <div className="guest-main">
                  <strong>{guest.name}</strong>
                  <span>{formatPhone(guest.phone)}</span>
                </div>

                <div>
                  <small>Promoter</small>
                  <strong>{guest.promoter_name}</strong>
                </div>

                <div>
                  <small>Party</small>
                  <strong>{guest.party_size}</strong>
                </div>

                <div>
                  <small>Added</small>
                  <strong>{formatTime(guest.created_at)}</strong>
                </div>

                <div className="guest-action">
                  {guest.status === "checked_in" ? (
                    <span className="checked-badge">✓ Checked in</span>
                  ) : (
                    <button
                      className="checkin-button"
                      disabled={checkingIn === guest.id}
                      onClick={() => void checkIn(guest.id)}
                    >
                      {checkingIn === guest.id ? "Checking in..." : "Check In"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </Shell>
  );
}

function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<StatsData>("/api/stats").then((result) => {
      if ("error" in result) {
        setError(result.error.message);
        return;
      }

      setData(result.data);
    });
  }, []);

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Performance</p>
            <h1>Stats Dashboard</h1>
          </div>
        </div>

        <section className="venue-strip">
          <article className="venue-info-card">
            <span className="venue-icon">⌖</span>
            <div>
              <small>Venue</small>
              <strong>{VENUE.address}</strong>
            </div>
          </article>

          <article className="venue-info-card">
            <span className="venue-icon">☎</span>
            <div>
              <small>Phone</small>
              <strong>{VENUE.phone}</strong>
            </div>
          </article>

          <article className="venue-info-card hours-card">
            <span className="venue-icon">◷</span>
            <div>
              <small>Tonight</small>
              <strong>6:00 PM – 3:00 AM</strong>
            </div>
          </article>
        </section>

        {error && <div className="error-box">{error}</div>}

        {!data && !error ? (
          <div className="empty-state">Loading stats...</div>
        ) : data ? (
          <>
            <section className="stat-grid">
              <StatCard
                label="Registrations"
                value={data.summary.totalRegistrations}
              />
              <StatCard
                label="Total guests"
                value={data.summary.totalPartySize}
              />
              <StatCard
                label="Checked in"
                value={data.summary.checkedIn}
              />
              <StatCard
                label="Conversion"
                value={`${data.summary.conversionPercentage}%`}
              />
            </section>

            <section className="data-card">
              <div className="stats-header">
                <span>Promoter</span>
                <span>Registrations</span>
                <span>Party total</span>
                <span>Checked in</span>
                <span>Conversion</span>
              </div>

              {data.promoters.map((promoter) => (
                <div className="stats-row" key={promoter.promoterId}>
                  <strong>{promoter.promoterName}</strong>
                  <span>{promoter.registrations}</span>
                  <span>{promoter.totalPartySize}</span>
                  <span>{promoter.checkedIn}</span>
                  <span>{promoter.conversionPercentage}%</span>
                </div>
              ))}
            </section>
          </>
        ) : (
          <section className="dashboard-preview">
            <article className="stat-card">
              <small>Registrations</small>
              <strong>—</strong>
            </article>
            <article className="stat-card">
              <small>Total guests</small>
              <strong>—</strong>
            </article>
            <article className="stat-card">
              <small>Checked in</small>
              <strong>—</strong>
            </article>
            <article className="stat-card">
              <small>Conversion</small>
              <strong>—</strong>
            </article>
          </section>
        )}
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

function AdminPage() {
  const promoters = [
    {
      id: 1,
      name: "Mike D.",
      slug: "mike",
    },
    {
      id: 2,
      name: "Sarah K.",
      slug: "sarah",
    },
    {
      id: 3,
      name: "James R.",
      slug: "james",
    },
  ];

  const hours = [
    ["Sunday", "6:00 PM – 3:00 AM"],
    ["Monday", "6:00 PM – 3:00 AM"],
    ["Tuesday", "6:00 PM – 3:00 AM"],
    ["Wednesday", "6:00 PM – 3:00 AM"],
    ["Thursday", "6:00 PM – 3:00 AM"],
    ["Friday", "6:00 PM – 3:00 AM"],
    ["Saturday", "6:00 PM – 3:00 AM"],
  ];

  function copyPromoterLink(slug: string) {
    const url = `${window.location.origin}/p/${slug}`;
    void navigator.clipboard.writeText(url);
  }

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Venue operations</p>
            <h1>Admin Dashboard</h1>
            <p className="muted">
              Scores Tampa guest-list configuration and promoter links.
            </p>
          </div>
        </div>

        <section className="admin-grid admin-top-grid">
          <article className="data-card config-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Venue</p>
                <h2>Scores Tampa</h2>
              </div>
            </div>

            <dl>
              <div>
                <dt>Address</dt>
                <dd>
                  2310 N. Dale Mabry Highway, Tampa, Florida 33607
                </dd>
              </div>

              <div>
                <dt>Phone</dt>
                <dd>(813) 875-7912</dd>
              </div>

              <div>
                <dt>Restricted registration radius</dt>
                <dd>457 meters</dd>
              </div>

              <div>
                <dt>Registration rule</dt>
                <dd>
                  Guest-list submissions are blocked inside the restricted
                  venue zone.
                </dd>
              </div>

              <div>
                <dt>Duplicate rule</dt>
                <dd>One registration per phone number per night.</dd>
              </div>
            </dl>
          </article>

          <article className="data-card config-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Club hours</p>
                <h2>Weekly Schedule</h2>
              </div>
            </div>

            <div className="hours-list">
              {hours.map(([day, time]) => (
                <div className="hours-row" key={day}>
                  <strong>{day}</strong>
                  <span>{time}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section
          className="data-card promoter-admin-card"
          id="promoters"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Promoter management</p>
              <h2>Promoter QR Links</h2>
              <p className="muted">
                Each printed QR code should point to its promoter-specific
                destination.
              </p>
            </div>
          </div>

          <div className="promoter-admin-grid">
            {promoters.map((promoter) => {
              const fullUrl =
                `${window.location.origin}/p/${promoter.slug}`;

              return (
                <article
                  className="promoter-admin-item"
                  key={promoter.id}
                >
                  <div className="promoter-avatar">
                    {promoter.name.charAt(0)}
                  </div>

                  <div className="promoter-admin-copy">
                    <strong>{promoter.name}</strong>
                    <code>/p/{promoter.slug}</code>
                    <small>{fullUrl}</small>
                  </div>

                  <div className="promoter-actions">
                    <span className="active-badge">Active</span>

                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() => copyPromoterLink(promoter.slug)}
                    >
                      Copy Link
                    </button>

                    <a
                      className="primary-button compact-button"
                      href={`/p/${promoter.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="data-card config-card security-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">QR protection</p>
              <h2>Current MVP Rules</h2>
            </div>
          </div>

          <div className="security-grid">
            <article>
              <strong>Restricted venue zone</strong>
              <p>
                Registrations made within 457 meters of Scores Tampa are
                rejected.
              </p>
            </article>

            <article>
              <strong>Nightly phone limit</strong>
              <p>
                A phone number can join the guest list only once per night.
              </p>
            </article>

            <article>
              <strong>Single door check-in</strong>
              <p>
                Once checked in, the registration remains consumed.
              </p>
            </article>

            <article>
              <strong>Promoter attribution</strong>
              <p>
                Every registration records the promoter QR link used.
              </p>
            </article>
          </div>
        </section>
      </main>
    </Shell>
  );
}

function NotFoundPage() {
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

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/") {
    return <StatsPage />;
  }

  if (path === "/guest-list") {
    return <GuestListPage />;
  }

  if (path === "/stats") {
    return <StatsPage />;
  }

  if (path === "/admin") {
    return <AdminPage />;
  }

  if (path.startsWith("/p/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();

    if (promoterSlug) {
      return <PromoterPage promoterSlug={promoterSlug} />;
    }
  }

  return <NotFoundPage />;
}
