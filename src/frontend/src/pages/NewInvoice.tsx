import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2,
  Plus,
  Printer,
  Save,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { LineItem, Product } from "../backend.d";
import ThermalReceipt from "../components/ThermalReceipt";
import type { InvoiceLineItemDisplay } from "../components/ThermalReceipt";
import {
  useCreateInvoice,
  useGetNextInvoiceNumber,
  useGetProducts,
  useGetStore,
} from "../hooks/useQueries";

interface CartItem {
  product: Product;
  qty: number;
}

function calcLineItem(item: CartItem, isIgst: boolean): InvoiceLineItemDisplay {
  const { product, qty } = item;
  const qtyBig = BigInt(qty);
  const rate = product.price;
  const taxable = qtyBig * rate;
  const gstRate = product.gstRate;
  const cgstAmt = isIgst ? 0n : (taxable * gstRate) / 200n;
  const sgstAmt = isIgst ? 0n : (taxable * gstRate) / 200n;
  const igstAmt = isIgst ? (taxable * gstRate) / 100n : 0n;
  const lineTotal = taxable + (isIgst ? igstAmt : cgstAmt + sgstAmt);
  return {
    productName: product.name,
    hsnCode: product.hsnCode,
    qty: qtyBig,
    rate,
    gstRate,
    lineTotal,
    cgstAmt,
    sgstAmt,
    igstAmt,
  };
}

export default function NewInvoice() {
  const { data: products = [] } = useGetProducts();
  const { data: store } = useGetStore();
  const { data: nextInvNo } = useGetNextInvoiceNumber();
  const createMutation = useCreateInvoice();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [isIgst, setIsIgst] = useState(false);

  const addToCart = () => {
    if (!selectedSku) return;
    const product = products.find((p) => p.sku === selectedSku);
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.sku === selectedSku);
      if (existing) {
        return prev.map((i) =>
          i.product.sku === selectedSku ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setSelectedSku("");
  };

  const updateQty = (sku: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.sku !== sku));
    } else {
      setCart((prev) =>
        prev.map((i) => (i.product.sku === sku ? { ...i, qty } : i)),
      );
    }
  };

  const removeItem = (sku: string) =>
    setCart((prev) => prev.filter((i) => i.product.sku !== sku));

  const lineItems = useMemo(
    () => cart.map((item) => calcLineItem(item, isIgst)),
    [cart, isIgst],
  );

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0n),
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

  const handlePrint = () => window.print();

  const handleSave = async () => {
    if (cart.length === 0) {
      toast.error("Add at least one product to the invoice.");
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
        isIgst,
        lineItems: backendLineItems,
      });
      toast.success("Invoice saved successfully!");
      setCart([]);
      setCustomerName("");
      setCustomerGstin("");
      setIsIgst(false);
    } catch {
      toast.error("Failed to save invoice. Please try again.");
    }
  };

  const fmt = (paise: bigint) => `₹${(Number(paise) / 100).toFixed(2)}`;

  return (
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
                  {isIgst ? "IGST (Inter-State)" : "CGST + SGST (Intra-State)"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isIgst
                    ? "Customer is from a different state"
                    : "Customer is from the same state"}
                </p>
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
                  {products.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No products available
                    </SelectItem>
                  ) : (
                    products.map((p) => (
                      <SelectItem key={p.sku} value={p.sku}>
                        {p.name} — ₹{(Number(p.price) / 100).toFixed(2)} (GST:{" "}
                        {p.gstRate.toString()}%)
                      </SelectItem>
                    ))
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
            </div>
          </CardContent>
        </Card>

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
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-center">GST%</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, i) => {
                      const li = lineItems[i];
                      return (
                        <TableRow
                          key={item.product.sku}
                          data-ocid={`invoice.item.${i + 1}`}
                        >
                          <TableCell className="font-medium">
                            {item.product.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.product.hsnCode}
                          </TableCell>
                          <TableCell className="w-24">
                            <Input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                updateQty(
                                  item.product.sku,
                                  Number.parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-16 text-center h-8 text-sm"
                              data-ocid="invoice.input"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {fmt(item.product.price)}
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
                              onClick={() => removeItem(item.product.sku)}
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
              <ThermalReceipt
                store={store || null}
                invoiceNumber={nextInvNo ?? 1n}
                date={new Date()}
                customerName={customerName || undefined}
                customerGstin={customerGstin || undefined}
                isIgst={isIgst}
                lineItems={lineItems}
                subtotal={subtotal}
                totalCgst={totalCgst}
                totalSgst={totalSgst}
                totalIgst={totalIgst}
                grandTotal={grandTotal}
              />
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
  );
}
