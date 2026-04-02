# GST Invoice - Grocery

## Current State
App is live with Dashboard, Products, Invoices, StoreSetup, Admin, Help pages. Dashboard shows store logo with a rounded box shape. No expiry product list on dashboard. Invoices page has CSV export but no ZIP download. BarcodeScanner uses html5-qrcode via CDN script tag (unreliable on iOS Chrome). Help page has 7 steps with current features.

## Requested Changes (Diff)

### Add
- Dashboard: expiry + upcoming expiry products section (within 30 days) showing product name, barcode/SKU, and remaining qty, with color-coded badges (red=expired, amber=expiring soon)
- Invoices: "Download ZIP" button that uses JSZip to create a zip file containing one HTML receipt file per invoice between the selected dates
- Help page: new steps/entries for barcode scanning, expiry tracking, and ZIP invoice download

### Modify
- Dashboard: store logo should display with no background shape/border — just a transparent img with `object-contain` (remove `rounded-2xl border-2 border-white/40 shadow-lg` classes)
- BarcodeScanner: replace CDN-loaded html5-qrcode with direct npm import `import { Html5Qrcode } from 'html5-qrcode'` for reliability on iOS Chrome/Safari
- Help page: update step count and add descriptions for new features

### Remove
- BarcodeScanner: remove CDN loader function `loadHtml5Qrcode()` and the `<script>` injection approach

## Implementation Plan
1. Update Dashboard.tsx: remove logo shape styling, add expiry products card
2. Update BarcodeScanner.tsx: import Html5Qrcode from npm, remove CDN loader
3. Update Invoices.tsx: add JSZip import, add handleExportZip function, add ZIP button next to CSV button
4. Update HelpSupport.tsx: add new steps and feature entries
