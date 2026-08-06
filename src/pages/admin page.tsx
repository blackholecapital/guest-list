import { useEffect, useState } from "react";
import Shell from "../components/Shell";
import { api } from "../api/client";

export default function AdminPage() {

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
    void api<any>("/api/demo-settings").then((r)=>{
      if("error" in r) return;

      setDemoPhone(r.data.test_phone ?? "");
      setDemoUnlimited(Boolean(r.data.unlimited_joins));
      setDemoDuplicate(Boolean(r.data.bypass_duplicates));
      setDemoSms(Boolean(r.data.always_send_sms));
    });

    void api<any>("/api/analytics").then((result) => {
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
