import { useCallback,useEffect,useMemo,useState } from "react";
import Shell from "../components/Shell";
import { api } from "../api/client";
import { formatDateTime } from "../utils/dates";

export default function PromoterPage({
  promoterSlug,
  qrToken,
}: {
  promoterSlug: string;
  qrToken?: string;
}) {
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
