# GST Invoice - Grocery

## Current State

- Barcode page loads products via `useGetProducts()`. Auto-fill selector only renders when `products.length > 0`, but when there is exactly 1 product and no `skuValue` is pre-selected, the barcode preview area is blank. When no products exist, there is no guidance to create a product.
- Products page has a "Download Template" button that downloads a blank sample template. There is no button to export the actual saved products list.
- Dashboard expiry section reads `expiry_{sku}` from localStorage (single legacy key). It does not iterate through batches from `batches_{sku}` localStorage keys, so batch-wise expiry details are not shown.
- NewInvoice batch product selector shows batch qty per option, but if a product was added via the Products form (non-batch path) the qty from the backend `stockQty` is not always reflected correctly when batch data also exists.
- StoreSetup PIN reset has two methods: "Via Phone Number" (default) and "Via Secret Question". User wants phone number method removed.
- ThermalReceipt groups GST by rate only. No per-HSN breakdown table.
- ThermalReceipt has no total item count or total qty line before grand total.
- ThermalReceipt has no QR code.
- BarcodeLabel has 6 barcode types, 5 preset label sizes + custom. No Indian hallmark symbols, no drag-to-reposition canvas elements, no custom text message field.

## Requested Changes (Diff)

### Add
- Export all saved products button on Products page (downloads current product list with all fields including batch data)
- Batch-wise expiry list on Dashboard: iterate `batches_{sku}` for each product and show each batch row with batch expiry, batch qty, product name, SKU
- HSN-wise GST breakdown table on printed bill (group line items by HSN code, show HSN, taxable amount, CGST/SGST/IGST per HSN)
- Total number of items (distinct line items) and total quantity (sum of all qty) on printed bill, before grand total section
- QR code on printed bill: small QR encoding key bill details (invoice number, store name, date, grand total, GST total, customer name)
- Barcode generator enhancements:
  - Indian hallmark symbols panel: BIS, ISO 9001, ISO 14001, Keep City Clean, FSSAI, Organic India, Agmark, India Organic, Green Dot, Vegetarian (green), Non-Vegetarian (brown) — rendered as text/unicode/SVG icons on the label canvas
  - Custom text message field: user can type any text line to print on barcode label
  - Drag-to-reposition: each element on the label canvas (barcode, product name, MRP, store name, hallmarks, custom text) can be dragged to new positions
  - The canvas elements save their positions as part of the saved label config

### Modify
- BarcodeLabel: fix blank screen when single product selected — ensure barcode renders as soon as a product is auto-selected; when no products exist show a clear "No products found — go to Products page to add products" empty state
- Products page: rename current "Download Template" to "Download Template" (keep as-is) and add a separate "Export Products" button that exports all current products with all fields
- StoreSetup PIN recovery: remove the "Via Phone Number" tab and phone input entirely; only security question recovery remains (or show direct reset if no security question is set)
- NewInvoice: when batch data exists for a product, always show batch qty (from localStorage) rather than backend stockQty in the selector display
- ThermalReceipt: add HSN-wise GST table, total items/qty summary, and QR code

### Remove
- StoreSetup: remove `forgotMethod === "phone"` branch, phone toggle button, phone input, and `forgotPinPhone` state

## Implementation Plan

1. **BarcodeLabel.tsx**: Fix blank canvas when `skuValue` not set after product auto-select — auto-trigger barcode render on product select. Add empty state when `products.length === 0`. Add Indian hallmark symbols panel (checkbox grid). Add custom text message input. Implement drag-to-reposition using `onMouseDown`/`onTouchStart` on each canvas element. Store element positions in SavedLabel config.
2. **Products.tsx**: Add "Export Products" button that exports all products (including batch info from localStorage) to an Excel file with all columns. Keep existing template button.
3. **Dashboard.tsx**: Replace single `expiry_{sku}` lookup with iteration over `batches_{sku}` for each product. Show each batch as a separate row. Sort by expiry date ascending.
4. **NewInvoice.tsx**: In product selector, when a product has batches, read batch qty from localStorage `getBatches(sku)` and display it correctly.
5. **StoreSetup.tsx**: Remove phone recovery — delete phone toggle button, phone input field, `forgotPinPhone` state, and `forgotMethod === "phone"` logic block.
6. **ThermalReceipt.tsx**: 
   - Add HSN-wise GST breakdown: group line items by `hsnCode`, compute taxable/cgst/sgst/igst per HSN, render as a table before the total GST line.
   - Add total items count + total qty line before grand total.
   - Add a small QR code (using `qrcode` npm package's `toDataURL`) encoding JSON of key bill details, rendered as a small image at the bottom of the receipt.
