// CDN loader for qrcode library
// Loaded on demand from unpkg (no npm dep required)

let qrPromise: Promise<boolean> | null = null;

function loadQrCode(): Promise<boolean> {
  if (qrPromise) return qrPromise;
  qrPromise = new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).QRCode) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return qrPromise;
}

export async function generateQrDataUrl(
  text: string,
  width = 80,
): Promise<string> {
  try {
    const ok = await loadQrCode();
    if (!ok) return "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR = (window as any).QRCode;
    if (!QR) return "";
    const canvas = document.createElement("canvas");
    await QR.toCanvas(canvas, text, { width, margin: 1 });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

export async function generateQrToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  width = 100,
): Promise<void> {
  try {
    const ok = await loadQrCode();
    if (!ok) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR = (window as any).QRCode;
    if (!QR) return;
    await QR.toCanvas(canvas, text, {
      width,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    // silently ignore QR gen errors
  }
}
