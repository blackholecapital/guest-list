import { useCallback, useEffect, useState } from "react";
import Shell from "../components/Shell";
import StatCard from "../components/StatCard";
import { api } from "../api/client";

export default function StatsPage() {
  const [data, setData] = useState(DEMO_STATS);
  const [notice, setNotice] = useState<string | null>(
    "Showing demo statistics until live data is available.",
  );

  const loadStats = useCallback(async () => {
    try {
      const [statsResult, analyticsResult] = await Promise.all([
        api<any>("/api/stats"),
        api<any>("/api/analytics"),
      ]);

      if ("error" in statsResult) {
        setData(DEMO_STATS);
        setNotice("Showing demo statistics until live data is available.");
        return;
      }

      const payload = statsResult.data as any;
      const analytics =
        "error" in analyticsResult
          ? {}
          : analyticsResult.data;

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
          qrGenerated: Number(analytics.qrGenerated ?? 0),
          qrScanned: Number(analytics.qrScanned ?? 0),
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
          passLimit: Number(promoter.passes_remaining ?? promoter.passLimit ?? promoter.pass_limit ?? 0),
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
              <article className="promoter-stat-card" key={promoter.promoterSlug}>
                <strong>{promoter.promoterName}</strong>

                <select
                  value={(promoter as any).passesRemaining ?? (promoter as any).passLimit ?? 0}
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
