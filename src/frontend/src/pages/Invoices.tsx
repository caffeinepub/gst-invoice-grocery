import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, Eye, Loader2, Printer, Receipt } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Invoice } from "../backend.d";
import ThermalReceipt, { invoiceToDisplay } from "../components/ThermalReceipt";
import { useGetInvoices, useGetStore } from "../hooks/useQueries";

const fmt = (paise: bigint) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(paise) / 100,
  );

export default function Invoices() {
  const { data: invoices = [], isLoading } = useGetInvoices();
  const { data: store } = useGetStore();
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const sorted = [...invoices].sort(
    (a, b) => Number(b.invoiceNumber) - Number(a.invoiceNumber),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      data-ocid="invoices.section"
    >
      <Card className="shadow-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Saved Invoices
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </Badge>
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
          ) : sorted.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 text-center"
              data-ocid="invoices.empty_state"
            >
              <Receipt className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No invoices yet. Create your first invoice!
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
                    {sorted.map((inv, i) => (
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
