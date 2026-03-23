# GST Invoice - Grocery

## Current State
The app uses `useActor.ts` with react-query to create the ICP actor after login. The `_initializeAccessControlWithSecret` call inside the queryFn is not wrapped in a try/catch -- if it throws, the entire actor query fails, `actor` stays null, and all data queries are gated on `!!actor`, so nothing loads.

## Requested Changes (Diff)

### Add
- Manual "Refresh Data" button on Dashboard and AdminPanel for users to force-reload data
- Retry logic on the actor query

### Modify
- `useActor.ts`: Wrap `_initializeAccessControlWithSecret` in try/catch so actor is always returned even if init fails
- `useActor.ts`: Set `retry: 2` on actor query
- `useActor.ts`: Remove `staleTime: Infinity` and instead use a reasonable stale time so queries can refetch
- `useQueries.ts`: Add `refetchOnMount: true` and `staleTime: 0` to all data queries so they always fetch fresh data on mount
- Dashboard: Add a refresh button
- AdminPanel: Add a refresh button

### Remove
- Nothing

## Implementation Plan
1. Fix `useActor.ts`: wrap init in try/catch, add retry, adjust staleTime
2. Fix `useQueries.ts`: add refetchOnMount and staleTime:0 to all data queries
3. Add refresh buttons to Dashboard and AdminPanel
