# GST Invoice - Grocery

## Current State
Full GST invoicing app with barcode scanning (Android + iOS fallback via ZXing CDN), admin panel, products, thermal print animation, and Help & Support page. The barcode scanner component (`BarcodeScanner.tsx`) currently loads `@zxing/browser@0.1.4` from unpkg CDN and calls `window.ZXing.BrowserMultiFormatReader` — but that package's UMD global is `ZXingBrowser`, not `ZXing`, causing the iOS path to fail silently (ZXing never loads correctly). App theme is saffron + indigo.

## Requested Changes (Diff)

### Add
- **Shyama Chatbot** (`ShyamaChatbot.tsx`): floating chat button (bottom-right, above mobile nav) with saffron/indigo gradient avatar icon themed to match BillKaro. Opens a sliding chat panel. Contains a comprehensive keyword-based Q&A knowledge base covering: how to use the app, why to use BillKaro, menu navigation (all tabs explained), how to generate first invoice step-by-step, app benefits, how to use the printer / thermal print animation, barcode scanning, product management, admin panel, credits/recharge, stock management, customer details, Excel import. Each answer should include a speak button (🔊) that uses `window.speechSynthesis` to read the answer aloud. The chatbot should also have a "Speak" mode toggle button that auto-reads every response. Include suggested quick-tap questions so users don't have to type. The chatbot should show a typing indicator before responding. Knowledge base should be comprehensive (~15-20 Q&A entries at minimum). The floating button shows "Shyama" name label on hover. Integrate into `App.tsx` — show when user is logged in (both active and inactive).

### Modify
- **BarcodeScanner.tsx**: Fix iOS scanning. Replace the CDN `@zxing/browser` (broken UMD namespace) with `html5-qrcode@2.3.8` from CDN (`https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js`). The `html5-qrcode` library exports `window.Html5Qrcode` globally and has native iOS Safari support. Restructure the ZXing fallback path to use `Html5Qrcode` with a div container (not video element). For browsers without native `BarcodeDetector`, use `Html5Qrcode` with `{ facingMode: "environment" }`. Keep the native BarcodeDetector path for Android Chrome as-is (it works). Keep the beep sound and manual entry fallback. Remove `@zxing/browser` CDN loader, replace with `html5-qrcode` loader.

### Remove
- Nothing removed

## Implementation Plan
1. Fix `BarcodeScanner.tsx`: Replace ZXing CDN with html5-qrcode CDN. In the ZXing fallback path, use `Html5Qrcode` instance with a div element (`id="html5-qrcode-region"`). Use `html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, callback)` to start scanning. On success call beep + onDetected. On stop/unmount call `html5QrCode.stop()`. Show the scanning overlay on top of the div region.
2. Create `ShyamaChatbot.tsx` with full knowledge base, quick questions, speak functionality, typing indicator, saffron/indigo themed floating button.
3. Import and render `ShyamaChatbot` in `App.tsx` when logged in.
