# GST Invoice - Grocery

## Current State
- Single-tier access: any logged-in store user can do everything (edit store, create/edit/delete invoices, manage products)
- Invoice delete requires confirmation dialog only; no PIN protection
- Products use single record per SKU; expiry date stored in localStorage; only one expiry date per barcode
- Barcode scanning adds existing product to cart; expired products show an error message
- Stock deducted via `updateProductStock` after invoice creation (separate call)
- Invoice creation does not validate stock sufficiency before saving
- Invoice qty does not compare to remaining stock before allowing invoice creation

## Requested Changes (Diff)

### Add
1. **Manager PIN system (frontend-only, localStorage):**
   - Store owner sets a 4-digit Manager PIN from Store Setup page (saved to localStorage as `manager_pin`)
   - A `useManagerMode` React context/hook tracks whether Manager Mode is currently active (unlocked)
   - Manager Mode is unlocked by entering the correct PIN in a dialog; auto-locks after 10 minutes of inactivity
   - PIN-protected actions: Edit Store details, Edit any saved invoice, Delete any saved invoice (single or bulk)

2. **Bulk invoice delete with checkboxes:**
   - Each invoice row/card gets a checkbox (visible in both mobile card view and desktop table)
   - "Select All" checkbox in the table header / mobile header
   - A "Delete Selected (N)" red button appears when 1+ invoices are selected
   - Bulk delete requires Manager PIN verification before executing
   - Single invoice delete also requires Manager PIN verification

3. **Multi-batch inventory (same barcode, different expiry dates):**
   - Backend: New `ProductBatch` type: `{ storeId, sku, batchId, expiryDate, stockQty, createdAt }`
   - Backend: New stable map `productBatches: Map<Principal, Map<Text, Map<Text, ProductBatch>>>` (storeId → sku → batchId → batch)
   - New backend methods: `addProductBatch`, `getBatches`, `deductBatchStock`, `deleteBatch`
   - When multiple batches exist for the same SKU: barcode scan / product select picks the batch with the **earliest expiry date first (FIFO)**
   - Frontend: Products page shows batches grouped under each product; "Add Batch" button per product row
   - Frontend: When adding a product to invoice that has batches, auto-selects earliest-expiry batch and notes the expiry/batch on the line item

4. **Stock sufficiency check before invoice creation:**
   - When user tries to save/print an invoice, check each cart item qty against remaining stock (from products + batches)
   - If any item's qty exceeds available stock, show an inline error popup listing which products are over-stock — do NOT create the invoice
   - Negative stock situation is blocked at frontend before calling backend
   - The invoice creation popup/toast only shows for actual save failures, not stock warnings

5. **Expired product alert on barcode scan:**
   - Already implemented: expired products show error on scan
   - Enhance: if a batch being selected is expired, show a clear red alert "[Product Name] - Batch [batchId] has EXPIRED (Exp: DD MMM YYYY)"

### Modify
- `StoreSetup.tsx`: Add Manager PIN setup section below logo upload. Shows current PIN status (set/not set). "Set PIN" or "Change PIN" button opens a dialog with current PIN (if changing) + new PIN + confirm new PIN fields.
- `Invoices.tsx`: Edit and Delete buttons require Manager PIN check before opening their respective dialogs. Add checkboxes per row. Add "Select All" + bulk delete button with PIN check.
- `NewInvoice.tsx`: Before `handleSave`, validate each cart item qty against available stock. If insufficient, show a warning dialog listing over-stock items — do not proceed to backend call.
- `Products.tsx`: Add "Add Batch" button per product; show batch list expandable per product row showing batchId, expiryDate, qty.
- `useQueries.ts`: Add hooks for `addProductBatch`, `getBatches`, `deductBatchStock`.
- Backend `main.mo`: Add ProductBatch type, batches map, and CRUD methods for batches. Stock deduction on invoice uses batch FIFO logic.

### Remove
- No existing features removed.

## Implementation Plan
1. Update `main.mo` to add ProductBatch type, stable batch map, and batch management methods (addProductBatch, getBatches, deductBatchStock by FIFO, deleteBatch)
2. Regenerate backend bindings (handled by generate_motoko_code tool)
3. Add Manager PIN context/hook in frontend (`useManagerMode.ts`) — PIN stored in localStorage, mode auto-locks after 10 min
4. Update `StoreSetup.tsx` — add PIN setup/change section
5. Update `Invoices.tsx` — add checkboxes, select all, bulk delete button, PIN gate on edit/delete/bulk-delete
6. Update `NewInvoice.tsx` — add pre-save stock validation check; block invoice if qty > stock; show warning popup not the save-failed toast
7. Update `Products.tsx` — add Add Batch UI per product, expandable batch list per row
8. Update `useQueries.ts` — add batch mutation hooks
