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
            <a href="/promoters">Promoters</a>
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
  const [smsOptIn, setSmsOptIn] = useState(false);
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
                <p>
                  Location is used to enforce the venue registration rules.
                </p>
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

async function savePromoterSettings(promoter:any) {
  await api("/api/promoters", {
    method: "POST",
    body: JSON.stringify({
      id: promoter.promoterId,
      passLimit: promoter.passLimit ?? 10,
      resetDays: promoter.resetDays ?? 3,
    }),
  });
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
          passLimit: Number(promoter.passLimit ?? promoter.pass_limit ?? 10),
          resetDays: Number(promoter.resetDays ?? promoter.reset_days ?? 3),
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
            <h1>Analytics Dashboard</h1>
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

        <section className="data-card promoter-performance-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Promoter performance</p>
              <h2>Analytics Funnel</h2>
              <div className="mini-stat-grid">
                <article><small>QR Generated</small><strong>0</strong></article>
                <article><small>QR Scanned</small><strong>0</strong></article>
                <article><small>Guest Registered</small><strong>{data.summary.totalRegistrations}</strong></article>
                <article><small>Checked In</small><strong>{data.summary.checkedIn}</strong></article>
              </div>
              <h2>By Promoter</h2>
            </div>
          </div>

          <div className="promoter-stats-grid">
            {data.promoters.map((promoter) => (
              <article className="promoter-stat-card" key={promoter.promoterSlug}>
                <strong>{promoter.promoterName}</strong>

                <select
                  value={(promoter as any).passLimit ?? 10}
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
                    void savePromoterSettings({
                      ...promoter,
                      passLimit: value,
                    });
                  }}
                >
                  <option value="0">0 passes</option>
                  <option value="10">10 passes</option>
                  <option value="25">25 passes</option>
                  <option value="50">50 passes</option>
                </select>

                <select
                  value={(promoter as any).resetDays ?? 3}
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
                    void savePromoterSettings({
                      ...promoter,
                      resetDays: value,
                    });
                  }}
                >
                  <option value="1">Reset 1 day</option>
                  <option value="3">Reset 3 days</option>
                  <option value="7">Reset 7 days</option>
                  <option value="30">Reset 30 days</option>
                </select>

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

