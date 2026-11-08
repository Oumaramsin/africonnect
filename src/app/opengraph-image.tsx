import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Image de partage du site (réseaux sociaux, messageries), générée une fois au build.
// Les pages publiques y renvoient via DEFAULT_SHARE_IMAGE (src/lib/site.ts, même texte alternatif).
export const alt = "Dabari - Traiteurs africains et transport de colis GP pour la diaspora";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Logo de l'application ; en cas d'échec de lecture, l'image reste purement typographique
  const logoSrc = await readFile(join(process.cwd(), "src/app/icon.png"))
    .then((data) => `data:image/png;base64,${data.toString("base64")}`)
    .catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 80px",
          position: "relative",
          backgroundColor: "#165034",
          backgroundImage: "linear-gradient(135deg, #0c3924 0%, #165034 55%, #1D6B45 100%)",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: 9999,
            backgroundColor: "rgba(212, 135, 10, 0.22)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -120,
            width: 380,
            height: 380,
            borderRadius: 9999,
            backgroundColor: "rgba(52, 211, 153, 0.12)",
          }}
        />

        {logoSrc && (
          <div
            style={{
              width: 260,
              height: 260,
              marginRight: 64,
              borderRadius: 48,
              backgroundColor: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- rendu par next/og, pas par le navigateur */}
            <img src={logoSrc} width={220} height={220} alt="" />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 112, letterSpacing: -3, lineHeight: 1 }}>Dabari</div>
          <div style={{ fontSize: 44, marginTop: 28, color: "#FAF7F2", lineHeight: 1.2 }}>
            Traiteurs africains & transport de colis GP
          </div>
          <div style={{ fontSize: 30, marginTop: 20, color: "rgba(255, 255, 255, 0.82)", lineHeight: 1.3 }}>
            La plateforme de confiance de la diaspora africaine : traiteurs et colis GP.
          </div>
          <div style={{ fontSize: 30, marginTop: 36, color: "#FBBF24" }}>www.dabari.fr</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
