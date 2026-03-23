# GST Invoice - Grocery

## Current State
- Admin panel shows stores with: store name, principal ID, credits, add credits button
- Invoices page shows saved invoices in a table with view/print action
- No search/filter in admin panel
- No Excel export for invoices
- No date filter on invoices page

## Requested Changes (Diff)

### Add
- Search bar in Admin Panel to filter stores by name, phone, or address for quick recharge
- Contact details (phone, address, GSTIN, FSSAI) visible in Admin Panel store cards/rows
- Date filter (from date / to date) on Invoices page
- Export to Excel button on Invoices page that downloads all filtered invoices with full details (invoice #, date, customer name, customer GSTIN, GST type, items count, subtotal, CGST, SGST, IGST, grand total)
- Install `xlsx` (SheetJS) npm package for Excel generation

### Modify
- Backend `AdminStoreView` type to include `phone`, `address`, `gstin`, `fssai`, `state` fields
- Backend `getAllStoresAdmin` to populate these extra fields from the store profile
- Admin Panel desktop table to show phone and address columns
- Admin Panel mobile cards to show phone and address

### Remove
- Nothing removed

## Implementation Plan
1. Update `AdminStoreView` type in `main.mo` to include phone, address, gstin, fssai, state
2. Update `getAllStoresAdmin` in `main.mo` to populate new fields
3. Install `xlsx` package in frontend
4. Update `AdminPanel.tsx`: add search bar state, filter stores list, show phone/address/gstin in table and cards
5. Update `Invoices.tsx`: add date-from / date-to filter inputs, filter sorted invoices accordingly, add Export Excel button using SheetJS that downloads a .xlsx file with all invoice columns
