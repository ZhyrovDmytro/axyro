import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Axyro. You play padel. Do you train for it? A standing dumbbell wood chop demonstration.";

export default async function ShareImage() {
  const poster = await readFile(
    path.join(process.cwd(), "public/images/landing/wood-chop-preview.png"),
  );
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#141414",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "55%",
          padding: 52,
        }}
      >
        <span style={{ fontSize: 38, color: "#d9fc54" }}>Axyro</span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            lineHeight: 1.04,
            letterSpacing: -3,
          }}
        >
          <span>You play padel.</span>
          <span>Do you train for it?</span>
        </div>
        <span style={{ fontSize: 28 }}>Guided home workouts for padel</span>
      </div>
      {/* ImageResponse renders this source directly into the share card. */}
      <img
        src={`data:image/png;base64,${poster.toString("base64")}`}
        alt=""
        width={540}
        height={630}
        style={{ objectFit: "cover" }}
      />
    </div>,
    size,
  );
}
