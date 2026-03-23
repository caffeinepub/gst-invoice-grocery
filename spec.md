# GST Invoice - Grocery

## Current State
The admin panel calls `getAllStoresAdmin` which returns `AdminStoreView[]`. The `AdminStoreView` type only contains `credits`, `owner`, and `storeName`. As a result, `phone`, `gstin`, `address`, and `state` are undefined for every store row, making those columns blank and the WhatsApp button disabled.

## Requested Changes (Diff)

### Add
- `phone`, `gstin`, `address`, `state` fields to `AdminStoreView`

### Modify
- Backend `getAllStoresAdmin` to populate the new fields from the store profile
- Admin panel frontend to display these fields (already coded, just needs data)

### Remove
- Nothing

## Implementation Plan
1. Regenerate backend Motoko so `AdminStoreView` includes `phone`, `gstin`, `address`, `state`
2. Update `getAllStoresAdmin` to copy those fields from stored StoreProfile
3. Frontend already handles these fields — no changes needed beyond data being available
