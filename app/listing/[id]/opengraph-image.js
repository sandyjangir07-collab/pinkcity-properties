import { ImageResponse } from "next/og";
import { sb } from "../../../lib/supabase";

export const runtime = "edge";
export const alt = "PinkCity Properties listing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }) {
  const { data } = await sb
    .from("listings")
    .select("title,area,price,image_url,images,verified")
    .eq("id", params.id)
    .maybeSingle();

  const image = data?.image_url || data?.images?.[0];
  const title = data?.title || "Verified Property in Jaipur";
  const area = data?.area ? `${data.area}, Jaipur` : "Jaipur, Rajasthan";
  const price = data?.price || "Contact for price";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#F7F0E4",
          fontFamily: "sans-serif",
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(34,26,23,0.88) 0%, rgba(34,26,23,0.35) 55%, rgba(34,26,23,0.05) 100%)",
            display: "flex",
          }}
        />
        <div style={{ position: "absolute", top: 48, left: 48, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "#C43868",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 34, color: "white" }}>P</div>
          </div>
          <div style={{ fontSize: 34, color: "white", fontWeight: 700 }}>PinkCity.</div>
        </div>

        {data?.verified && (
          <div
            style={{
              position: "absolute",
              top: 52,
              right: 48,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#C43868",
              color: "white",
              padding: "10px 22px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            ✓ PinkCity Verified
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 48,
            right: 48,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.75)", marginBottom: 10, display: "flex" }}>{area}</div>
          <div style={{ fontSize: 56, color: "white", fontWeight: 700, marginBottom: 18, display: "flex", maxWidth: 900 }}>{title}</div>
          <div style={{ fontSize: 40, color: "#FC8EAC", fontWeight: 700, display: "flex" }}>{price}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
