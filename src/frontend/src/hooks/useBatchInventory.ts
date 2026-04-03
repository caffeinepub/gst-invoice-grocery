// Batch inventory system — localStorage-based FIFO batch management

export interface ProductBatchEntry {
  batchId: string;
  expiryDate: string; // "YYYY-MM-DD"
  stockQty: number;
  createdAt: number; // Date.now()
}

function batchKey(sku: string): string {
  return `batches_${sku}`;
}

export function getBatches(sku: string): ProductBatchEntry[] {
  try {
    const raw = localStorage.getItem(batchKey(sku));
    if (!raw) return [];
    return JSON.parse(raw) as ProductBatchEntry[];
  } catch {
    return [];
  }
}

export function setBatches(sku: string, batches: ProductBatchEntry[]): void {
  localStorage.setItem(batchKey(sku), JSON.stringify(batches));
}

export function addBatch(
  sku: string,
  expiryDate: string,
  qty: number,
): ProductBatchEntry {
  const batch: ProductBatchEntry = {
    batchId: `${sku}-${expiryDate}-${Date.now()}`,
    expiryDate,
    stockQty: qty,
    createdAt: Date.now(),
  };
  const batches = getBatches(sku);
  batches.push(batch);
  setBatches(sku, batches);
  return batch;
}

function isExpiredDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return exp < today;
}

/** Returns non-expired batches sorted FIFO (earliest expiry first) */
export function getActiveBatches(sku: string): ProductBatchEntry[] {
  return getBatches(sku)
    .filter((b) => b.stockQty > 0 && !isExpiredDate(b.expiryDate))
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return a.createdAt - b.createdAt;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return (
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
    });
}

/** Deducts qty from earliest non-expired batch(es) FIFO */
export function deductStockFIFO(sku: string, qty: number): void {
  const batches = getBatches(sku);
  const activeSorted = batches
    .filter((b) => b.stockQty > 0 && !isExpiredDate(b.expiryDate))
    .sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return a.createdAt - b.createdAt;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return (
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
    });

  let remaining = qty;
  for (const active of activeSorted) {
    if (remaining <= 0) break;
    const idx = batches.findIndex((b) => b.batchId === active.batchId);
    if (idx < 0) continue;
    const deduct = Math.min(batches[idx].stockQty, remaining);
    batches[idx].stockQty -= deduct;
    remaining -= deduct;
  }

  if (remaining > 0) {
    throw new Error(`Insufficient batch stock for SKU: ${sku}`);
  }

  setBatches(sku, batches);
}

/** Total available stock across all non-expired batches */
export function getTotalBatchStock(sku: string): number {
  return getActiveBatches(sku).reduce((sum, b) => sum + b.stockQty, 0);
}

/** True if at least one batch record exists (may all be expired) */
export function hasAnyBatches(sku: string): boolean {
  return getBatches(sku).length > 0;
}

/** Delete a batch by batchId */
export function deleteBatch(sku: string, batchId: string): void {
  const batches = getBatches(sku).filter((b) => b.batchId !== batchId);
  setBatches(sku, batches);
}

/** Format date string to readable label */
export function formatBatchDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Get expiry status for a batch date */
export function getBatchExpiryStatus(
  dateStr: string,
): "expired" | "expiring" | "ok" {
  if (!dateStr) return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  if (exp < today) return "expired";
  const days30 = new Date(today);
  days30.setDate(today.getDate() + 30);
  if (exp <= days30) return "expiring";
  return "ok";
}
