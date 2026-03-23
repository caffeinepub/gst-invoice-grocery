# GST Invoice - Grocery

## Current State
App has 6 pages: Dashboard, Store Setup, Products, New Invoice, Invoices, Admin Panel. Bottom nav and desktop nav show these pages. App has saffron + indigo theme, developer credit footer.

## Requested Changes (Diff)

### Add
- New `HelpSupport.tsx` page accessible via a "Help" tab in the bottom nav and desktop nav
- Page sections:
  1. **Technology Used** -- Internet Computer (ICP) blockchain, Motoko backend, React + TypeScript frontend, Tailwind CSS, 80mm thermal printing via window.print()
  2. **How to Use This App** -- Step-by-step guide: Login with Internet Identity, set up store details, add products, create invoices, print receipts, manage via admin panel
  3. **Why Choose BillKaro** -- GST-compliant, no internet server downtime risk (blockchain), data fully owned by you, mobile-first, free to start
  4. **Help & Support** -- WhatsApp button linking to +917023285769, 24x7 service label, phone call link

### Modify
- `App.tsx`: Add `HelpSupport` tab to `BASE_TABS` with a HelpCircle icon, import and render the new page

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/pages/HelpSupport.tsx` with all four sections
2. Add Help tab to BASE_TABS in App.tsx and render HelpSupport page
