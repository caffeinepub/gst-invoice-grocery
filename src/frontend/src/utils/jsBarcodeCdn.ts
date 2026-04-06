// CDN loader for JsBarcode library
// Loaded on demand from unpkg (no npm dep required)

let jsBarcodePromise: Promise<boolean> | null = null;

export function loadJsBarcode(): Promise<boolean> {
  if (jsBarcodePromise) return jsBarcodePromise;
  jsBarcodePromise = new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).JsBarcode) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return jsBarcodePromise;
}

interface JsBarcodeOptions {
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
  text?: string;
}

export function renderJsBarcode(
  element: SVGElement | HTMLElement,
  value: string,
  options: JsBarcodeOptions = {},
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JsB = (window as any).JsBarcode;
  if (!JsB) return false;
  try {
    JsB(element, value, options);
    return true;
  } catch {
    return false;
  }
}
