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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  CreditCard,
  Loader2,
  Plus,
  Printer,
  Save,
  ScanLine,
  ShoppingCart,
  Smartphone,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { LineItem, Product } from "../backend.d";
import BarcodeScanner, { unlockAudio } from "../components/BarcodeScanner";
import ThermalReceipt from "../components/ThermalReceipt";
import type { InvoiceLineItemDisplay } from "../components/ThermalReceipt";
import {
  deductStockFIFO,
  getActiveBatches,
  getTotalBatchStock,
  hasAnyBatches,
} from "../hooks/useBatchInventory";
import {
  useCreateInvoice,
  useGetNextInvoiceNumber,
  useGetProducts,
  useGetStore,
} from "../hooks/useQueries";

interface CartItem {
  product: Product;
  qty: number;
  batchId?: string;
  batchExpiryDate?: string;
  costPrice?: number; // purchase cost per unit in rupees (not paise)
}

function isProductExpired(sku: string): boolean {
  const dateStr = localStorage.getItem(`expiry_${sku}`) ?? "";
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return exp < today;
}

function calcLineItem(item: CartItem, isIgst: boolean): InvoiceLineItemDisplay {
  const { product, qty } = item;
  const qtyBig = BigInt(qty);
  const mrp = product.price; // always use MRP for rate display

  // GST is calculated on cost price if provided, otherwise on MRP
  const costBase =
    item.costPrice !== undefined && item.costPrice > 0
      ? BigInt(Math.round(item.costPrice * 100))
      : mrp;

  const taxable = qtyBig * costBase;
  const gstRate = product.gstRate;
  const cgstAmt = isIgst ? 0n : (taxable * gstRate) / 200n;
  const sgstAmt = isIgst ? 0n : (taxable * gstRate) / 200n;
  const igstAmt = isIgst ? (taxable * gstRate) / 100n : 0n;
  const lineTotal = taxable + (isIgst ? igstAmt : cgstAmt + sgstAmt);
  return {
    productName: product.name,
    barcode: product.sku,
    hsnCode: product.hsnCode,
    qty: qtyBig,
    rate: mrp,
    gstRate,
    lineTotal,
    cgstAmt,
    sgstAmt,
    igstAmt,
    costPrice:
      item.costPrice !== undefined
        ? BigInt(Math.round(item.costPrice * 100))
        : undefined,
  };
}

type PaymentMode = "Cash" | "Card" | "UPI";

interface InsufficientItem {
  name: string;
  requested: number;
  available: number;
}

