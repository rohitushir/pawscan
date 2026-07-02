import { Capacitor } from "@capacitor/core";
import type { DetectResult } from "../types.ts";

const DETECT_ENDPOINT = import.meta.env.VITE_DETECT_API_URL || "/api/detect";


function assertDetectEndpoint() {
  if (Capacitor.isNativePlatform() && !import.meta.env.VITE_DETECT_API_URL) {
    throw new Error(
      "Native iOS builds need VITE_DETECT_API_URL set to your deployed /api/detect endpoint",
    );
  }
}

async function postDetection(imageBase64: string, mediaType: string): Promise<DetectResult> {
  assertDetectEndpoint();
  const res = await fetch(DETECT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mediaType }),
  });

  if (!res.ok) {
    let detail = `Detection failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as DetectResult;
  if (!data || !Array.isArray(data.breeds)) {
    throw new Error("Unexpected response from detector");
  }
  return data;
}


/** Send an already-compressed base64 image to the detection proxy. */
export async function detectBreedBase64(
  imageBase64: string,
  mediaType = "image/jpeg",
): Promise<DetectResult> {
  return postDetection(imageBase64, mediaType);
}
