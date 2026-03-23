# GST Invoice - Grocery

## Current State
Full GST invoice app with store management, products, invoices, admin panel. Backend data is NOT in stable variables so it clears on every upgrade. The persistent data loading failure is caused by two frontend bugs:
1. `useActor.ts`: `_initializeAccessControlWithSecret` is called without try/catch -- any error throws from queryFn, actor is never returned, all queries are permanently disabled
2. `useQueries.ts`: `useRefreshAllData` calls `refetchActor` which is not returned from `useActor()` -- runtime crash on every refresh attempt

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- `useActor.ts`: wrap `_initializeAccessControlWithSecret` call in try/catch so any failure is silently ignored and the actor is always returned
- `useActor.ts`: export `refetchActor` properly from the hook
- `useQueries.ts`: fix `useRefreshAllData` to not call non-existent `refetchActor`

### Remove
- All backend store/product/invoice/credit data is wiped on redeploy (non-stable variables)

## Implementation Plan
1. Rewrite `useActor.ts` with proper try/catch and correct exports
2. Rewrite `useQueries.ts` to fix refresh logic
3. Validate and deploy
