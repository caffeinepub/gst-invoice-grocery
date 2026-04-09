import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Html5Qrcode } from "html5-qrcode";
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
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
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

const READER_ID = "html5qrcode-reader";

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
  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const scannerStarted = useRef(false);

  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  // ── stopScanner ─────────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (!html5QrRef.current) return;
    try {
      if (scannerStarted.current) {
        await html5QrRef.current.stop();
        scannerStarted.current = false;
      }
      html5QrRef.current.clear();
    } catch (_) {}
    html5QrRef.current = null;
  }, []);

  // ── startScanner ────────────────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    setError("");
    setScanning(false);

    // Wait for the div to be in the DOM
    await new Promise<void>((r) => setTimeout(r, 350));

    const divEl = document.getElementById(READER_ID);
    if (!divEl) return;

    // Stop any previous instance
    await stopScanner();

    try {
      const scanner = new Html5Qrcode(READER_ID);
      html5QrRef.current = scanner;

      await scanner.start(
        // Do NOT use { exact: "environment" } — it breaks iOS
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          playBeep();
          void stopScanner();
          setScanning(false);
          onDetected(decodedText);
          onClose();
        },
        // Per-frame error callback — ignore (fires constantly while scanning)
        undefined,
      );
      scannerStarted.current = true;
      setScanning(true);
    } catch (e: unknown) {
      scannerStarted.current = false;
      html5QrRef.current = null;
      setScanning(false);
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      if (
        msg.includes("permission") ||
        msg.includes("notallowed") ||
        msg.includes("denied")
      ) {
        setError(
          "Camera access denied. On iPhone: go to Settings → Safari → Camera and allow access, then try again.",
        );
      } else {
        setError(
          "Could not start camera. Use manual entry below, or allow camera access in browser settings.",
        );
      }
      setManualMode(true);
    }
  }, [onDetected, onClose, stopScanner]);

  // Start scanner when dialog opens (and not in manual mode)
  useEffect(() => {
    if (open && !manualMode) {
      void startScanner();
    }
  }, [open, manualMode, startScanner]);

  // Full reset when dialog closes
  useEffect(() => {
    if (!open) {
      void stopScanner();
      setScanning(false);
      setManualBarcode("");
      setError("");
      setManualMode(false);
    }
  }, [open, stopScanner]);

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
          <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
            {/* html5-qrcode mounts its own video element inside this div */}
            <div
              id={READER_ID}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                background: "#000",
              }}
            />

            {/* Corner viewfinder overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="relative w-56 h-56">
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    boxShadow: scanning
                      ? "0 0 0 2px rgba(34,197,94,0.7)"
                      : "0 0 0 2px rgba(251,191,36,0.7)",
                    transition: "box-shadow 0.3s",
                  }}
                />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-saffron rounded-tl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-saffron rounded-tr" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-saffron rounded-bl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-saffron rounded-br" />
                <div
                  className="absolute left-0 right-0 h-0.5 bg-saffron opacity-80"
                  style={{
                    animation: scanning
                      ? "scanline 1.5s ease-in-out infinite"
                      : "none",
                    top: "50%",
                  }}
                />
              </div>
              <p className="text-white text-xs mt-3 bg-black/60 px-3 py-1 rounded-full">
                {scanning ? "📷 Point camera at barcode" : "Starting camera..."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 z-20 bg-black/50 text-white rounded-full p-1"
              aria-label="Close scanner"
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
                void stopScanner();
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
                }}
              >
                <ScanLine className="w-4 h-4" /> Use camera instead
              </Button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes scanline {
            0%, 100% { transform: translateY(-20px); }
            50% { transform: translateY(20px); }
          }
          /* Force html5-qrcode video to fill its container */
          #${READER_ID} video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            position: absolute !important;
            top: 0;
            left: 0;
          }
          /* Hide html5-qrcode's built-in header/controls */
          #${READER_ID} > img,
          #${READER_ID}__header_message,
          #${READER_ID}__dashboard,
          #${READER_ID}__dashboard_section_csr,
          #${READER_ID}__status_span {
            display: none !important;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
