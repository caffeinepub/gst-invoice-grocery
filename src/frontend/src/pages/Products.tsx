import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Edit2,
  FileSpreadsheet,
  Layers,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend.d";
import ManagerPinDialog from "../components/ManagerPinDialog";
import {
  type ProductBatchEntry,
  addBatch,
  deleteBatch,
  formatBatchDate,
  getBatchExpiryStatus,
  getBatches,
  getTotalBatchStock,
  hasAnyBatches,
} from "../hooks/useBatchInventory";
import {
  useAddProduct,
  useDeleteProduct,
  useGetProducts,
  useUpdateProduct,
} from "../hooks/useQueries";

const GST_RATES = [0, 5, 12, 18, 28];

// ── Expiry helpers ────────────────────────────────────
function getExpiryKey(sku: string) {
  return `expiry_${sku}`;
}

function getExpiry(sku: string): string {
  return localStorage.getItem(getExpiryKey(sku)) ?? "";
}

function setExpiry(sku: string, date: string) {
  if (date) {
    localStorage.setItem(getExpiryKey(sku), date);
  } else {
    localStorage.removeItem(getExpiryKey(sku));
  }
}

type ExpiryStatus = "expired" | "expiring" | "ok";

function getExpiryStatus(dateStr: string): ExpiryStatus {
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

function formatExpiryDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Product form ─────────────────────────────────────
interface ProductForm {
  name: string;
  hsnCode: string;
  sku: string;
  price: string;
  gstRate: string;
  stockQty: string;
  expiryDate: string;
}

const emptyForm: ProductForm = {
  name: "",
  hsnCode: "",
  sku: "",
  price: "",
  gstRate: "5",
  stockQty: "0",
  expiryDate: "",
};

interface ImportRow {
  name: string;
  sku: string;
  price: number;
  stockQty: number;
  hsnCode: string;
  gstRate: number;
  expiryDate?: string;
  error?: string;
}

function parseExcelRows(data: unknown[][]): ImportRow[] {
  const validGst = [0, 5, 12, 18, 28];
  return data
    .filter((row) => row && row.length >= 2 && String(row[0] ?? "").trim())
    .map((row) => {
      const name = String(row[0] ?? "").trim();
      const sku = String(row[1] ?? "").trim();
      const price = Number(row[2] ?? 0);
      const stockQty = Number(row[3] ?? 0);
      const hsnCode = String(row[4] ?? "").trim();
      const gstRateRaw = Number(row[5] ?? 5);
      const gstRate = validGst.includes(gstRateRaw) ? gstRateRaw : 5;

      let error: string | undefined;
      if (!name) error = "Name missing";
      else if (!sku) error = "Barcode missing";
      else if (Number.isNaN(price) || price <= 0) error = "Invalid MRP";

      const expiryDate = row[6] ? String(row[6]).trim() : undefined;
      return {
        name,
        sku,
        price,
        stockQty: Number.isNaN(stockQty) ? 0 : stockQty,
        hsnCode,
        gstRate,
        expiryDate,
        error,
      };
    });
}

// ── CDN loader for xlsx ──────────────────────────────────
let xlsxPromise: Promise<boolean> | null = null;
function loadXlsx(): Promise<boolean> {
  if (xlsxPromise) return xlsxPromise;
  xlsxPromise = new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).XLSX) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return xlsxPromise;
}

// ── Expiry Badge component ─────────────────────────────────────
function ExpiryBadge({
  status,
}: { status: ExpiryStatus | "expired" | "expiring" | "ok" }) {
  if (status === "expired") {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1.5 py-0">
        Expired
      </Badge>
    );
  }
  if (status === "expiring") {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs px-1.5 py-0">
        Expiring Soon
      </Badge>
    );
  }
  return null;
}

// ── Batch row sub-component ───────────────────────────────────────
interface BatchPanelProps {
  sku: string;
  productName: string;
  onClose: () => void;
}

