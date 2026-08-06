import { useCallback,useEffect,useMemo,useState } from "react";
import Shell from "../components/Shell";
import { api } from "../api/client";
import { formatDateTime } from "../utils/dates";

export default function PromoterControlPage({ promoterSlug }: { promoterSlug: string }) {
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

          <p>
            Passes Remaining: {promoter?.passes_remaining ?? 0}
          </p>
          <p>
            Reset: {promoter?.reset_days ?? 0} days
          </p>

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

              <div
                style={{
                  border:`6px solid ${promoterColor(promoterSlug)}`,
                  borderRadius:"20px",
                  padding:"12px",
                  display:"inline-block"
                }}
              >
                <img
                  src={qrImage}
                  alt="Promoter QR code"
                />
              </div>
            </div>
          )}

          <VipPackages />
        </section>
      </main>
    </Shell>
  );
}
