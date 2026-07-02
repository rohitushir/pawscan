import type { ScanOutcome, Tier } from "../types.ts";

const TIER_COLOR: Record<Tier, string> = {
  Common: "#8ea0b8",
  Uncommon: "#5ec98a",
  Rare: "#7c8cff",
  Mystery: "#c98cff",
};

const W = 1080;
const H = 1350;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw the shareable result card to an offscreen canvas → PNG blob. */
async function renderCard(outcome: ScanOutcome): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const ring = TIER_COLOR[outcome.badge.tier];

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#23264d");
  bg.addColorStop(1, "#0f1020");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Brand
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffb454";
  ctx.font = "800 56px -apple-system, Segoe UI, sans-serif";
  ctx.fillText("🐾 PawScan", W / 2, 130);

  // Medallion
  const cx = W / 2;
  const cy = 560;
  const radius = 230;
  const grad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  grad.addColorStop(0, ring);
  grad.addColorStop(1, "#12131f");
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = ring;
  ctx.stroke();

  // Glyph
  ctx.font = "200px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(outcome.badge.emoji, cx, cy + 10);
  ctx.textBaseline = "alphabetic";

  // Tier pill
  ctx.font = "700 34px -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = ring;
  const tierText = outcome.badge.tier.toUpperCase();
  const pillW = ctx.measureText(tierText).width + 60;
  roundRect(ctx, cx - pillW / 2, 880, pillW, 62, 31);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();
  ctx.fillStyle = ring;
  ctx.fillText(tierText, cx, 922);

  // Breed name
  ctx.fillStyle = "#f3f1ff";
  ctx.font = "800 72px -apple-system, Segoe UI, sans-serif";
  ctx.fillText(outcome.badge.breed, cx, 1030);

  // Confidence
  ctx.fillStyle = "#a7a3d6";
  ctx.font = "600 40px -apple-system, Segoe UI, sans-serif";
  const pct = Math.round(outcome.confidence * 100);
  const conf =
    outcome.badge.badgeId === "mystery-mix"
      ? "A one-of-a-kind mystery mix!"
      : `${pct}% match`;
  ctx.fillText(conf, cx, 1090);

  // Fun fact (wrapped)
  ctx.font = "400 34px -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "#cfcbf0";
  wrapText(ctx, outcome.notes, cx, 1170, W - 180, 46);

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not render card"))),
      "image/png",
    ),
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

/**
 * Render the card and share it. Uses the Web Share API with a file where
 * available (iOS Safari), otherwise triggers a PNG download.
 */
export async function shareOutcome(outcome: ScanOutcome): Promise<void> {
  const blob = await renderCard(outcome);
  const fileName = `pawscan-${outcome.badge.badgeId}.png`;
  const file = new File([blob], fileName, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: "PawScan",
        text: `I just unlocked ${outcome.badge.breed} on PawScan! 🐾`,
      });
      return;
    } catch (err) {
      // User canceled the share sheet — not an error worth surfacing.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  // Fallback: download the PNG.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
