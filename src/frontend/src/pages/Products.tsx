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
  Download,
  Edit2,
  FileSpreadsheet,
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
import {
  useAddProduct,
  useDeleteProduct,
  useGetProducts,
  useUpdateProduct,
} from "../hooks/useQueries";

const GST_RATES = [0, 5, 12, 18, 28];

interface ProductForm {
  name: string;
  hsnCode: string;
  sku: string;
  price: string;
  gstRate: string;
  stockQty: string;
}

const emptyForm: ProductForm = {
  name: "",
  hsnCode: "",
  sku: "",
  price: "",
  gstRate: "5",
  stockQty: "0",
};

interface ImportRow {
  name: string;
  sku: string;
  price: number;
  stockQty: number;
  hsnCode: string;
  gstRate: number;
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

      return {
        name,
        sku,
        price,
        stockQty: Number.isNaN(stockQty) ? 0 : stockQty,
        hsnCode,
        gstRate,
        error,
      };
    });
}

// ── CDN loader for xlsx (not in package.json; loaded on demand) ──────────────
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

export default function Products() {
  const { data: products = [], isLoading } = useGetProducts();
  const addMutation = useAddProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
    errors: number;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.hsnCode.includes(search),
  );

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
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pricePaise = BigInt(Math.round(Number.parseFloat(form.price) * 100));
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
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save product.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast.success("Product deleted.");
    } catch {
      toast.error("Failed to delete product.");
    } finally {
      setDeleteTarget(null);
    }
  };

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
        // Skip header row
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
    // Reset input
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
      ],
    ];
    const sample = [
      ["Basmati Rice 1kg", "RICE001", 120, 50, "1006", 5],
      ["Atta 5kg", "ATTA001", 250, 30, "1101", 5],
      ["Sugar 1kg", "SUGAR001", 45, 100, "1701", 0],
    ];
    const ws = XLS.utils.aoa_to_sheet([...headers, ...sample]);
    ws["!cols"] = [
      { wch: 22 },
      { wch: 16 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 24 },
    ];
    const wb = XLS.utils.book_new();
    XLS.utils.book_append_sheet(wb, ws, "Products");
    XLS.writeFile(wb, "product_import_template.xlsx");
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      data-ocid="products.section"
    >
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
                    <TableHead className="font-semibold">
                      Product Name
                    </TableHead>
                    <TableHead>HSN Code</TableHead>
                    <TableHead>SKU / Barcode</TableHead>
                    <TableHead className="text-right">MRP (₹)</TableHead>
                    <TableHead className="text-center">GST %</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filtered.map((p, i) => (
                      <motion.tr
                        key={p.sku}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                        data-ocid={`products.item.${i + 1}`}
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
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
                          <span
                            className={
                              Number(p.stockQty) < 10
                                ? "text-destructive font-medium"
                                : ""
                            }
                          >
                            {p.stockQty.toString()}
                          </span>
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
                              onClick={() => setDeleteTarget(p.sku)}
                              data-ocid={`products.delete_button.${i + 1}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
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
                <Label htmlFor="p-sku">
                  SKU / Barcode *{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (enter product barcode for scanning)
                  </span>
                </Label>
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

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
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
            <AlertDialogCancel data-ocid="products.cancel_button">
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
    </motion.div>
  );
}