function BatchPanel({ sku, productName, onClose }: BatchPanelProps) {
  const [batches, setBatchesLocal] = useState<ProductBatchEntry[]>(() =>
    getBatches(sku),
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [newStockQty, setNewStockQty] = useState("");
  const [adding, setAdding] = useState(false);

  function refresh() {
    setBatchesLocal(getBatches(sku));
  }

  function handleAddBatch() {
    if (!newExpiryDate) {
      toast.error("Please enter an expiry date.");
      return;
    }
    const qty = Number.parseInt(newStockQty);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid stock quantity.");
      return;
    }
    setAdding(true);
    setTimeout(() => {
      addBatch(sku, newExpiryDate, qty);
      refresh();
      setAddDialogOpen(false);
      setNewExpiryDate("");
      setNewStockQty("");
      setAdding(false);
      toast.success(`Batch added for ${productName}`);
    }, 200);
  }

  function handleDeleteBatch(batchId: string) {
    deleteBatch(sku, batchId);
    refresh();
    toast.success("Batch removed.");
  }

  const totalStock = batches.reduce((sum, b) => sum + b.stockQty, 0);

  return (
    <>
      <div className="bg-muted/30 border-t border-b border-dashed border-amber-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-foreground">
              Batch Inventory for {productName}
            </span>
            <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
              {batches.length} batch{batches.length !== 1 ? "es" : ""} · Total:{" "}
              {totalStock}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
              data-ocid="products.secondary_button"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Batch
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 text-xs text-muted-foreground"
            >
              Close
            </Button>
          </div>
        </div>

        {batches.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No batches yet. Add a batch to start tracking by expiry date.
          </p>
        ) : (
          <div className="rounded-lg border border-amber-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50">
                  <TableHead className="text-xs py-2">Batch ID</TableHead>
                  <TableHead className="text-xs py-2">Expiry Date</TableHead>
                  <TableHead className="text-xs py-2 text-right">
                    Stock Qty
                  </TableHead>
                  <TableHead className="text-xs py-2">Status</TableHead>
                  <TableHead className="text-xs py-2 text-center">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch, idx) => {
                  const status = getBatchExpiryStatus(batch.expiryDate);
                  return (
                    <TableRow
                      key={batch.batchId}
                      className={`text-xs ${
                        status === "expired"
                          ? "bg-red-50"
                          : status === "expiring"
                            ? "bg-amber-50/70"
                            : ""
                      }`}
                      data-ocid={`products.batch.item.${idx + 1}`}
                    >
                      <TableCell className="py-1.5 font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                        {batch.batchId.split("-").slice(-1)[0]}…
                      </TableCell>
                      <TableCell className="py-1.5">
                        {formatBatchDate(batch.expiryDate)}
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-medium">
                        {batch.stockQty}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <ExpiryBadge status={status} />
                        {status === "ok" && (
                          <span className="text-xs text-green-600">
                            ✓ Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch.batchId)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                          title="Remove batch"
                          data-ocid={`products.batch.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Batch Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm" data-ocid="products.batch_dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Add Batch — {productName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="batch-expiry">Expiry Date *</Label>
              <Input
                id="batch-expiry"
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                data-ocid="products.batch.input"
              />
              {newExpiryDate && (
                <p
                  className={`text-xs ${
                    getExpiryStatus(newExpiryDate) === "expired"
                      ? "text-red-600"
                      : getExpiryStatus(newExpiryDate) === "expiring"
                        ? "text-amber-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {getExpiryStatus(newExpiryDate) === "expired" &&
                    "⚠ This expiry date has already passed"}
                  {getExpiryStatus(newExpiryDate) === "expiring" &&
                    "⚠ This batch expires within 30 days"}
                  {getExpiryStatus(newExpiryDate) === "ok" &&
                    `Expires: ${formatExpiryDisplay(newExpiryDate)}`}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batch-qty">Stock Qty *</Label>
              <Input
                id="batch-qty"
                type="number"
                min="1"
                value={newStockQty}
                onChange={(e) => setNewStockQty(e.target.value)}
                placeholder="e.g. 50"
                data-ocid="products.batch.input"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              data-ocid="products.batch.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddBatch}
              disabled={adding || !newExpiryDate || !newStockQty}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-ocid="products.batch.submit_button"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Products() {
  const { data: products = [], isLoading } = useGetProducts();
  const addMutation = useAddProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  // Single delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePinOpen, setDeletePinOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Bulk delete state
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [bulkDeletePinOpen, setBulkDeletePinOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
    errors: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const productsWithExpiry = products
    .map((p) => {
      const expiryDate = getExpiry(p.sku);
      const expiryStatus = getExpiryStatus(expiryDate);
      const batchCount = getBatches(p.sku).length;
      const hasBatches = batchCount > 0;
      const batchStock = hasBatches ? getTotalBatchStock(p.sku) : null;
      return {
        ...p,
        expiryDate,
        expiryStatus,
        batchCount,
        hasBatches,
        batchStock,
      };
    })
    .sort((a, b) => {
      const order: Record<ExpiryStatus, number> = {
        expired: 0,
        expiring: 1,
        ok: 2,
      };
      return order[a.expiryStatus] - order[b.expiryStatus];
    });

  const filtered = productsWithExpiry.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.hsnCode.includes(search),
  );

  // Select-all logic
  const allSkus = filtered.map((p) => p.sku);
  const allSelected =
    allSkus.length > 0 && allSkus.every((s) => selectedSkus.has(s));
  const someSelected = selectedSkus.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(allSkus));
    }
  }

  function toggleSelect(sku: string) {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  const openAdd = () => {
    setEditProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      hsnCode: p.hsnCode,
      sku: p.sku,
      price: (Number(p.price) / 100).toFixed(2),
      gstRate: p.gstRate.toString(),
      stockQty: p.stockQty.toString(),
      expiryDate: getExpiry(p.sku),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pricePaise = BigInt(Math.round(Number.parseFloat(form.price) * 100));
    const sku = editProduct ? editProduct.sku : form.sku;
    try {
      if (editProduct) {
        await updateMutation.mutateAsync({
          sku: editProduct.sku,
          name: form.name,
          hsnCode: form.hsnCode,
          price: pricePaise,
          gstRate: BigInt(form.gstRate),
          stockQty: BigInt(form.stockQty),
        });
        toast.success("Product updated!");
      } else {
        await addMutation.mutateAsync({
          name: form.name,
          hsnCode: form.hsnCode,
          sku: form.sku,
          price: pricePaise,
          gstRate: BigInt(form.gstRate),
          stockQty: BigInt(form.stockQty),
        });
        toast.success("Product added!");
      }
      setExpiry(sku, form.expiryDate);
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save product.");
    }
  };

  // Single delete: called after PIN verified + confirmation
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      localStorage.removeItem(getExpiryKey(deleteTarget));
      toast.success("Product deleted.");
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setDeleteTarget(null);
      setDeleteConfirmOpen(false);
    }
  };

  // Bulk delete: called after PIN verified
  async function handleBulkDelete() {
    setBulkDeleting(true);
    for (const sku of Array.from(selectedSkus)) {
      try {
        await deleteMutation.mutateAsync(sku);
        localStorage.removeItem(getExpiryKey(sku));
      } catch {
        toast.error(`Failed to delete ${sku}`);
      }
    }
    setSelectedSkus(new Set());
    setBulkDeleting(false);
    toast.success("Selected products deleted.");
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await loadXlsx();
    if (!ok) {
      toast.error(
        "Could not load Excel library. Check your internet connection.",
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLS = (window as any).XLSX;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLS.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLS.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        const rows = raw.slice(1);
        const parsed = parseExcelRows(rows);
        if (parsed.length === 0) {
          toast.error("No valid rows found in file.");
          return;
        }
        setImportRows(parsed);
        setImportProgress(null);
        setImportDialogOpen(true);
      } catch {
        toast.error("Could not read file. Please use the sample template.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    const validRows = importRows.filter((r) => !r.error);
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }
    setImporting(true);
    setImportProgress({ done: 0, total: validRows.length, errors: 0 });
    let errors = 0;
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await addMutation.mutateAsync({
          name: row.name,
          hsnCode: row.hsnCode,
          sku: row.sku,
          price: BigInt(Math.round(row.price * 100)),
          gstRate: BigInt(row.gstRate),
          stockQty: BigInt(row.stockQty),
        });
        if (row.expiryDate) {
          setExpiry(row.sku, row.expiryDate);
        }
      } catch {
        errors++;
      }
      setImportProgress({ done: i + 1, total: validRows.length, errors });
    }
    setImporting(false);
    if (errors === 0) {
      toast.success(`${validRows.length} products imported successfully!`);
    } else {
      toast.warning(
        `Import done: ${validRows.length - errors} added, ${errors} failed (duplicate barcode?).`,
      );
    }
    setImportDialogOpen(false);
    setImportRows([]);
    setImportProgress(null);
  };

  const downloadTemplate = async () => {
    const ok = await loadXlsx();
    if (!ok) {
      toast.error(
        "Could not load Excel library. Check your internet connection.",
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLS = (window as any).XLSX;
    const headers = [
      [
        "Product Name",
        "Barcode (SKU)",
        "MRP (₹)",
        "Stock Qty",
        "HSN Code",
        "GST Rate (0/5/12/18/28)",
        "Expiry Date (YYYY-MM-DD)",
      ],
    ];
    const sample = [
      ["Basmati Rice 1kg", "RICE001", 120, 50, "1006", 5, "2026-12-31"],
      ["Atta 5kg", "ATTA001", 250, 30, "1101", 5, "2026-06-30"],
      ["Sugar 1kg", "SUGAR001", 45, 100, "1701", 0, ""],
    ];
    const ws = XLS.utils.aoa_to_sheet([...headers, ...sample]);
    ws["!cols"] = [
      { wch: 22 },
      { wch: 16 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 24 },
      { wch: 22 },
    ];
    const wb = XLS.utils.book_new();
    XLS.utils.book_append_sheet(wb, ws, "Products");
    XLS.writeFile(wb, "product_import_template.xlsx");
  };

  const exportProducts = async () => {
    if (products.length === 0) {
      toast.error("No products to export.");
      return;
    }
    const ok = await loadXlsx();
    if (!ok) {
      toast.error(
        "Could not load Excel library. Check your internet connection.",
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLS = (window as any).XLSX;

    const headers = [
      "Product Name",
      "Barcode (SKU)",
      "MRP (₹)",
      "Stock Qty",
      "HSN Code",
      "GST Rate",
      "Expiry Date",
      "Batch Count",
      "Total Batch Stock",
    ];

    const rows = products.map((p) => {
      const batchList = getBatches(p.sku);
      const batchCount = batchList.length;
      const totalBatchStock =
        batchCount > 0 ? batchList.reduce((sum, b) => sum + b.stockQty, 0) : 0;
      const expiryDate = getExpiry(p.sku) || "";
      return [
        p.name,
        p.sku,
        (Number(p.price) / 100).toFixed(2),
        Number(p.stockQty),
        p.hsnCode,
        Number(p.gstRate),
        expiryDate,
        batchCount,
        totalBatchStock,
      ];
    });

    const ws = XLS.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
    ];
    const wb = XLS.utils.book_new();
    XLS.utils.book_append_sheet(wb, ws, "Products");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLS.writeFile(wb, `product_list_export_${dateStr}.xlsx`);
    toast.success(`${products.length} products exported!`);
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  const expiredCount = productsWithExpiry.filter(
    (p) => p.expiryStatus === "expired",
  ).length;
  const expiringCount = productsWithExpiry.filter(
    (p) => p.expiryStatus === "expiring",
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      data-ocid="products.section"
    >
      {/* Expiry alert banner */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 flex flex-wrap gap-x-4 gap-y-1">
            {expiredCount > 0 && (
              <span>
                <span className="font-bold text-red-600">{expiredCount}</span>{" "}
                product{expiredCount > 1 ? "s" : ""} expired
              </span>
            )}
            {expiringCount > 0 && (
              <span>
                <span className="font-bold text-amber-700">
                  {expiringCount}
                </span>{" "}
                product{expiringCount > 1 ? "s" : ""} expiring within 30 days
              </span>
            )}
          </div>
        </motion.div>
      )}

      <Card className="shadow-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg font-semibold">
              Product Catalog
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-44 bg-card"
                  data-ocid="products.search_input"
                />
              </div>
              <Button
                variant="outline"
                onClick={exportProducts}
                disabled={products.length === 0}
                className="text-orange-700 border-orange-300 hover:bg-orange-50"
                title="Export all products to Excel"
              >
                <Download className="w-4 h-4 mr-1" /> Export Products
              </Button>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="text-green-700 border-green-300 hover:bg-green-50"
                title="Download sample Excel template"
              >
                <Download className="w-4 h-4 mr-1" /> Template
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Import Excel
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={openAdd}
                className="bg-saffron hover:bg-saffron-dark text-white"
                data-ocid="products.primary_button"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </div>
          </div>

          {/* Bulk delete bar */}
          {someSelected && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {selectedSkus.size} product{selectedSkus.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeletePinOpen(true)}
                disabled={bulkDeleting}
                data-ocid="products.delete_button"
              >
                {bulkDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Selected ({selectedSkus.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSkus(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div
              className="flex justify-center py-12"
              data-ocid="products.loading_state"
            >
              <Loader2 className="w-8 h-8 animate-spin text-saffron" />
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 text-center"
              data-ocid="products.empty_state"
            >
              <Package className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {search
                  ? "No products match your search"
                  : "No products yet. Add your first product!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="products.table">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                        data-ocid="products.checkbox"
                      />
                    </TableHead>
                    <TableHead className="font-semibold">
                      Product Name
                    </TableHead>
                    <TableHead>HSN Code</TableHead>
                    <TableHead>SKU / Barcode</TableHead>
                    <TableHead className="text-right">MRP (₹)</TableHead>
                    <TableHead className="text-center">GST %</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-center">Expiry</TableHead>
                    <TableHead className="text-center">Batches</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((p, i) => {
                      const isExpiredRow = p.expiryStatus === "expired";
                      const isExpiringRow = p.expiryStatus === "expiring";
                      const isExpanded = expandedSku === p.sku;
                      const isChecked = selectedSkus.has(p.sku);

                      return (
                        <>
                          <motion.tr
                            key={`row-${p.sku}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={`border-b border-border transition-colors ${
                              isChecked
                                ? "bg-red-50/40"
                                : isExpanded
                                  ? "bg-amber-50/60"
                                  : isExpiredRow
                                    ? "bg-red-50 hover:bg-red-100/60"
                                    : isExpiringRow
                                      ? "bg-amber-50 hover:bg-amber-100/60"
                                      : "hover:bg-muted/30"
                            }`}
                            data-ocid={`products.item.${i + 1}`}
                          >
                            <TableCell className="w-10">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSelect(p.sku)}
                                aria-label={`Select ${p.name}`}
                                data-ocid={`products.checkbox.${i + 1}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.name}</span>
                                <ExpiryBadge status={p.expiryStatus} />
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {p.hsnCode}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {p.sku}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{(Number(p.price) / 100).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-saffron-light text-saffron-dark border-0">
                                {p.gstRate.toString()}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-0.5">
                                <span
                                  className={
                                    Number(p.stockQty) < 10
                                      ? "text-destructive font-medium"
                                      : ""
                                  }
                                >
                                  {p.stockQty.toString()}
                                </span>
                                {p.hasBatches && p.batchStock !== null && (
                                  <span className="text-xs text-amber-600">
                                    Batch: {p.batchStock}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {p.expiryDate ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span
                                    className={`text-xs font-medium ${
                                      isExpiredRow
                                        ? "text-red-600"
                                        : isExpiringRow
                                          ? "text-amber-600"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    <Calendar className="w-3 h-3 inline mr-0.5 mb-0.5" />
                                    {formatExpiryDisplay(p.expiryDate)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSku(isExpanded ? null : p.sku)
                                }
                                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded-md hover:bg-amber-100 transition-colors"
                                data-ocid={`products.batch.toggle.${i + 1}`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                                {p.batchCount > 0 ? (
                                  <span>{p.batchCount}</span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    0
                                  </span>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(p)}
                                  data-ocid={`products.edit_button.${i + 1}`}
                                >
                                  <Edit2 className="w-4 h-4 text-indigo" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeleteTarget(p.sku);
                                    setDeletePinOpen(true);
                                  }}
                                  data-ocid={`products.delete_button.${i + 1}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>

                          {/* Batch panel row */}
                          {isExpanded && (
                            <tr key={`batch-${p.sku}`}>
                              <td colSpan={10} className="p-0">
                                <BatchPanel
                                  sku={p.sku}
                                  productName={p.name}
                                  onClose={() => setExpandedSku(null)}
                                />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(o) => {
          if (!importing) {
            setImportDialogOpen(o);
          }
        }}
      >
        <DialogContent
          className="max-w-2xl w-full"
          data-ocid="products.import_dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Import Products from Excel
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground mb-2">
            {importRows.filter((r) => !r.error).length} valid rows ready to
            import
            {importRows.filter((r) => r.error).length > 0 && (
              <span className="text-destructive ml-2">
                · {importRows.filter((r) => r.error).length} rows have errors
                (will be skipped)
              </span>
            )}
          </div>

          {importProgress && (
            <div className="mb-3 p-3 rounded-lg bg-muted">
              <div className="flex justify-between text-sm mb-1">
                <span>
                  Importing... {importProgress.done} / {importProgress.total}
                </span>
                {importProgress.errors > 0 && (
                  <span className="text-destructive">
                    {importProgress.errors} failed
                  </span>
                )}
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div
                  className="bg-saffron h-2 rounded-full transition-all"
                  style={{
                    width: `${(importProgress.done / importProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>GST</TableHead>
                  {importRows.some((r) => r.expiryDate) && (
                    <TableHead>Expiry</TableHead>
                  )}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importRows.map((row, i) => (
                  <TableRow
                    key={`${row.sku}-${row.name}-${i}`}
                    className={row.error ? "bg-red-50" : ""}
                  >
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.name || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.sku || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{row.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{row.stockQty}</TableCell>
                    <TableCell>{row.hsnCode || "—"}</TableCell>
                    <TableCell>{row.gstRate}%</TableCell>
                    {importRows.some((r) => r.expiryDate) && (
                      <TableCell className="text-xs">
                        {row.expiryDate || "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      {row.error ? (
                        <span className="text-xs text-destructive">
                          {row.error}
                        </span>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importing || importRows.filter((r) => !r.error).length === 0
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Import{" "}
                  {importRows.filter((r) => !r.error).length} Products
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="products.dialog">
          <DialogHeader>
            <DialogTitle>
              {editProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-name">Product Name *</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Basmati Rice 1kg"
                  required
                  data-ocid="products.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-hsn">HSN Code *</Label>
                <Input
                  id="p-hsn"
                  value={form.hsnCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hsnCode: e.target.value }))
                  }
                  placeholder="e.g. 1006"
                  required
                  data-ocid="products.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-sku">SKU / Barcode *</Label>
                <Input
                  id="p-sku"
                  value={form.sku}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  placeholder="e.g. RICE-001"
                  required
                  disabled={!!editProduct}
                  data-ocid="products.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">MRP (₹) *</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="e.g. 120.00"
                  required
                  data-ocid="products.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-gst">GST Rate *</Label>
                <select
                  id="p-gst"
                  value={form.gstRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gstRate: e.target.value }))
                  }
                  required
                  data-ocid="products.select"
                  className="w-full h-9 px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stock Qty *</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="0"
                  value={form.stockQty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stockQty: e.target.value }))
                  }
                  placeholder="e.g. 100"
                  required
                  data-ocid="products.input"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="p-expiry" className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Expiry Date
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="p-expiry"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiryDate: e.target.value }))
                  }
                  data-ocid="products.input"
                />
                {form.expiryDate && (
                  <p
                    className={`text-xs ${
                      getExpiryStatus(form.expiryDate) === "expired"
                        ? "text-red-600"
                        : getExpiryStatus(form.expiryDate) === "expiring"
                          ? "text-amber-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {getExpiryStatus(form.expiryDate) === "expired" &&
                      "⚠ This product has already expired"}
                    {getExpiryStatus(form.expiryDate) === "expiring" &&
                      "⚠ This product expires within 30 days"}
                    {getExpiryStatus(form.expiryDate) === "ok" &&
                      `Expires: ${formatExpiryDisplay(form.expiryDate)}`}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="products.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-saffron hover:bg-saffron-dark text-white"
                data-ocid="products.submit_button"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editProduct ? "Save Changes" : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manager PIN dialog for single delete */}
      <ManagerPinDialog
        open={deletePinOpen}
        onOpenChange={(o) => {
          setDeletePinOpen(o);
          if (!o) setDeleteTarget(null);
        }}
        onSuccess={() => {
          setDeletePinOpen(false);
          setDeleteConfirmOpen(true);
        }}
        title="Delete Product"
      />

      {/* Confirm single delete after PIN */}
      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(o) => {
          setDeleteConfirmOpen(o);
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent data-ocid="products.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be permanently
              removed from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmOpen(false);
              }}
              data-ocid="products.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              data-ocid="products.delete_button"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manager PIN dialog for bulk delete */}
      <ManagerPinDialog
        open={bulkDeletePinOpen}
        onOpenChange={setBulkDeletePinOpen}
        onSuccess={() => {
          setBulkDeletePinOpen(false);
          handleBulkDelete();
        }}
        title="Delete Selected Products"
      />
    </motion.div>
  );
}

export { hasAnyBatches };
