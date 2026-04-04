# GST Invoice - Grocery

## Current State

- App has a Manager PIN system stored in localStorage via `useManagerMode.ts`
- PIN is set in `StoreSetup.tsx` via a dialog (set/change only, no recovery)
- `ManagerPinDialog.tsx` is used to verify PIN for protected actions (edit store, edit/delete invoices, etc.)
- If PIN is forgotten, there is NO way to reset it — the store manager is locked out
- There is NO barcode generator/label printer in the app
- Help page (`HelpSupport.tsx`) exists with steps 1–10 but lacks barcode printing tutorial
- Shyama chatbot (`ShyamaChatbot.tsx`) exists with 21 Q&A entries but no barcode-related entries

## Requested Changes (Diff)

### Add

1. **Manager PIN Recovery/Reset**
   - In `ManagerPinDialog.tsx`: add a "Forgot PIN?" link below the PIN entry
   - Clicking "Forgot PIN?" opens a recovery sub-flow:
     - Store manager enters their store's registered **phone number** (must match exactly what is saved in store details)
     - If phone matches, PIN is cleared and manager is prompted to set a new PIN immediately
     - If phone doesn't match, show error "Phone number does not match store records"
     - This is a frontend-only check against the store data fetched via `useGetStore()` hook
   - In `StoreSetup.tsx`: add a "Reset PIN (Emergency)" section with a clear warning, allowing direct PIN reset after entering the store phone number for verification

2. **Barcode Generator Page**
   - New page: `BarcodeLabel.tsx` in `src/frontend/src/pages/`
   - Add a new tab in `App.tsx`: "Barcode" with a barcode icon (e.g. `ScanBarcode` from lucide)
   - Features:
     - **Barcode type selector**: Code128, Code39, EAN-13, EAN-8, UPC-A, QR Code — all supported sizes
     - **Product auto-fill**: dropdown to select from saved products (fetches from `useGetProducts()`) — auto-fills product name, MRP, barcode/SKU
     - **Manual entry fields**: Product Name, Barcode/SKU value, MRP (₹), Qty (number of labels to print)
     - **Store detail auto-fetch**: store name and phone auto-filled from `useGetStore()` — shown on label optionally
     - **Label preview**: live preview showing the generated barcode label with:
       - Barcode image (rendered using `JsBarcode` or `qrcode.react` library)
       - Product name below barcode
       - MRP with ₹ symbol
       - Store name (optional toggle)
     - **Saved labels**: generated labels are saved to localStorage (`barcode_labels` key) — list of saved labels shown below the generator
     - **Re-print**: saved labels can be reprinted — just select a saved label, optionally change qty/MRP, then print
     - **Print**: generates a printable page with the specified qty of identical labels arranged in a grid, optimized for standard label sheets
     - Responsive: works on mobile and desktop

3. **Help Page Updates**
   - Add Step 11: "Setting & Recovering Manager PIN" — explain how to set PIN and how to use phone-based recovery if forgotten
   - Add Step 12: "Barcode Label Generator" — explain how to generate, save, and reprint barcode labels for grocery products

4. **Shyama Chatbot Updates**
   - Add Q&A entry: "How do I generate barcode labels?" → explain the Barcode tab, product auto-fill, label types, qty, and print
   - Add Q&A entry: "I forgot my manager PIN, how to reset it?" → explain the Forgot PIN flow using store phone number
   - Add Q&A entry: "How do I print barcodes for my products?" → step-by-step barcode print tutorial

### Modify

- `App.tsx`: Add `BarcodeLabel` page and `ScanBarcode` tab icon between Invoices and Help tabs
- `ManagerPinDialog.tsx`: Add "Forgot PIN?" recovery link/flow
- `StoreSetup.tsx`: Add emergency PIN reset section (phone verification)
- `HelpSupport.tsx`: Add steps 11 and 12
- `ShyamaChatbot.tsx`: Add 3 new Q&A entries

### Remove

- Nothing removed

## Implementation Plan

1. **Install barcode library**: Use `jsbarcode` for 1D barcodes + `qrcode.react` for QR — both are npm packages. Add to package.json and import in BarcodeLabel.tsx. If not available, use a canvas-based approach with the existing browser APIs.
2. **Create `BarcodeLabel.tsx`**: Full page with barcode type selector, product auto-fill dropdown, manual fields, live preview canvas, saved labels list (localStorage), print function
3. **Update `ManagerPinDialog.tsx`**: Add "Forgot PIN?" toggle that shows phone verification input, validates against `useGetStore()` data, clears PIN on match
4. **Update `StoreSetup.tsx`**: Add emergency reset section in Manager PIN card
5. **Update `App.tsx`**: Import BarcodeLabel, add Barcode tab
6. **Update `HelpSupport.tsx`**: Add 2 new steps
7. **Update `ShyamaChatbot.tsx`**: Add 3 new Q&A entries
8. **Validate**: Run typecheck and build, fix any errors
