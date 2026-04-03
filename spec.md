# GST Invoice - Grocery

## Current State
- StoreSetup page shows the Principal ID card always visible to any logged-in user
- StoreSetup Edit button has no PIN protection; clicking it opens the form immediately
- NewInvoice product selector shows each product as ONE item with total batch qty, only hinting at the first batch expiry
- ManagerPinDialog and useManagerMode hook exist and work correctly

## Requested Changes (Diff)

### Add
- Manager PIN prompt before revealing the Principal ID card in StoreSetup
- Manager PIN prompt before entering edit mode for store details in StoreSetup
- Per-batch entries in the invoice product dropdown: when a product has multiple batches, each batch appears as a separate selectable option showing batch expiry and available qty for that batch specifically

### Modify
- StoreSetup: Principal ID card replaced with a locked card showing a "Reveal (Manager Only)" button; clicking it opens ManagerPinDialog; on success shows the principal with copy button
- StoreSetup: Edit button now opens ManagerPinDialog first; on PIN success sets editing=true
- NewInvoice: product selector — for products with batches, instead of ONE item per product, render ONE item per active batch. Label: "ProductName — ₹MRP | Batch Exp: DATE | Qty: N (GST: X%)"  
  The selected value encodes both SKU and batchId so addToCart knows exactly which batch to use
- NewInvoice: addToCart and barcode-scan logic remain FIFO by default (no change); the new per-batch selector simply lets the user manually pick a specific batch if needed

### Remove
- Nothing removed

## Implementation Plan
1. StoreSetup.tsx: Add `principalRevealed` state (default false). Replace always-visible Principal card with a locked card. Add ManagerPinDialog instance for principal reveal. Add separate ManagerPinDialog instance (or reuse with callback) for the Edit button.
2. NewInvoice.tsx: Change the SelectItem rendering loop — for products with batches, iterate `getActiveBatches(p.sku)` and emit one SelectItem per batch with value `${p.sku}::${batch.batchId}`. For non-batch products keep current single item with value `p.sku`. Update `selectedSku` state and parsing logic to extract SKU and batchId. Update addToCart to use the pre-selected batchId instead of resolving first batch.
