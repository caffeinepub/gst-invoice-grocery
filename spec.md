# GST Invoice - Grocery

## Current State
Admin Panel shows store cards/rows with name, GSTIN (conditional), phone (conditional), address (conditional), and principal ID. Fields hidden when empty. No WhatsApp notification button. Dashboard has no low stock reminder.

## Requested Changes (Diff)

### Add
- WhatsApp button per store in AdminPanel: green button linking to wa.me/91{phone} with pre-filled recharge message
- Low Stock Dialog on Dashboard: auto-shows on load when any product has stockQty < 10; lists low-stock items; dismissable; amber banner below stat cards reopens it

### Modify
- AdminPanel: always show GSTIN, address, mobile number (show dash when empty) in both desktop table and mobile cards
- AdminPanel mobile cards: replace conditional rendering with always-visible labeled rows for all 4 fields

### Remove
- Nothing

## Implementation Plan
1. Update AdminPanel.tsx: make GSTIN/address/mobile always visible with labels; add WhatsApp button (green) per store
2. Update Dashboard.tsx: import useGetProducts; compute lowStockProducts (stockQty < 10); show Dialog on load if any; add amber banner that reopens dialog