export default function NewInvoice() {
  const { data: products = [] } = useGetProducts();

  const inStockProducts = products.filter((p) => {
    const sku = p.sku;
    if (hasAnyBatches(sku)) {
      // Batch products: valid if ANY active (non-expired, qty>0) batch exists
      return getTotalBatchStock(sku) > 0;
    }
    // Non-batch products: valid if qty > 0
    // If NO expiry date is set → always include (non-perishable goods)
    // If expiry date IS set → only include if not expired
    if (Number(p.stockQty) <= 0) return false;
    const hasExpiry = !!localStorage.getItem(`expiry_${sku}`);
    if (!hasExpiry) return true; // no expiry = always show
    return !isProductExpired(sku);
  });

  const { data: store } = useGetStore();
  const { data: nextInvNo } = useGetNextInvoiceNumber();
  const createMutation = useCreateInvoice();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [isIgst, setIsIgst] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("Cash");
  const [isPrinting, setIsPrinting] = useState(false);

  // Insufficient stock popup
  const [insufficientItems, setInsufficientItems] = useState<
    InsufficientItem[]
  >([]);
  const [stockPopupOpen, setStockPopupOpen] = useState(false);

  // Trigger actual print after animation plays
  useEffect(() => {
    if (!isPrinting) return;
    const timer = setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 5500);
    return () => clearTimeout(timer);
  }, [isPrinting]);

  // Parse selectedSku which may be "sku" or "sku::batchId"
  function parseSelectedValue(val: string): {
    sku: string;
    batchId: string | null;
  } {
    const parts = val.split("::");
    return { sku: parts[0], batchId: parts[1] ?? null };
  }

  const addToCart = () => {
    if (!selectedSku) return;
    const { sku, batchId } = parseSelectedValue(selectedSku);
    const product = products.find((p) => p.sku === sku);
    if (!product) return;

    // Auto-fill costPrice from defaultRate (in paise → convert to rupees for display)
    const autoCostPrice =
      product.defaultRate !== undefined
        ? Number(product.defaultRate) / 100
        : undefined;

    if (hasAnyBatches(product.sku)) {
      const activeBatches = getActiveBatches(product.sku);
      if (activeBatches.length === 0) {
        toast.error(`All batches of ${product.name} have expired`);
        return;
      }
      // Use the selected batch if provided, otherwise fall back to earliest (FIFO)
      const targetBatch = batchId
        ? (activeBatches.find((b) => b.batchId === batchId) ?? activeBatches[0])
        : activeBatches[0];

      setCart((prev) => {
        const existing = prev.find(
          (i) => i.product.sku === sku && i.batchId === targetBatch.batchId,
        );
        if (existing) {
          return prev.map((i) =>
            i.product.sku === sku && i.batchId === targetBatch.batchId
              ? { ...i, qty: i.qty + 1 }
              : i,
          );
        }
        return [
          ...prev,
          {
            product,
            qty: 1,
            batchId: targetBatch.batchId,
            batchExpiryDate: targetBatch.expiryDate,
            costPrice: autoCostPrice,
          },
        ];
      });
    } else {
      setCart((prev) => {
        const existing = prev.find((i) => i.product.sku === sku);
        if (existing) {
          return prev.map((i) =>
            i.product.sku === sku ? { ...i, qty: i.qty + 1 } : i,
          );
        }
        return [...prev, { product, qty: 1, costPrice: autoCostPrice }];
      });
    }
    setSelectedSku("");
  };

  const addByBarcode = (barcode: string) => {
    const product = products.find((p) => p.sku === barcode);
    if (!product) {
      toast.error(`No product found with barcode/SKU: ${barcode}`);
      return;
    }

    // Auto-fill costPrice from defaultRate (paise → rupees)
    const autoCostPrice =
      product.defaultRate !== undefined
        ? Number(product.defaultRate) / 100
        : undefined;

    if (hasAnyBatches(product.sku)) {
      const activeBatches = getActiveBatches(product.sku);
      if (activeBatches.length === 0) {
        toast.error(
          `All batches of ${product.name} have expired. Cannot add to invoice.`,
        );
        return;
      }
      const earliest = activeBatches[0];
      setCart((prev) => {
        const existing = prev.find((i) => i.product.sku === barcode);
        if (existing) {
          return prev.map((i) =>
            i.product.sku === barcode ? { ...i, qty: i.qty + 1 } : i,
          );
        }
        return [
          ...prev,
          {
            product,
            qty: 1,
            batchId: earliest.batchId,
            batchExpiryDate: earliest.expiryDate,
            costPrice: autoCostPrice,
          },
        ];
      });
      toast.success(`Added: ${product.name}`);
      return;
    }

    // Non-batch product
    if (Number(product.stockQty) <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    if (isProductExpired(product.sku)) {
      toast.error(`${product.name} has expired and cannot be added to invoice`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.sku === barcode);
      if (existing) {
        return prev.map((i) =>
          i.product.sku === barcode ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product, qty: 1, costPrice: autoCostPrice }];
    });
    toast.success(`Added: ${product.name}`);
  };

  // cartKey is either "sku" or "sku::batchId" for batch products
  const updateQty = (cartKey: string, qty: number) => {
    const { sku, batchId } = parseSelectedValue(cartKey);
    if (qty <= 0) {
      setCart((prev) =>
        prev.filter((i) =>
          batchId
            ? !(i.product.sku === sku && i.batchId === batchId)
            : i.product.sku !== sku,
        ),
      );
    } else {
      setCart((prev) =>
        prev.map((i) => {
          const match = batchId
            ? i.product.sku === sku && i.batchId === batchId
            : i.product.sku === sku;
          return match ? { ...i, qty } : i;
        }),
      );
    }
  };

  const removeItem = (cartKey: string) => {
    const { sku, batchId } = parseSelectedValue(cartKey);
    setCart((prev) =>
      prev.filter((i) =>
        batchId
          ? !(i.product.sku === sku && i.batchId === batchId)
          : i.product.sku !== sku,
      ),
    );
  };

  const setCostPrice = (cartKey: string, cost: number | undefined) => {
    const { sku, batchId } = parseSelectedValue(cartKey);
    setCart((prev) =>
      prev.map((i) => {
        const match = batchId
          ? i.product.sku === sku && i.batchId === batchId
          : i.product.sku === sku;
        return match ? { ...i, costPrice: cost } : i;
      }),
    );
  };

  const lineItems = useMemo(
    () => cart.map((item) => calcLineItem(item, isIgst)),
    [cart, isIgst],
  );

  // Subtotal = sum of (qty * costBase) per line item — i.e. taxable base
  const subtotal = useMemo(
    () =>
      lineItems.reduce((sum, li) => {
        // costPrice in paise per unit; if missing fall back to rate (MRP)
        const base =
          li.costPrice !== undefined && li.costPrice > 0n
            ? li.costPrice
            : li.rate;
        return sum + li.qty * base;
      }, 0n),
    [lineItems],
  );
  const totalCgst = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.cgstAmt, 0n),
    [lineItems],
  );
  const totalSgst = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.sgstAmt, 0n),
    [lineItems],
  );
  const totalIgst = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.igstAmt, 0n),
    [lineItems],
  );
  const grandTotal = useMemo(
    () => subtotal + (isIgst ? totalIgst : totalCgst + totalSgst),
    [subtotal, isIgst, totalIgst, totalCgst, totalSgst],
  );

  const handlePrint = () => {
    if (cart.length === 0) return;
    setIsPrinting(true);
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      toast.error("Add at least one product to the invoice.");
      return;
    }

    // ── Pre-save stock validation
    const insufficient: InsufficientItem[] = [];
    for (const item of cart) {
      const sku = item.product.sku;
      let available: number;
      if (hasAnyBatches(sku)) {
        available = getTotalBatchStock(sku);
      } else {
        available = Number(item.product.stockQty);
      }
      if (item.qty > available) {
        insufficient.push({
          name: item.product.name,
          requested: item.qty,
          available,
        });
      }
    }

    if (insufficient.length > 0) {
      setInsufficientItems(insufficient);
      setStockPopupOpen(true);
      return;
    }

    const backendLineItems: LineItem[] = lineItems.map((li) => ({
      qty: li.qty,
      rate: li.rate,
      lineTotal: li.lineTotal,
      sgstAmt: li.sgstAmt,
      hsnCode: li.hsnCode,
      productId:
        cart.find((c) => c.product.name === li.productName)?.product.sku || "",
      productName: li.productName,
      gstRate: li.gstRate,
      igstAmt: li.igstAmt,
      cgstAmt: li.cgstAmt,
    }));
    try {
      await createMutation.mutateAsync({
        customerName,
        customerGstin,
        customerMobile,
        isIgst,
        lineItems: backendLineItems,
      });

      // ── Deduct stock: batches via FIFO, non-batches via updateProductStock
      for (const item of cart) {
        if (hasAnyBatches(item.product.sku)) {
          try {
            deductStockFIFO(item.product.sku, item.qty);
          } catch (e) {
            console.warn("Batch deduction warning:", e);
          }
        }
        // Non-batch stock deduction is handled by the backend createInvoice mutation
      }

      toast.success("Invoice saved successfully!");
      setCart([]);
      setCustomerName("");
      setCustomerMobile("");
      setCustomerGstin("");
      setIsIgst(false);
      setPaymentMode("Cash");
    } catch (e) {
      toast.error(`Failed to save invoice: ${String(e)}`);
    }
  };

  const fmt = (paise: bigint) => `₹${(Number(paise) / 100).toFixed(2)}`;

  const paymentModes: {
    mode: PaymentMode;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
  }[] = [
    {
      mode: "Cash",
      label: "Cash",
      icon: <Banknote className="w-4 h-4" />,
      activeClass: "bg-green-600 text-white border-green-600",
    },
    {
      mode: "Card",
      label: "Card",
      icon: <CreditCard className="w-4 h-4" />,
      activeClass: "bg-blue-600 text-white border-blue-600",
    },
    {
      mode: "UPI",
      label: "UPI",
      icon: <Smartphone className="w-4 h-4" />,
      activeClass: "bg-purple-600 text-white border-purple-600",
    },
  ];

  const receiptProps = {
    store: store || null,
    invoiceNumber: nextInvNo ?? 1n,
    date: new Date(),
    customerName: customerName || undefined,
    customerMobile: customerMobile || undefined,
    customerGstin: customerGstin || undefined,
    isIgst,
    lineItems,
    subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    grandTotal,
    paymentMode,
  };

  return (
    <>
      {/* Thermal Printer Illusion Overlay */}
      <AnimatePresence>
        {isPrinting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backgroundColor: "rgba(0,0,0,0.80)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
            data-ocid="invoice.modal"
          >
            <div
              style={{
                position: "absolute",
                top: "8%",
                color: "white",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                borderRadius: 9999,
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
                zIndex: 110,
              }}
            >
              <span>🖨️</span>
              <span>Printing receipt...</span>
            </div>

            <div
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                justifyContent: "center",
                zIndex: 104,
              }}
            >
              <motion.div
                initial={{ y: "100vh" }}
                animate={{ y: "-30vh" }}
                transition={{ duration: 5, ease: [0.2, 0, 0.4, 1] }}
                style={{
                  zIndex: 105,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 302,
                    height: 8,
                    background: "#1f2937",
                    borderRadius: "4px 4px 0 0",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 200,
                      height: 3,
                      background: "#374151",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div
                  style={{
                    background: "white",
                    padding: "8px",
                    boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
                    width: 302,
                  }}
                >
                  <ThermalReceipt {...receiptProps} />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insufficient Stock Dialog */}
      <Dialog open={stockPopupOpen} onOpenChange={setStockPopupOpen}>
        <DialogContent className="max-w-sm" data-ocid="invoice.dialog">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              ⚠️ Insufficient Stock
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The following items do not have enough stock. Please reduce
              quantities before saving.
            </p>
            <div className="divide-y divide-border rounded-lg border overflow-hidden">
              {insufficientItems.map((item) => (
                <div
                  key={item.name}
                  className="px-4 py-3 flex items-center justify-between gap-2"
                >
                  <span className="text-sm font-medium truncate">
                    {item.name}
                  </span>
                  <div className="text-xs text-right flex-shrink-0">
                    <span className="text-destructive font-semibold">
                      Requested: {item.requested}
                    </span>
                    <br />
                    <span className="text-muted-foreground">
                      Available: {item.available}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setStockPopupOpen(false)}
              className="w-full"
              data-ocid="invoice.close_button"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6"
        data-ocid="invoice.section"
      >
        {/* Left: Invoice Builder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Customer & Settings */}
          <Card className="shadow-card border-border">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-base font-semibold">
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name">Customer Name (optional)</Label>
                  <Input
                    id="cust-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    data-ocid="invoice.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-mobile">
                    Customer Mobile (optional)
                  </Label>
                  <Input
                    id="cust-mobile"
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    data-ocid="invoice.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-gstin">Customer GSTIN (optional)</Label>
                  <Input
                    id="cust-gstin"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    data-ocid="invoice.input"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Switch
                  id="gst-type"
                  checked={isIgst}
                  onCheckedChange={setIsIgst}
                  data-ocid="invoice.switch"
                />
                <div>
                  <Label
                    htmlFor="gst-type"
                    className="cursor-pointer font-medium"
                  >
                    {isIgst
                      ? "IGST (Inter-State)"
                      : "CGST + SGST (Intra-State)"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isIgst
                      ? "Customer is from a different state"
                      : "Customer is from the same state"}
                  </p>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Mode</Label>
                <div className="flex gap-2">
                  {paymentModes.map(({ mode, label, icon, activeClass }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      data-ocid="invoice.toggle"
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all flex-1 justify-center ${
                        paymentMode === mode
                          ? activeClass
                          : "bg-background text-muted-foreground border-border hover:border-primary"
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Selector */}
          <Card className="shadow-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base font-semibold">
                Add Products
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Select value={selectedSku} onValueChange={setSelectedSku}>
                  <SelectTrigger className="flex-1" data-ocid="invoice.select">
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inStockProducts.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No products available
                      </SelectItem>
                    ) : (
                      inStockProducts.flatMap((p) => {
                        if (hasAnyBatches(p.sku)) {
                          const activeBatches = getActiveBatches(p.sku);
                          if (activeBatches.length === 0) return [];
                          return activeBatches.map((batch) => {
                            const mrpStr = `₹${(Number(p.price) / 100).toFixed(2)}`;
                            const costStr =
                              p.defaultRate !== undefined
                                ? ` | Cost: ₹${(Number(p.defaultRate) / 100).toFixed(2)}`
                                : "";
                            return (
                              <SelectItem
                                key={`${p.sku}::${batch.batchId}`}
                                value={`${p.sku}::${batch.batchId}`}
                              >
                                {p.name} — MRP: {mrpStr}
                                {costStr} | Exp: {batch.expiryDate} | Qty:{" "}
                                {batch.stockQty} (GST: {p.gstRate.toString()}%)
                              </SelectItem>
                            );
                          });
                        }
                        const mrpStr = `₹${(Number(p.price) / 100).toFixed(2)}`;
                        const costStr =
                          p.defaultRate !== undefined
                            ? ` | Cost: ₹${(Number(p.defaultRate) / 100).toFixed(2)}`
                            : "";
                        return [
                          <SelectItem key={p.sku} value={p.sku}>
                            {p.name} — MRP: {mrpStr}
                            {costStr} | Qty: {Number(p.stockQty)} (GST:{" "}
                            {p.gstRate.toString()}%)
                          </SelectItem>,
                        ];
                      })
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={addToCart}
                  disabled={!selectedSku}
                  className="bg-saffron hover:bg-saffron-dark text-white"
                  data-ocid="invoice.primary_button"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
                <Button
                  onClick={() => {
                    unlockAudio();
                    setScannerOpen(true);
                  }}
                  variant="outline"
                  className="border-saffron text-saffron hover:bg-saffron/10"
                  title="Scan barcode"
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <BarcodeScanner
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onDetected={addByBarcode}
          />

          {/* Items Table */}
          <Card className="shadow-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Invoice Items
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {cart.length} item(s)
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div
                  className="flex flex-col items-center py-12 text-center"
                  data-ocid="invoice.empty_state"
                >
                  <ShoppingCart className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No items added yet
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-ocid="invoice.table">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">MRP</TableHead>
                        <TableHead className="text-right">Cost (₹)</TableHead>
                        <TableHead className="text-center">GST%</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item, i) => {
                        const li = lineItems[i];
                        const cartKey = item.batchId
                          ? `${item.product.sku}::${item.batchId}`
                          : item.product.sku;
                        return (
                          <TableRow
                            key={cartKey}
                            data-ocid={`invoice.item.${i + 1}`}
                          >
                            <TableCell className="font-medium">
                              <div>
                                {item.product.name}
                                {item.batchExpiryDate && (
                                  <div className="text-xs text-amber-600 mt-0.5 font-normal">
                                    Batch exp:{" "}
                                    {new Date(
                                      item.batchExpiryDate,
                                    ).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {item.product.hsnCode}
                            </TableCell>
                            <TableCell className="w-32">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQty(
                                      cartKey,
                                      Math.max(1, item.qty - 1),
                                    )
                                  }
                                  className="w-7 h-7 rounded bg-muted text-foreground text-lg font-bold flex items-center justify-center select-none"
                                >
                                  −
                                </button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) =>
                                    updateQty(
                                      cartKey,
                                      Number.parseInt(e.target.value) || 1,
                                    )
                                  }
                                  className="w-12 text-center h-7 text-sm p-0"
                                  data-ocid="invoice.input"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQty(cartKey, item.qty + 1)
                                  }
                                  className="w-7 h-7 rounded bg-muted text-foreground text-lg font-bold flex items-center justify-center select-none"
                                >
                                  +
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div>{fmt(item.product.price)}</div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="space-y-0.5">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.costPrice ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCostPrice(
                                      cartKey,
                                      val === ""
                                        ? undefined
                                        : Number.parseFloat(val),
                                    );
                                  }}
                                  placeholder="0.00"
                                  className="w-20 text-right h-7 text-sm p-1"
                                  data-ocid="invoice.input"
                                />
                                {item.product.defaultRate !== undefined &&
                                  item.costPrice !== undefined && (
                                    <div className="text-xs text-primary/70 text-right font-medium">
                                      auto-filled
                                    </div>
                                  )}
                                <div className="text-xs text-muted-foreground text-right">
                                  MRP: {fmt(item.product.price)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {item.product.gstRate.toString()}%
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {fmt(li.lineTotal)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(cartKey)}
                                data-ocid={`invoice.delete_button.${i + 1}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>

            {cart.length > 0 && (
              <div className="border-t border-border p-4 space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal (Taxable)</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {isIgst ? (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>IGST</span>
                    <span>{fmt(totalIgst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>CGST</span>
                      <span>{fmt(totalCgst)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>SGST</span>
                      <span>{fmt(totalSgst)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-border pt-2 mt-2">
                  <span>Grand Total</span>
                  <span className="text-saffron-dark">{fmt(grandTotal)}</span>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Right: Thermal Preview */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <Card className="shadow-card border-border">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base font-semibold">
                🧾 Print Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex justify-center">
              <div className="border border-dashed border-border rounded-lg p-2 bg-white">
                <ThermalReceipt {...receiptProps} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePrint}
              disabled={cart.length === 0}
              className="w-full bg-indigo hover:bg-indigo-dark text-white"
              data-ocid="invoice.primary_button"
            >
              <Printer className="w-4 h-4 mr-2" /> Print Invoice
            </Button>
            <Button
              onClick={handleSave}
              disabled={cart.length === 0 || createMutation.isPending}
              className="w-full bg-saffron hover:bg-saffron-dark text-white"
              data-ocid="invoice.save_button"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {createMutation.isPending ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
