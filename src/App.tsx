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

type ConfigData = {
  venue: {
    id: number;
    slug: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  promoters: Array<{
    id: number;
    slug: string;
    name: string;
    active: boolean;
    qrPath: string;
  }>;
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
          <span className="brand-mark">S</span>
          <span>
            <strong>Scores Tampa</strong>
            <small>Guest List</small>
          </span>
        </a>

        {!compact && (
          <nav>
            <a href="/guest-list">Guest List</a>
            <a href="/stats">Stats</a>
            <a href="/admin">Admin</a>
          </nav>
        )}
      </header>

      {children}
    </div>
  );
}

function HomePage() {
  return (
    <Shell>
      <main className="page narrow">
        <section className="hero-card">
          <p className="eyebrow">Scores Tampa</p>
          <h1>Guest List MVP</h1>
          <p className="muted">
            Use a promoter link to join the guest list.
          </p>

          <div className="promoter-links">
            <a className="primary-button" href="/p/mike">
              Mike D.
            </a>
            <a className="primary-button" href="/p/sarah">
              Sarah K.
            </a>
            <a className="primary-button" href="/p/james">
              James R.
            </a>
          </div>
        </section>
      </main>
    </Shell>
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
                You must be near Scores Tampa. We use your location only
                to verify this guest-list request.
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
            <h1>Promoter Stats</h1>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {!data ? (
          <div className="empty-state">Loading stats...</div>
        ) : (
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
  const [data, setData] = useState<ConfigData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<ConfigData>("/api/config").then((result) => {
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
            <p className="eyebrow">Read-only</p>
            <h1>Admin Config</h1>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {!data ? (
          <div className="empty-state">Loading configuration...</div>
        ) : (
          <div className="admin-grid">
            <section className="data-card config-card">
              <h2>Venue</h2>

              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{data.venue.name}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{data.venue.address}</dd>
                </div>
                <div>
                  <dt>Latitude</dt>
                  <dd>{data.venue.latitude}</dd>
                </div>
                <div>
                  <dt>Longitude</dt>
                  <dd>{data.venue.longitude}</dd>
                </div>
                <div>
                  <dt>Radius</dt>
                  <dd>{data.venue.radiusMeters} meters</dd>
                </div>
              </dl>
            </section>

            <section className="data-card config-card">
              <h2>Promoters</h2>

              <div className="promoter-config-list">
                {data.promoters.map((promoter) => (
                  <div className="promoter-config" key={promoter.id}>
                    <div>
                      <strong>{promoter.name}</strong>
                      <small>{promoter.qrPath}</small>
                    </div>

                    <span
                      className={
                        promoter.active ? "active-badge" : "inactive-badge"
                      }
                    >
                      {promoter.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
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
    return <HomePage />;
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
