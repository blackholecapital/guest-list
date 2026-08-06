import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import StatCard from "../components/StatCard";
import { api } from "../api/client";

export default function PromotersDashboardPage() {
  const [data, setData] = useState(DEMO_STATS);
  const [guests, setGuests] = useState(DEMO_GUESTS);
  const [notice, setNotice] = useState<string | null>(
    "Showing demo promoter data until live data is available.",
  );

  useEffect(() => {
    void Promise.all([
      api<any>("/api/analytics"),
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
                      src={`/assets/${promoter.promoterSlug}_guest_list_qr.png`}
                      alt={`${promoter.promoterName} guest-list QR code`}
                    />
                  </div>
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
