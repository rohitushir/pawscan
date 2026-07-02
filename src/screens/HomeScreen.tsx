import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";
import { detectBreedBase64 } from "../lib/detect.ts";
import { resolveAndRecord } from "../lib/unlock.ts";
import { LoadingState } from "../components/LoadingState.tsx";
import type { DetectResult, ScanOutcome } from "../types.ts";
import "./HomeScreen.css";

interface HomeScreenProps {
  onScanned: (outcome: ScanOutcome) => void;
}

function mediaTypeForFormat(format: string | undefined): string {
  const normalized = format?.toLowerCase();
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "gif") return "image/gif";
  return "image/jpeg";
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** Entry point: camera-only scan flow. No gallery or file-upload path. */
export function HomeScreen({ onScanned }: HomeScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => () => stopWebCamera(), []);

  // Attach the stream once the <video> is actually mounted. Setting srcObject
  // inside startWebCamera doesn't work: setCameraActive(true) is what mounts the
  // element, so videoRef.current is still null in that same tick.
  useEffect(() => {
    if (!cameraActive) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    // Autoplay is allowed here (muted + playsInline + user-initiated), but
    // ignore rejections so a transient play() error doesn't surface as a crash.
    void video.play().catch(() => {});
  }, [cameraActive]);

  function stopWebCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function processDetection(run: () => Promise<DetectResult>) {
    setError(null);
    setBusy(true);
    try {
      const result = await run();
      const outcome = resolveAndRecord(result);
      stopWebCamera();
      onScanned(outcome);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (!message.toLowerCase().includes("cancel")) setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleNativeScan() {
    await processDetection(async () => {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear,
        quality: 78,
        width: 1400,
        height: 1400,
        correctOrientation: true,
        saveToGallery: false,
      });

      if (!photo.base64String) {
        throw new Error("Could not read the captured image");
      }

      return detectBreedBase64(photo.base64String, mediaTypeForFormat(photo.format));
    });
  }

  async function startWebCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera capture is not available in this browser");
      return;
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1400 },
          height: { ideal: 1400 },
        },
      });
      streamRef.current = stream;
      setCameraActive(true); // the effect above attaches the stream once mounted
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera permission was denied";
      setError(message);
      stopWebCamera();
    }
  }

  function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 4000): Promise<boolean> {
    if (video.videoWidth && video.videoHeight) return Promise.resolve(true);
    return new Promise((resolve) => {
      const done = (ok: boolean) => {
        clearTimeout(timer);
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("loadeddata", onReady);
        resolve(ok);
      };
      const onReady = () => done(!!(video.videoWidth && video.videoHeight));
      const timer = setTimeout(() => done(!!(video.videoWidth && video.videoHeight)), timeoutMs);
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("loadeddata", onReady);
    });
  }

  async function captureWebScan() {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      setError("Camera is not ready yet");
      return;
    }

    // The preview may still be loading its first frame right after permission.
    if (!(await waitForVideoReady(video))) {
      setError("Camera is not ready yet — give it a second and try again");
      return;
    }

    await processDetection(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture camera frame");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return detectBreedBase64(canvasToBase64(canvas), "image/jpeg");
    });
  }

  function handleScanClick() {
    if (isNative) {
      void handleNativeScan();
      return;
    }

    if (cameraActive) {
      void captureWebScan();
      return;
    }

    void startWebCamera();
  }

  if (busy) return <LoadingState />;

  return (
    <div className="home">
      <div className="home-hero">
        <div className={"home-frame " + (cameraActive ? "camera-active" : "")}>
          {cameraActive && (
            <video
              ref={videoRef}
              className="home-video"
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview"
            />
          )}
          <div className="home-frame-inner">
            <span className="home-camera-emoji" aria-hidden="true">
              📸
            </span>
            <p className="home-frame-hint muted">
              Point at a pup and scan to reveal its breed
            </p>
          </div>
          <span className="home-corner tl" />
          <span className="home-corner tr" />
          <span className="home-corner bl" />
          <span className="home-corner br" />
        </div>
      </div>

      <div className="home-actions">
        {error && <p className="home-error">⚠️ {error}</p>}
        <button className="btn" onClick={handleScanClick} disabled={busy}>
          {cameraActive && !isNative ? "📷 Capture Scan" : "📷 Scan a Dog"}
        </button>
        {cameraActive && !isNative && (
          <button className="link-btn" onClick={stopWebCamera} type="button">
            Cancel camera
          </button>
        )}
        <p className="home-tip muted center">
          Camera-only scans help keep badge collection fair
        </p>
      </div>
    </div>
  );
}
