import { useCallback,useEffect,useMemo,useState } from "react";
import Shell from "../components/Shell";
import { api } from "../api/client";
import { formatDateTime } from "../utils/dates";

export default function JoinTokenPage({ token }: { token: string }) {
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
    <PromoterPage
      promoterSlug={data.promoterSlug}
      qrToken={token}
    />
  );
}