function PromotersDashboardPage() {
  const [data, setData] = useState(DEMO_STATS);
  const [guests, setGuests] = useState(DEMO_GUESTS);
  const [notice, setNotice] = useState<string | null>(
    "Showing demo promoter data until live data is available.",
  );

  useEffect(() => {
    void Promise.all([
      api<any>("/api/stats"),
      api<any>("/api/guest-list"),
    ]).then(([statsResult, guestResult]) => {
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
            ? statsResult.data.promoters.map((promoter: any) => ({
                promoterId: Number(promoter.promoterId ?? 0),
                promoterName: String(promoter.promoterName ?? "Promoter"),
                promoterSlug: String(promoter.promoterSlug ?? "promoter"),
                registrations: Number(promoter.registrations ?? 0),
                totalPartySize: Number(promoter.totalPartySize ?? 0),
                checkedIn: Number(promoter.checkedIn ?? 0),
                notCheckedIn: Number(promoter.notCheckedIn ?? 0),
                redFlags: Number(promoter.notCheckedIn ?? 0),
                conversionPercentage: Number(promoter.conversionPercentage ?? 0),
              }))
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
      setNotice("Showing demo promoter data until live data is available.");
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

            return (
              <article className="data-card promoter-dashboard-card" key={promoter.promoterSlug}>
                <div className="promoter-dashboard-head">
                  <div>
                    <p className="eyebrow">Promoter</p>
                    <h2>{promoter.promoterName}</h2>
                    <code>/p/{promoter.promoterSlug}</code>
                  </div>

                  <img
                    className="promoter-qr-image"
                    src={`/assets/${promoter.promoterSlug}_guest_list_qr.png`}
                    alt={`${promoter.promoterName} guest-list QR code`}
                  />
                </div>

                <div className="mini-stat-grid promoter-dashboard-stats">
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

function AdminPage() {
  const [adminKey, setAdminKey] = useState(
    () => window.sessionStorage.getItem("guest-list-admin-key") ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [promoterStats, setPromoterStats] = useState(DEMO_STATS.promoters);

  const [venue, setVenue] = useState({
    name: VENUE.name,
    address: VENUE.address,
    phone: VENUE.phone,
    latitude: 27.962,
    longitude: -82.506,
    radiusMeters: 457,
    customerCooldownDays: 14,
    geofenceEnabled: true,
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
      });

      if (Array.isArray(remote.hours) && remote.hours.length > 0) {
        setHours(remote.hours);
      }
    });
  }, []);

  useEffect(() => {
    void api<any>("/api/stats").then((result) => {
      if ("error" in result || !Array.isArray(result.data?.promoters)) {
        return;
      }

      setPromoterStats(
        result.data.promoters.map((promoter: any) => ({
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
      );
    });
  }, []);

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
        </div>

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
              <h2>Tonight at a Glance</h2>
            </div>
            <a className="secondary-button compact-button" href="/promoters">
              Open Promoter Dashboard
            </a>
          </div>

          <div className="promoter-stats-grid">
            {promoterStats.map((promoter) => (
              <article className="promoter-stat-card" key={promoter.promoterSlug}>
                <strong>{promoter.promoterName}</strong>
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
        </section>
      </main>
    </Shell>
  );
}

function PromoterControlPage({ promoterSlug }: { promoterSlug: string }) {
  const [promoter, setPromoter] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [qrImage, setQrImage] = useState("");

  useEffect(() => {
    void api<any>("/api/config").then((result) => {
      if (!("error" in result)) {
        const found = result.data?.promoters?.find(
          (p: any) => p.slug === promoterSlug,
        );

        if (found) {
          setPromoter({
            id: Number(found.id),
            name: String(found.name),
            slug: String(found.slug),
            passLimit: Number(found.pass_limit ?? 10),
            resetDays: Number(found.reset_days ?? 3),
          });
        }
      }
    });
  }, [promoterSlug]);

  async function generateQR() {
    if (!promoter?.id) {
      return;
    }

    const result = await api<any>("/api/generate-qr", {
      method: "POST",
      body: JSON.stringify({
        promoterId: promoter.id,
      }),
    });

    if (!("error" in result)) {
      setQrUrl(result.data.url);
      setQrImage(result.data.qrCode);
    }
  }

  return (
    <Shell>
      <main className="page narrow">
        <section className="hero-card">
          <p className="eyebrow">Promoter controls</p>

          <h1>{promoter?.name ?? promoterSlug}</h1>

          <p>Passes: {promoter?.passLimit ?? 0}</p>
          <p>Reset: {promoter?.resetDays ?? 0} days</p>

          <button
            className="primary-button"
            disabled={!promoter}
            onClick={() => void generateQR()}
          >
            Generate QR Code
          </button>

          {qrUrl && (
            <div>
              <p>{qrUrl}</p>
              <img
                src={qrImage}
                alt="Promoter QR code"
              />
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}


function JoinTokenPage({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    void api<any>(`/api/qr-lookup?token=${token}`).then((r) => {
      if (!("error" in r)) {
        setData(r.data);
      }
    });
  }, [token]);

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
    <GuestListPage
      promoterSlug={data.promoterSlug}
      qrToken={token}
    />
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

  if (path === "/promoters") {
    return <PromotersDashboardPage />;
  }

  if (path === "/admin") {
    return <AdminPage />;
  }

  if (path.startsWith("/promoter/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();

    if (promoterSlug) {
      return <PromoterControlPage promoterSlug={promoterSlug} />;
    }
  }

  if (path.startsWith("/join/")) {
    const token = path.split("/")[2];

    if (token) {
      return <JoinTokenPage token={token} />;
    }
  }

  if (path.startsWith("/p/")) {
    const promoterSlug = path.split("/")[2]?.toLowerCase();

    if (promoterSlug) {
      return <PromoterPage promoterSlug={promoterSlug} />;
    }
  }

  return <NotFoundPage />;
}
