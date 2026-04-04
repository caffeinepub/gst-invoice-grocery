# GST Invoice - Grocery

## Current State
A live GST billing app for grocery stores on ICP. Stores are activated by admin via principal ID. Features include: dashboard, store setup with manager PIN, product management, invoice creation, barcode scanning, barcode label generator, and admin panel.

## Requested Changes (Diff)

### Add
- Security question PIN recovery: store manager can set a secret question (e.g. pet's name, best friend's name) when setting up their PIN. Recovery page shows a toggle between phone number and security question methods.
- Security question fields added to PIN setup dialog in Store Setup.

### Modify
- **Bug Fix 1 (New device/principal activation not loading):** `useGetMyCredits` was silently catching all errors and returning `0n`, making any transient failure on a new device look like "0 credits" and showing the Inactive screen. Fix: removed silent catch so React Query retries 3x. Also added `creditsLoading` and `creditsError` guards to `isInactive` in App.tsx so the inactive screen only shows when credits are definitively confirmed as 0.
- **Bug Fix 3 (Barcode menu library error):** `BarcodeLabel.tsx` was loading `jsbarcode` and `qrcode` from external CDN URLs at runtime. These CDN calls can fail due to network issues, restricted networks, or a race condition when navigating back to the tab. Fix: installed `jsbarcode` and `qrcode` as npm packages; replaced CDN dynamic loading with direct `import` statements. Libraries are now bundled with the app — always available offline, no network dependency.
- `useManagerMode.ts`: added `setSecurityQuestion`, `getSecurityQuestion`, `hasSecurityQuestion`, `verifySecurityAnswer`, `clearSecurityQuestion`, and `SECURITY_QUESTIONS` list.
- `StoreSetup.tsx`: updated PIN setup dialog to include optional security question + answer. Updated forgot PIN flow to support both phone-number and security question recovery methods (toggle between them).

### Remove
- CDN-based barcode library loading from `BarcodeLabel.tsx` (replaced by npm imports).
- Silent `catch { return 0n }` in `useGetMyCredits`.

## Implementation Plan
1. Fix `useQueries.ts` — remove silent catch in `useGetMyCredits`, let React Query retry.
2. Fix `App.tsx` — add `creditsLoading`/`creditsError` guards to `isInactive`.
3. Update `useManagerMode.ts` — add security question functions and `SECURITY_QUESTIONS` constant.
4. Update `StoreSetup.tsx` — add security question setup in PIN dialog, add question-based recovery toggle in forgot PIN flow.
5. Install `jsbarcode` and `qrcode` npm packages.
6. Update `BarcodeLabel.tsx` — replace CDN loader with direct npm imports, remove `loadScript` function and CDN useEffect.
