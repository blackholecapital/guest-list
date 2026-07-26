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
    { id: 1, name: "Mike D.", slug: "mike" },
    { id: 2, name: "Sarah K.", slug: "sarah" },
    { id: 3, name: "James R.", slug: "james" },
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
};

const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(VENUE.address)}`;
const TEL_URL = "tel:+18138757112";

const DEMO_GUESTS: DemoGuest[] = [
  {
    id: 1,
    name: "John Smith",
    phone: "(813) 555-0101",
    promoterName: "Mike D.",
    promoterSlug: "mike",
    partySize: 1,
    registeredAt: "2026-07-26T18:08:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:04:00-04:00",
    flagReason: null,
  },
  {
    id: 2,
    name: "Ashley Carter",
    phone: "(813) 555-0102",
    promoterName: "Mike D.",
    promoterSlug: "mike",
    partySize: 2,
    registeredAt: "2026-07-26T18:42:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:17:00-04:00",
    flagReason: null,
  },
  {
    id: 3,
    name: "Chris Bennett",
    phone: "(813) 555-0103",
    promoterName: "Mike D.",
    promoterSlug: "mike",
    partySize: 1,
    registeredAt: "2026-07-26T19:05:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:33:00-04:00",
    flagReason: null,
  },
  {
    id: 4,
    name: "Monica Reed",
    phone: "(813) 555-0104",
    promoterName: "Mike D.",
    promoterSlug: "mike",
    partySize: 1,
    registeredAt: "2026-07-26T19:21:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:49:00-04:00",
    flagReason: null,
  },

  {
    id: 5,
    name: "Jessica Miller",
    phone: "(813) 555-0201",
    promoterName: "Sarah K.",
    promoterSlug: "sarah",
    partySize: 2,
    registeredAt: "2026-07-26T18:15:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:11:00-04:00",
    flagReason: null,
  },
  {
    id: 6,
    name: "David Lee",
    phone: "(813) 555-0202",
    promoterName: "Sarah K.",
    promoterSlug: "sarah",
    partySize: 1,
    registeredAt: "2026-07-26T18:51:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:22:00-04:00",
    flagReason: null,
  },
  {
    id: 7,
    name: "Amanda Taylor",
    phone: "(813) 555-0203",
    promoterName: "Sarah K.",
    promoterSlug: "sarah",
    partySize: 1,
    registeredAt: "2026-07-26T19:14:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:38:00-04:00",
    flagReason: null,
  },
  {
    id: 8,
    name: "Brian Wilson",
    phone: "(813) 555-0204",
    promoterName: "Sarah K.",
    promoterSlug: "sarah",
    partySize: 2,
    registeredAt: "2026-07-26T19:48:00-04:00",
    status: "flagged",
    checkedInAt: null,
    flagReason: "Attempted registration inside restricted venue zone.",
  },

  {
    id: 9,
    name: "Maria Garcia",
    phone: "(813) 555-0301",
    promoterName: "James R.",
    promoterSlug: "james",
    partySize: 1,
    registeredAt: "2026-07-26T18:11:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:09:00-04:00",
    flagReason: null,
  },
  {
    id: 10,
    name: "Nick Torres",
    phone: "(813) 555-0302",
    promoterName: "James R.",
    promoterSlug: "james",
    partySize: 2,
    registeredAt: "2026-07-26T18:47:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:18:00-04:00",
    flagReason: null,
  },
  {
    id: 11,
    name: "Olivia Brooks",
    phone: "(813) 555-0303",
    promoterName: "James R.",
    promoterSlug: "james",
    partySize: 1,
    registeredAt: "2026-07-26T19:02:00-04:00",
    status: "checked_in",
    checkedInAt: "2026-07-26T22:41:00-04:00",
    flagReason: null,
  },
  {
    id: 12,
    name: "Trevor Hall",
    phone: "(813) 555-0304",
    promoterName: "James R.",
    promoterSlug: "james",
    partySize: 1,
    registeredAt: "2026-07-26T19:39:00-04:00",
    status: "flagged",
    checkedInAt: null,
    flagReason: "Rejected by restricted-radius rule.",
  },
];

const DEMO_STATS = {
  summary: {
    totalRegistrations: 12,
    totalPartySize: 16,
    checkedIn: 10,
    notCheckedIn: 2,
    conversionPercentage: 83.3,
  },
  promoters: [
    {
      promoterId: 1,
      promoterName: "Mike D.",
      promoterSlug: "mike",
      registrations: 4,
      totalPartySize: 5,
      checkedIn: 4,
      notCheckedIn: 0,
      redFlags: 0,
      conversionPercentage: 100,
    },
    {
      promoterId: 2,
      promoterName: "Sarah K.",
      promoterSlug: "sarah",
      registrations: 4,
      totalPartySize: 6,
      checkedIn: 3,
      notCheckedIn: 1,
      redFlags: 1,
      conversionPercentage: 75,
    },
    {
      promoterId: 3,
      promoterName: "James R.",
      promoterSlug: "james",
      registrations: 4,
      totalPartySize: 5,
      checkedIn: 3,
      notCheckedIn: 1,
      redFlags: 1,
      conversionPercentage: 75,
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
  const [guests, setGuests] = useState<DemoGuest[]>(DEMO_GUESTS);
  const [notice, setNotice] = useState<string | null>(
    "Showing demo guest-list data until live records are available.",
  );
  const [filter, setFilter] = useState<"all" | "checked_in" | "pending" | "flagged">("all");
  const [search, setSearch] = useState("");

  const loadGuests = useCallback(async () => {
    try {
      const result = await api<any>("/api/guest-list");

      if ("error" in result) {
        setGuests(DEMO_GUESTS);
        setNotice("Showing demo guest-list data until live records are available.");
        return;
      }

      const payload = result.data as any;
      const rawGuests = Array.isArray(payload?.guests) ? payload.guests : [];

      if (rawGuests.length === 0) {
        setGuests(DEMO_GUESTS);
        setNotice("Showing demo guest-list data until live records are available.");
        return;
      }

      const mapped: DemoGuest[] = rawGuests.map((guest: any, index: number) => ({
        id: Number(guest.id ?? index + 1),
        name: String(guest.name ?? "Guest"),
        phone: String(guest.phone ?? ""),
        promoterName: String(guest.promoter ?? guest.promoterName ?? "Promoter"),
        promoterSlug: String(guest.promoterSlug ?? "promoter"),
        partySize: Number(guest.partySize ?? 1),
        registeredAt: String(guest.createdAt ?? guest.registeredAt ?? new Date().toISOString()),
        status:
          guest.status === "checked_in"
            ? "checked_in"
            : guest.status === "flagged"
              ? "flagged"
              : "pending",
        checkedInAt: guest.checkedInAt ?? guest.checked_in_at ?? null,
        flagReason: guest.flagReason ?? null,
      }));

      setGuests(mapped);
      setNotice(null);
    } catch {
      setGuests(DEMO_GUESTS);
      setNotice("Showing demo guest-list data until live records are available.");
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
      flagged: guests.filter((guest) => guest.status === "flagged").length,
    };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      const matchesFilter = filter === "all" ? true : guest.status === filter;
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
            <article className="guest-list-card" key={guest.id}>
              <div className="guest-card-top">
                <div>
                  <strong>{guest.name}</strong>
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
                  <small>Promoter</small>
                  <strong>{guest.promoterName}</strong>
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

function StatsPage() {
  const [data, setData] = useState(DEMO_STATS);
  const [notice, setNotice] = useState<string | null>(
    "Showing demo statistics until live data is available.",
  );

  const loadStats = useCallback(async () => {
    try {
      const result = await api<any>("/api/stats");

      if ("error" in result) {
        setData(DEMO_STATS);
        setNotice("Showing demo statistics until live data is available.");
        return;
      }

      const payload = result.data as any;
      if (!payload?.summary || !Array.isArray(payload?.promoters)) {
        setData(DEMO_STATS);
        setNotice("Showing demo statistics until live data is available.");
        return;
      }

      const liveStats = {
        summary: {
          totalRegistrations: Number(payload.summary.totalRegistrations ?? 0),
          totalPartySize: Number(payload.summary.totalPartySize ?? 0),
          checkedIn: Number(payload.summary.checkedIn ?? 0),
          notCheckedIn: Number(payload.summary.notCheckedIn ?? 0),
          conversionPercentage: Number(payload.summary.conversionPercentage ?? 0),
        },
        promoters: payload.promoters.map((promoter: any) => ({
          promoterId: Number(promoter.promoterId ?? 0),
          promoterName: String(promoter.promoterName ?? "Promoter"),
          promoterSlug: String(promoter.promoterSlug ?? "promoter"),
          registrations: Number(promoter.registrations ?? 0),
          totalPartySize: Number(promoter.totalPartySize ?? 0),
          checkedIn: Number(promoter.checkedIn ?? 0),
          notCheckedIn: Number(promoter.notCheckedIn ?? 0),
          redFlags: Number(promoter.notCheckedIn ?? 0),
          conversionPercentage: Number(promoter.conversionPercentage ?? 0),
        })),
      };

      setData(liveStats);
      setNotice(null);
    } catch {
      setData(DEMO_STATS);
      setNotice("Showing demo statistics until live data is available.");
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

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

        <section className="data-card promoter-performance-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Promoter performance</p>
              <h2>By Promoter</h2>
            </div>
          </div>

          <div className="promoter-stats-grid">
            {data.promoters.map((promoter) => (
              <article className="promoter-stat-card" key={promoter.promoterSlug}>
                <strong>{promoter.promoterName}</strong>

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

function AdminPage() {
  const promoterRows = VENUE.promoters.map((promoter) => {
    const stats =
      DEMO_STATS.promoters.find(
        (entry) => entry.promoterSlug === promoter.slug,
      ) ?? DEMO_STATS.promoters[0];

    const recentGuests = DEMO_GUESTS.filter(
      (guest) => guest.promoterSlug === promoter.slug,
    );

    return {
      promoter,
      stats,
      recentGuests,
    };
  });

  function copyPromoterLink(slug: string) {
    const url = `${window.location.origin}/p/${slug}`;
    void navigator.clipboard.writeText(url);
  }

  return (
    <Shell>
      <main className="page wide">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Read-only</p>
            <h1>Admin Config</h1>
          </div>
        </div>

        <div className="admin-grid admin-top-grid">
          <section className="data-card config-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Venue details</p>
                <h2>{VENUE.name}</h2>
              </div>
            </div>

            <dl>
              <div>
                <dt>Address</dt>
                <dd>{VENUE.address}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  <a href={TEL_URL}>{VENUE.phone}</a>
                </dd>
              </div>
              <div>
                <dt>Restricted registration radius</dt>
                <dd>457 meters</dd>
              </div>
              <div>
                <dt>Registration rule</dt>
                <dd>
                  Registrations made inside the restricted zone are rejected.
                </dd>
              </div>
              <div>
                <dt>Duplicate rule</dt>
                <dd>One registration per phone number per night.</dd>
              </div>
            </dl>
          </section>

          <section className="data-card config-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Club hours</p>
                <h2>Weekly Schedule</h2>
              </div>
            </div>

            <div className="hours-list">
              {VENUE.hours.map(([day, time]) => (
                <div className="hours-row" key={day}>
                  <strong>{day}</strong>
                  <span>{time}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="data-card promoter-admin-card" id="promoters">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Promoter management</p>
              <h2>Promoter QR Links</h2>
              <p className="muted">
                Demo stats and recent registrations are shown below each link.
              </p>
            </div>
          </div>

          <div className="promoter-admin-grid">
            {promoterRows.map(({ promoter, stats, recentGuests }) => (
              <article className="promoter-panel" key={promoter.slug}>
                <div className="promoter-panel-head">
                  <div className="promoter-admin-item promoter-admin-headline">
                    <div className="promoter-avatar">
                      {promoter.name.charAt(0)}
                    </div>

                    <div className="promoter-admin-copy">
                      <strong>{promoter.name}</strong>
                      <code>/p/{promoter.slug}</code>
                      <small>{window.location.origin}/p/{promoter.slug}</small>
                    </div>

                    <div className="promoter-actions">
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
                  </div>
                </div>

                <div className="mini-stat-grid">
                  <article>
                    <small>Registrations</small>
                    <strong>{stats.registrations}</strong>
                  </article>
                  <article>
                    <small>Total Guests</small>
                    <strong>{stats.totalPartySize}</strong>
                  </article>
                  <article>
                    <small>Checked In</small>
                    <strong>{stats.checkedIn}</strong>
                  </article>
                  <article>
                    <small>Conversion</small>
                    <strong>{stats.conversionPercentage}%</strong>
                  </article>
                </div>

                <div className="mini-subheading">Recent registrations</div>

                <div className="recent-registration-list">
                  {recentGuests.map((guest) => (
                    <div className="recent-registration-row" key={guest.id}>
                      <div>
                        <strong>{guest.name}</strong>
                        <span>{formatDateTime(guest.registeredAt)}</span>
                      </div>

                      <div>
                        <small>{guest.phone}</small>
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
                            ? "Clean"
                            : guest.status === "flagged"
                              ? "Red Flag"
                              : "Pending"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
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
