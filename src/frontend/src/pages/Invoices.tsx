import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Eye, Loader2, Printer, Receipt } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Invoice } from "../backend.d";
import ThermalReceipt, { invoiceToDisplay } from "../components/ThermalReceipt";
import { useGetInvoices, useGetStore } from "../hooks/useQueries";

const fmt = (paise: bigint) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(paise) / 100,
  );

const fmtNum = (paise: bigint) => (Number(paise) / 100).toFixed(2);

/** Simple CSV export (no external lib needed) */
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

export default function Invoices() {
  const { data: invoices = [], isLoading } = useGetInvoices();
  const { data: store } = useGetStore();
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

    // Also export line items
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

  return (
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

          {/* Date Filter */}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewInvoice(inv)}
                              data-ocid={`invoices.edit_button.${i + 1}`}
                            >
                              <Eye className="w-4 h-4 text-teal" />
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

      {/* Invoice View Dialog */}
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
                  />
                </div>
              </div>
              <Button
                onClick={() => window.print()}
                className="w-full bg-blue hover:bg-blue-dark text-white mt-2"
                data-ocid="invoices.primary_button"
              >
                <Printer className="w-4 h-4 mr-2" /> Reprint Invoice
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
