import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell";
import { api } from "../api/client";
import { formatDateTime } from "../utils/dates";

export default function GuestListPage() {
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
