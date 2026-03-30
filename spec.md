# GST Invoice - Grocery

## Current State
Products page has Add/Edit/Delete per product. No bulk import functionality.

## Requested Changes (Diff)

### Add
- Excel/CSV import button on Products page
- File input accepting .xlsx and .csv files
- Parse columns: Name, Barcode (SKU), MRP, Qty (Stock), HSN, GST Rate
- Preview table showing parsed rows before importing
- Bulk addProduct calls for all valid rows
- Download sample template button (.xlsx with correct column headers)
- Error summary if some rows fail (e.g. duplicate SKU)

### Modify
- Products page header: add Import Excel button alongside Add Product

### Remove
- Nothing removed

## Implementation Plan
1. Install xlsx (SheetJS) package in frontend
2. Add ImportProducts component inside Products.tsx
3. File input triggers xlsx parse -> show preview dialog with row table
4. On confirm, loop through rows calling addProduct mutation
5. Show progress (X/Y imported) and final success/error count
6. Sample template download: generate a simple xlsx with header row
