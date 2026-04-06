# GST Invoice - Grocery

## Current State

- Invoice GST is calculated using `product.price` (which is MRP in paise) as the taxable base
- In the invoice cart table, the "Rate" column shows MRP; there is a separate "Cost (₹)" input column for actual cost
- The `calcLineItem` function uses `product.price` for GST calculation, not the cost price entered by the user
- `ThermalReceipt` already has a QR code section that generates and displays a QR code with invoice details
- The Barcode Label Generator (`BarcodeLabel.tsx`) exists as a full page with its own tab in the nav
- `App.tsx` has a `barcode` tab in `BASE_TABS`, a bottom nav entry, and imports/renders `<BarcodeLabel />`
- `Products.tsx` has a single-product delete with confirmation, but NO bulk select/delete and NO Manager PIN gating for product deletion

## Requested Changes (Diff)

### Add
- GST calculation on cost price: when a cost price is entered for a cart item, use cost price as the taxable base instead of MRP
- Show MRP near cost in the invoice cart table (already displayed as "Rate", so add a visual MRP column or label near cost)
- Product bulk delete with select checkbox per row + select-all checkbox + "Delete Selected" button requiring Manager PIN verification

### Modify
- `calcLineItem` in `NewInvoice.tsx`: if `costPrice` is set, compute taxable amount using `costPrice * qty` instead of `product.price * qty`; the `rate` field should still show MRP for display but GST calculation uses cost
- `ThermalReceipt.tsx`: QR code already exists — ensure QR data includes all relevant invoice details (already implemented: inv number, store, date, total, gst, customer); verify it works correctly
- Invoice cart table: add a column or display showing MRP next to cost so user can compare
- `App.tsx`: remove the `barcode` entry from `BASE_TABS`, remove `BarcodeLabel` import and render, remove the barcode tab from both desktop nav and mobile bottom nav
- `Products.tsx`: add checkbox column to product table rows, select-all header checkbox, and a "Delete Selected" button that requires Manager PIN before executing bulk deletion

### Remove
- Barcode tab from bottom nav (mobile and desktop)
- `BarcodeLabel` page import and rendering from `App.tsx`
- `barcode` entry from `BASE_TABS` array

## Implementation Plan

1. **NewInvoice.tsx** — Modify `calcLineItem`:
   - If `item.costPrice` is provided and > 0, use `BigInt(Math.round(item.costPrice * 100)) * qty` as the taxable base for GST
   - Keep `rate: product.price` (MRP) for display in the table and receipt
   - Add `mrp` field or display MRP in the cart table near the Cost column so user sees both
   - Update cart table header to make it clear: show "MRP" column and "Cost (₹)" column side-by-side

2. **ThermalReceipt.tsx** — QR code already implemented; verify QR data payload includes: invoice number, store name, date, grand total, GST amount, customer name. The existing implementation covers all these — no changes needed.

3. **App.tsx** — Remove barcode feature:
   - Remove `{ id: "barcode", label: "Barcode", icon: Barcode }` from `BASE_TABS`
   - Remove `import BarcodeLabel` and `{activeTab === "barcode" && <BarcodeLabel />}`
   - Remove `Barcode` from lucide-react import
   - Update `TabId` type to exclude `"barcode"`

4. **Products.tsx** — Add bulk delete with Manager PIN:
   - Add `selectedSkus: Set<string>` state
   - Add checkbox column to each product table row
   - Add select-all checkbox in table header
   - Add "Delete Selected (N)" button (visible when at least 1 row selected)
   - On click, open Manager PIN dialog; on PIN confirmed, call `deleteProduct` for each selected SKU sequentially
   - Show progress/loading during bulk deletion
   - Clear selection after completion
   - Use existing `ManagerPinDialog` component pattern (or inline PIN prompt)
