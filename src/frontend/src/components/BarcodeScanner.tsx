import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Keyboard, ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Audio helpers ─────────────────────────────────────────────────────────────
// unlockAudio() MUST be called during a user-gesture (button click) so iOS Safari
// allows AudioContext to play later from async scan callbacks.
let _audioCtx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC =
      window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext;
    if (!AC) return;
    if (!_audioCtx) _audioCtx = new AC();
    if (_audioCtx.state === "suspended") void _audioCtx.resume();
  } catch (_) {}
}

function playBeep() {
  try {
    if (!_audioCtx) return;
    if (_audioCtx.state === "suspended") void _audioCtx.resume();
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.frequency.value = 1800;
    osc.type = "square";
    gain.gain.setValueAtTime(0.35, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.18);
    osc.start(_audioCtx.currentTime);
    osc.stop(_audioCtx.currentTime + 0.18);
  } catch (_) {}
}
// ─────────────────────────────────────────────────────────────────────────────

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export default function BarcodeScanner({
  open,
  onClose,
  onDetected,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeAnimRef = useRef<number>(0);
  const nativeDetectorRef = useRef<unknown>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);

  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  // Track which render path is active so the correct DOM element is rendered
  // before html5-qrcode tries to mount into it.
  const [useHtml5Path, setUseHtml5Path] = useState(false);

  // ── stopCamera ─────────────────────────────────────────────────────────────
  const stopCamera = useCallback(async () => {
    cancelAnimationFrame(nativeAnimRef.current);
    nativeDetectorRef.current = null;

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }

    // html5-qrcode stop (async)
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
      } catch (_) {}
      html5QrRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // ── startCamera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError("");
    setScanning(false);

    const hasNativeDetector = "BarcodeDetector" in window;

    if (hasNativeDetector) {
      // ── Native BarcodeDetector (Android Chrome, Desktop Chrome/Edge) ────
      setUseHtml5Path(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // @ts-ignore
        const detector = new window.BarcodeDetector({
          formats: [
            "ean_13",
            "ean_8",
            "code_128",
            "code_39",
            "qr_code",
            "upc_a",
            "upc_e",
            "itf",
          ],
        });
        nativeDetectorRef.current = detector;
        setScanning(true);

        const detect = async () => {
          if (!nativeDetectorRef.current) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            nativeAnimRef.current = requestAnimationFrame(detect);
            return;
          }
          try {
            // @ts-ignore
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              playBeep();
              const code = barcodes[0].rawValue;
              await stopCamera();
              setScanning(false);
              onDetected(code);
              onClose();
              return;
            }
          } catch (_) {}
          nativeAnimRef.current = requestAnimationFrame(detect);
        };
        nativeAnimRef.current = requestAnimationFrame(detect);
      } catch (e: unknown) {
        setScanning(false);
        const msg = (e instanceof Error ? e.message : "").toLowerCase();
        if (
          msg.includes("permission") ||
          msg.includes("notallowed") ||
          msg.includes("denied")
        ) {
          setError(
            "Camera permission denied. Please allow camera access in your browser settings and try again.",
          );
        } else {
          setError("Could not access camera. Use manual entry below.");
        }
        setManualMode(true);
      }
    } else {
      // ── html5-qrcode fallback (iOS Safari, iOS Chrome, Firefox) ──────────
      // html5-qrcode works natively on iOS and doesn't require BarcodeDetector.
      setUseHtml5Path(true);

      const available = await loadHtml5Qrcode();
      if (!available) {
        setScanning(false);
        setError(
          "Camera scanning not supported on this browser. Please type the barcode manually.",
        );
        setManualMode(true);
        return;
      }

      // Wait for React to re-render the div#html5-qrcode-region into the DOM
      await new Promise<void>((r) => setTimeout(r, 150));

      // Safety: abort if the dialog was closed while we were waiting
      const divEl = document.getElementById("html5-qrcode-region");
      if (!divEl) {
        setScanning(false);
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const html5QrCode = new (window as any).Html5Qrcode(
          "html5-qrcode-region",
        );
        html5QrRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 130 },
          },
          (decodedText: string) => {
            playBeep();
            void stopCamera();
            setScanning(false);
            onDetected(decodedText);
            onClose();
          },
          undefined, // per-frame error callback (ignore)
        );
        setScanning(true);
      } catch (e: unknown) {
        setScanning(false);
        const msg = (e instanceof Error ? e.message : "").toLowerCase();
        if (
          msg.includes("permission") ||
          msg.includes("notallowed") ||
          msg.includes("denied")
        ) {
          setError(
            "Camera access denied. On iPhone: go to Settings → Safari → Camera and allow access, then try again.",
          );
        } else {
          setError("Could not start camera. Use manual entry below.");
        }
        setManualMode(true);
      }
    }
  }, [onDetected, onClose, stopCamera]);

  // Start camera when dialog opens
  useEffect(() => {
    if (open && !manualMode) {
      void startCamera();
    }
    return () => {
      if (!open) void stopCamera();
    };
  }, [open, manualMode, startCamera, stopCamera]);

  // Full reset when dialog closes
  useEffect(() => {
    if (!open) {
      void stopCamera();
      setScanning(false);
      setManualBarcode("");
      setError("");
      setManualMode(false);
      setUseHtml5Path(false);
    }
  }, [open, stopCamera]);

  const submitManual = () => {
    const code = manualBarcode.trim();
    if (!code) return;
    onDetected(code);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-saffron" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>

        {!manualMode && (
          <div
            className="relative bg-black overflow-hidden"
            style={{ aspectRatio: "4/3" }}
          >
            {/* Native BarcodeDetector path — own <video> element */}
            {!useHtml5Path && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
            )}

            {/* html5-qrcode path — mounts its own <video> inside this div */}
            {useHtml5Path && (
              <div
                id="html5-qrcode-region"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  background: "black",
                }}
              />
            )}

            {/* Scanning overlay — sits above both paths */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="relative w-56 h-36">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-saffron rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-saffron rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-saffron rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-saffron rounded-br" />
                <div
                  className="absolute left-2 right-2 h-0.5 bg-saffron opacity-80"
                  style={{
                    animation: "scanline 1.5s ease-in-out infinite",
                    top: "50%",
                  }}
                />
              </div>
              <p className="text-white text-xs mt-3 bg-black/50 px-3 py-1 rounded-full">
                {scanning ? "Point camera at barcode" : "Starting camera..."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 z-20 bg-black/50 text-white rounded-full p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-2 text-sm text-red-500 bg-red-50 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="px-4 pb-4 pt-2 space-y-3">
          {!manualMode ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                void stopCamera();
                setManualMode(true);
              }}
            >
              <Keyboard className="w-4 h-4" /> Type barcode manually
            </Button>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Enter Barcode / SKU</Label>
              <div className="flex gap-2">
                <Input
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitManual()}
                  placeholder="Scan or type barcode..."
                  autoFocus
                  className="flex-1"
                />
                <Button
                  onClick={submitManual}
                  disabled={!manualBarcode.trim()}
                  className="bg-saffron hover:bg-saffron-dark text-white"
                >
                  OK
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  setManualMode(false);
                  setError("");
                  void startCamera();
                }}
              >
                <ScanLine className="w-4 h-4" /> Use camera instead
              </Button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes scanline {
            0%, 100% { transform: translateY(-16px); }
            50% { transform: translateY(16px); }
          }
          /* Force html5-qrcode video to fill its container */
          #html5-qrcode-region video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            position: absolute !important;
            top: 0;
            left: 0;
          }
          /* Hide html5-qrcode's built-in controls we don't need */
          #html5-qrcode-region > img { display: none !important; }
          #html5-qrcode-region__header_message { display: none !important; }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

// ── CDN loader for html5-qrcode (iOS-compatible barcode scanning) ─────────────
let html5QrPromise: Promise<boolean> | null = null;

function loadHtml5Qrcode(): Promise<boolean> {
  if (html5QrPromise) return html5QrPromise;
  html5QrPromise = new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Html5Qrcode) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.onload = () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve(typeof (window as any).Html5Qrcode !== "undefined");
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return html5QrPromise;
}
