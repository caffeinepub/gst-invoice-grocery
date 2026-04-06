# GST Invoice - Grocery

## Current State
- Products page has a product add/edit dialog with a SKU/Barcode field that shows a `(scan barcode)` hint text in the label
- NewInvoice page has cart items with product name, HSN, qty, rate, GST%, amount columns
- ThermalReceipt component renders the printed bill with line items showing qty, rate, and amount
- No cost/purchase price field exists anywhere in the invoice flow
- Backend LineItem type does not include a costPrice field

## Requested Changes (Diff)

### Add
- `costPrice` field (purchase cost per unit) as an optional input in the invoice cart per line item
- Cost price column in the invoice items table (NewInvoice.tsx)
- Cost price display in ThermalReceipt printed bill
- `InvoiceLineItemDisplay` type gets an optional `costPrice?: bigint` field
- CartItem interface gets optional `costPrice?: number` field (stored in paise)

### Modify
- Products.tsx: Remove the `(scan barcode)` hint text from the SKU/Barcode field label in the add/edit product dialog
- NewInvoice.tsx: Add a "Cost (₹)" input column to the invoice items table so user can enter purchase cost per unit for each cart item
- NewInvoice.tsx: Pass costPrice to ThermalReceipt via lineItems
- ThermalReceipt.tsx: Add optional cost price column to line items display
- ThermalReceipt.tsx: If any line item has a costPrice, show a cost summary section on the printed bill

### Remove
- The `(scan barcode)` span text from the SKU field label in Products.tsx dialog

## Implementation Plan
1. Products.tsx: Remove the `(scan barcode)` span from the SKU field label (line ~1238-1241)
2. NewInvoice.tsx: Add `costPrice?: number` to CartItem interface; add cost input to the items table; pass cost to calcLineItem and lineItems
3. ThermalReceipt.tsx: Add optional `costPrice?: bigint` to InvoiceLineItemDisplay; show cost on receipt when present
4. NewInvoice.tsx: Pass costPrice when building receiptProps lineItems
