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
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        t.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setScanning(true);
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

      // @ts-ignore - BarcodeDetector may not be in TS types
      if (!("BarcodeDetector" in window)) {
        setSupported(false);
        setManualMode(true);
        stopCamera();
        return;
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

      const detect = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(detect);
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            stopCamera();
            setScanning(false);
            onDetected(code);
            onClose();
            return;
          }
        } catch (_) {}
        animFrameRef.current = requestAnimationFrame(detect);
      };
      animFrameRef.current = requestAnimationFrame(detect);
    } catch (e: unknown) {
      setScanning(false);
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError(
          "Camera permission denied. Please allow camera access and try again.",
        );
      } else {
        setError("Could not access camera. Use manual entry below.");
      }
      setManualMode(true);
    }
  }, [stopCamera, onDetected, onClose]);

  useEffect(() => {
    if (open && !manualMode) {
      startCamera();
    }
    return () => {
      if (!open) stopCamera();
    };
  }, [open, manualMode, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setScanning(false);
      setManualBarcode("");
      setError("");
      setManualMode(false);
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

        {!manualMode ? (
          <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {/* Corner brackets */}
              <div className="relative w-56 h-36">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-saffron rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-saffron rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-saffron rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-saffron rounded-br" />
                {/* Scanning line animation */}
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
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {error && (
          <div className="mx-4 mt-2 text-sm text-red-500 bg-red-50 rounded px-3 py-2">
            {error}
          </div>
        )}

        {!supported && (
          <div className="mx-4 mt-2 text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
            Barcode scanner not supported in this browser. Please use Chrome on
            Android for camera scanning, or type the barcode below.
          </div>
        )}

        <div className="px-4 pb-4 pt-2 space-y-3">
          {!manualMode ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                stopCamera();
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
              {!!supported && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    setManualMode(false);
                    setError("");
                    startCamera();
                  }}
                >
                  <ScanLine className="w-4 h-4" /> Use camera instead
                </Button>
              )}
            </div>
          )}
        </div>

        <style>{`
          @keyframes scanline {
            0%, 100% { transform: translateY(-16px); }
            50% { transform: translateY(16px); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
