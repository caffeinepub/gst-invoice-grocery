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
  Eye,
  Loader2,
  Pencil,
  Printer,
  Receipt,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Invoice, LineItem } from "../backend.d";
import ThermalReceipt, { invoiceToDisplay } from "../components/ThermalReceipt";
import {
  useDeleteInvoice,
  useGetInvoices,
  useGetStore,
  useUpdateInvoice,
} from "../hooks/useQueries";

const fmt = (paise: bigint) => `₹${(Number(paise) / 100).toFixed(2)}`;

const fmtNum = (paise: bigint) => (Number(paise) / 100).toFixed(2);

function exportToCsv(
  filename: string,
  rows: Record<string, string | number>[],
) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escapeCsv = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => headers.map((h) => escapeCsv(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function recalcLineItem(item: LineItem, isIgst: boolean): LineItem {
  const base = item.qty * item.rate;
  let cgstAmt = 0n;
  let sgstAmt = 0n;
  let igstAmt = 0n;
  if (isIgst) {
    igstAmt = (base * item.gstRate) / 100n;
  } else {
    cgstAmt = (base * item.gstRate) / 200n;
    sgstAmt = (base * item.gstRate) / 200n;
  }
  const lineTotal = base + cgstAmt + sgstAmt + igstAmt;
  return { ...item, cgstAmt, sgstAmt, igstAmt, lineTotal };
}

interface EditState {
  invoice: Invoice;
  customerName: string;
  customerGstin: string;
  isIgst: boolean;
  lineItems: LineItem[];
}

export default function Invoices() {
  const { data: invoices = [], isLoading } = useGetInvoices();
  const { data: store } = useGetStore();
  const deleteMutation = useDeleteInvoice();
  const updateMutation = useUpdateInvoice();

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const printTriggered = useRef(false);

  const logoUrl = localStorage.getItem("store_logo") ?? undefined;

  // Trigger actual print after animation
  useEffect(() => {
    if (!printInvoice) {
      printTriggered.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (!printTriggered.current) {
        printTriggered.current = true;
        // Print only the receipt content
        const receiptEl = document.getElementById("reprint-receipt-content");
        if (receiptEl) {
          const printWin = window.open("", "", "width=400,height=700");
          if (printWin) {
            printWin.document.write(
              `<html><head><style>
                body { margin: 0; background: white; }
                * { box-sizing: border-box; }
              </style></head><body>${receiptEl.innerHTML}</body></html>`,
            );
            printWin.document.close();
            printWin.focus();
            printWin.print();
            printWin.close();
          }
        }
        setPrintInvoice(null);
      }
    }, 5500);
    return () => clearTimeout(timer);
  }, [printInvoice]);

  const filtered = useMemo(() => {
    let list = [...invoices].sort(
      (a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber),
    );
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((inv) => Number(inv.date) / 1_000_000 >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      list = list.filter((inv) => Number(inv.date) / 1_000_000 <= to);
    }
    return list;
  }, [invoices, dateFrom, dateTo]);

  const grandTotal = useMemo(() => {
    if (!editState) return 0n;
    return editState.lineItems.reduce((sum, item) => sum + item.lineTotal, 0n);
  }, [editState]);

  function openEdit(inv: Invoice) {
    setEditState({
      invoice: inv,
      customerName: inv.customerName,
      customerGstin: inv.customerGstin,
      isIgst: inv.isIgst,
      lineItems: inv.lineItems.map((li) => ({ ...li })),
    });
  }

  function updateQty(index: number, qty: number) {
    if (!editState) return;
    const newItems = editState.lineItems.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, qty: BigInt(Math.max(1, qty)) };
      return recalcLineItem(updated, editState.isIgst);
    });
    setEditState((prev) => (prev ? { ...prev, lineItems: newItems } : prev));
  }

  function toggleGstType(isIgst: boolean) {
    if (!editState) return;
    const newItems = editState.lineItems.map((item) =>
      recalcLineItem(item, isIgst),
    );
    setEditState((prev) =>
      prev ? { ...prev, isIgst, lineItems: newItems } : prev,
    );
  }

  async function handleSaveEdit() {
    if (!editState) return;
    await updateMutation.mutateAsync({
      invoiceNumber: editState.invoice.invoiceNumber,
      customerName: editState.customerName,
      customerGstin: editState.customerGstin,
      isIgst: editState.isIgst,
      lineItems: editState.lineItems,
    });
    setEditState(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const invoiceNumber = deleteTarget.invoiceNumber;
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync(invoiceNumber);
    } catch (err) {
      console.error("Delete failed:", err);
      alert(
        `Delete failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const summaryRows = filtered.map((inv, i) => ({
      "#": i + 1,
      "Invoice No": `#${inv.invoiceNumber.toString()}`,
      Date: new Date(Number(inv.date) / 1_000_000).toLocaleDateString("en-IN"),
      "Customer Name": inv.customerName || "Walk-in",
      "Customer GSTIN": inv.customerGstin || "",
      "GST Type": inv.isIgst ? "IGST" : "CGST+SGST",
      "Items Count": inv.lineItems.length,
      "Subtotal (Rs)": fmtNum(inv.subtotal),
      "Total CGST (Rs)": fmtNum(inv.totalCgst),
      "Total SGST (Rs)": fmtNum(inv.totalSgst),
      "Total IGST (Rs)": fmtNum(inv.totalIgst),
      "Grand Total (Rs)": fmtNum(inv.grandTotal),
    }));
    const fromStr = dateFrom || "all";
    const toStr = dateTo || "all";
    exportToCsv(`invoices_${fromStr}_to_${toStr}.csv`, summaryRows);
    const lineRows: Record<string, string | number>[] = [];
    for (const inv of filtered) {
      for (const item of inv.lineItems) {
        lineRows.push({
          "Invoice No": `#${inv.invoiceNumber.toString()}`,
          Date: new Date(Number(inv.date) / 1_000_000).toLocaleDateString(
            "en-IN",
          ),
          Customer: inv.customerName || "Walk-in",
          "Product Name": item.productName,
          "HSN Code": item.hsnCode,
          Qty: Number(item.qty),
          "Rate (Rs)": fmtNum(item.rate),
          "GST Rate (%)": Number(item.gstRate),
          "CGST (Rs)": fmtNum(item.cgstAmt),
          "SGST (Rs)": fmtNum(item.sgstAmt),
          "IGST (Rs)": fmtNum(item.igstAmt),
          "Line Total (Rs)": fmtNum(item.lineTotal),
        });
      }
    }
    if (lineRows.length > 0) {
      exportToCsv(`invoice_items_${fromStr}_to_${toStr}.csv`, lineRows);
    }
  };

  // Build receipt props for print invoice
  const printReceiptProps = printInvoice
    ? {
        store: store || null,
        ...invoiceToDisplay(printInvoice),
        logoUrl,
      }
    : null;

  return (
    <>
      {/* Thermal Printer Print Animation Overlay */}
      <AnimatePresence>
        {printInvoice && printReceiptProps && (
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
                  {/* Hidden element used for actual printing */}
                  <div id="reprint-receipt-content">
                    <ThermalReceipt {...printReceiptProps} />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
        data-ocid="invoices.section"
      >
        <Card className="shadow-card border-border">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg font-semibold">
                Saved Invoices
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
                </Badge>
                <Button
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={filtered.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs font-semibold"
                  data-ocid="invoices.export_button"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  From:
                </span>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-sm w-36"
                  data-ocid="invoices.date_from"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  To:
                </span>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-sm w-36"
                  data-ocid="invoices.date_to"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div
                className="flex justify-center py-12"
                data-ocid="invoices.loading_state"
              >
                <Loader2 className="w-8 h-8 animate-spin text-teal" />
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="flex flex-col items-center py-16 text-center"
                data-ocid="invoices.empty_state"
              >
                <Receipt className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {invoices.length === 0
                    ? "No invoices yet. Create your first invoice!"
                    : "No invoices match the selected date range."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="invoices.table">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filtered.map((inv, i) => (
                        <motion.tr
                          key={inv.invoiceNumber.toString()}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                          data-ocid={`invoices.item.${i + 1}`}
                        >
                          <TableCell className="font-mono font-medium text-blue">
                            #{inv.invoiceNumber.toString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(
                              Number(inv.date) / 1_000_000,
                            ).toLocaleDateString("en-IN")}
                          </TableCell>
                          <TableCell>
                            {inv.customerName || (
                              <span className="text-muted-foreground italic text-sm">
                                Walk-in
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                inv.isIgst
                                  ? "bg-blue-light text-blue border-0"
                                  : "bg-teal-light text-teal border-0"
                              }
                            >
                              {inv.isIgst ? "IGST" : "CGST+SGST"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {inv.lineItems.length} item(s)
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {fmt(inv.grandTotal)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {/* View */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewInvoice(inv)}
                                className="h-8 w-8 p-0"
                                title="View"
                                data-ocid={`invoices.edit_button.${i + 1}`}
                              >
                                <Eye className="w-4 h-4 text-teal" />
                              </Button>
                              {/* Print */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  printTriggered.current = false;
                                  setPrintInvoice(inv);
                                }}
                                className="h-8 w-8 p-0"
                                title="Print"
                                data-ocid={`invoices.print_button.${i + 1}`}
                              >
                                <Printer className="w-4 h-4 text-green-600" />
                              </Button>
                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(inv)}
                                className="h-8 w-8 p-0"
                                title="Edit"
                                data-ocid={`invoices.save_button.${i + 1}`}
                              >
                                <Pencil className="w-4 h-4 text-indigo-500" />
                              </Button>
                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(inv)}
                                className="h-8 w-8 p-0"
                                title="Delete"
                                data-ocid={`invoices.delete_button.${i + 1}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
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

        {/* View Dialog */}
        <Dialog
          open={!!viewInvoice}
          onOpenChange={(o) => !o && setViewInvoice(null)}
        >
          <DialogContent className="max-w-sm" data-ocid="invoices.dialog">
            <DialogHeader>
              <DialogTitle>
                Invoice #{viewInvoice?.invoiceNumber.toString()}
              </DialogTitle>
            </DialogHeader>
            {viewInvoice && (
              <>
                <div className="flex justify-center">
                  <div className="border border-dashed border-border rounded-lg p-2 bg-white">
                    <ThermalReceipt
                      store={store || null}
                      {...invoiceToDisplay(viewInvoice)}
                      logoUrl={logoUrl}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setViewInvoice(null);
                    printTriggered.current = false;
                    setPrintInvoice(viewInvoice);
                  }}
                  className="w-full bg-blue hover:bg-blue-dark text-white mt-2"
                  data-ocid="invoices.primary_button"
                >
                  <Printer className="w-4 h-4 mr-2" /> Print Invoice
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
        >
          <AlertDialogContent data-ocid="invoices.modal">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete Invoice #{deleteTarget?.invoiceNumber.toString()}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete Invoice #
                {deleteTarget?.invoiceNumber.toString()}? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setDeleteTarget(null)}
                data-ocid="invoices.cancel_button"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-ocid="invoices.confirm_button"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Dialog */}
        <Dialog
          open={!!editState}
          onOpenChange={(o) => !o && setEditState(null)}
        >
          <DialogContent className="max-w-md w-full" data-ocid="invoices.sheet">
            <DialogHeader>
              <DialogTitle>
                Edit Invoice #{editState?.invoice.invoiceNumber.toString()}
              </DialogTitle>
            </DialogHeader>
            {editState && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Customer Name</Label>
                    <Input
                      value={editState.customerName}
                      onChange={(e) =>
                        setEditState((prev) =>
                          prev
                            ? { ...prev, customerName: e.target.value }
                            : prev,
                        )
                      }
                      placeholder="Walk-in"
                      className="h-8 text-sm"
                      data-ocid="invoices.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      Customer GSTIN
                    </Label>
                    <Input
                      value={editState.customerGstin}
                      onChange={(e) =>
                        setEditState((prev) =>
                          prev
                            ? { ...prev, customerGstin: e.target.value }
                            : prev,
                        )
                      }
                      placeholder="Optional"
                      className="h-8 text-sm"
                      data-ocid="invoices.textarea"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">GST Type</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={editState.isIgst ? "default" : "outline"}
                      onClick={() => toggleGstType(true)}
                      className={
                        editState.isIgst
                          ? "bg-blue hover:bg-blue-dark text-white"
                          : ""
                      }
                      data-ocid="invoices.toggle"
                    >
                      IGST (Inter-state)
                    </Button>
                    <Button
                      size="sm"
                      variant={!editState.isIgst ? "default" : "outline"}
                      onClick={() => toggleGstType(false)}
                      className={
                        !editState.isIgst
                          ? "bg-teal hover:bg-teal-dark text-white"
                          : ""
                      }
                    >
                      CGST+SGST (Intra-state)
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Line Items</Label>
                  <div className="rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs py-2">
                            Product
                          </TableHead>
                          <TableHead className="text-xs py-2 text-center">
                            Qty
                          </TableHead>
                          <TableHead className="text-xs py-2 text-right">
                            Rate
                          </TableHead>
                          <TableHead className="text-xs py-2 text-right">
                            GST%
                          </TableHead>
                          <TableHead className="text-xs py-2 text-right">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editState.lineItems.map((item, idx) => (
                          <TableRow key={item.productId} className="text-sm">
                            <TableCell className="py-2 text-xs">
                              {item.productName}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <Input
                                type="number"
                                min={1}
                                value={Number(item.qty)}
                                onChange={(e) =>
                                  updateQty(
                                    idx,
                                    Number.parseInt(e.target.value) || 1,
                                  )
                                }
                                className="h-7 w-16 text-center text-xs p-1"
                              />
                            </TableCell>
                            <TableCell className="py-2 text-right text-xs">
                              ₹{fmtNum(item.rate)}
                            </TableCell>
                            <TableCell className="py-2 text-right text-xs">
                              {Number(item.gstRate)}%
                            </TableCell>
                            <TableCell className="py-2 text-right text-xs font-medium">
                              ₹{fmtNum(item.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-base font-bold text-teal">
                    {fmt(grandTotal)}
                  </span>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setEditState(null)}
                className="sm:w-auto w-full"
                data-ocid="invoices.close_button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white sm:w-auto w-full"
                data-ocid="invoices.submit_button"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
