import { useEffect, useRef, useState } from "react";
import type { Invoice, StoreProfile } from "../backend.d";
import { generateQrDataUrl } from "../utils/qrCodeCdn";

const fmt = (paise: bigint) => `₹${(Number(paise) / 100).toFixed(2)}`;

interface Props {
  store: StoreProfile | null;
  invoiceNumber: bigint | string;
  date: Date;
  customerName?: string;
  customerGstin?: string;
  isIgst: boolean;
  lineItems: InvoiceLineItemDisplay[];
  subtotal: bigint;
  totalCgst: bigint;
  totalSgst: bigint;
  totalIgst: bigint;
  grandTotal: bigint;
  logoUrl?: string;
  paymentMode?: string;
}

export interface InvoiceLineItemDisplay {
  productName: string;
  hsnCode: string;
  qty: bigint;
  rate: bigint;
  gstRate: bigint;
  lineTotal: bigint;
  cgstAmt: bigint;
  sgstAmt: bigint;
  igstAmt: bigint;
  costPrice?: bigint; // purchase cost per unit in paise (optional)
}

export function invoiceToDisplay(inv: Invoice): Omit<Props, "store"> {
  return {
    invoiceNumber: inv.invoiceNumber,
    date: new Date(Number(inv.date) / 1_000_000),
    customerName: inv.customerName || undefined,
    customerGstin: inv.customerGstin || undefined,
    isIgst: inv.isIgst,
    lineItems: inv.lineItems.map((li) => ({
      productName: li.productName,
      hsnCode: li.hsnCode,
      qty: li.qty,
      rate: li.rate,
      gstRate: li.gstRate,
      lineTotal: li.lineTotal,
      cgstAmt: li.cgstAmt,
      sgstAmt: li.sgstAmt,
      igstAmt: li.igstAmt,
    })),
    subtotal: inv.subtotal,
    totalCgst: inv.totalCgst,
    totalSgst: inv.totalSgst,
    totalIgst: inv.totalIgst,
    grandTotal: inv.grandTotal,
  };
}

function groupByGstRate(items: InvoiceLineItemDisplay[]) {
  const map = new Map<
    number,
    { taxable: bigint; cgst: bigint; sgst: bigint; igst: bigint }
  >();
  for (const item of items) {
    const rate = Number(item.gstRate);
    const taxable = item.qty * item.rate;
    const existing = map.get(rate) || {
      taxable: 0n,
      cgst: 0n,
      sgst: 0n,
      igst: 0n,
    };
    map.set(rate, {
      taxable: existing.taxable + taxable,
      cgst: existing.cgst + item.cgstAmt,
      sgst: existing.sgst + item.sgstAmt,
      igst: existing.igst + item.igstAmt,
    });
  }
  return map;
}

function groupByHsn(items: InvoiceLineItemDisplay[]) {
  const map = new Map<
    string,
    {
      taxable: bigint;
      cgst: bigint;
      sgst: bigint;
      igst: bigint;
      gstRate: number;
    }
  >();
  for (const item of items) {
    const hsn = item.hsnCode || "—";
    const rate = Number(item.gstRate);
    const taxable = item.qty * item.rate;
    const existing = map.get(hsn) || {
      taxable: 0n,
      cgst: 0n,
      sgst: 0n,
      igst: 0n,
      gstRate: rate,
    };
    map.set(hsn, {
      taxable: existing.taxable + taxable,
      cgst: existing.cgst + item.cgstAmt,
      sgst: existing.sgst + item.sgstAmt,
      igst: existing.igst + item.igstAmt,
      gstRate: rate,
    });
  }
  return map;
}

export default function ThermalReceipt({
  store,
  invoiceNumber,
  date,
  customerName,
  customerGstin,
  isIgst,
  lineItems,
  subtotal,
  totalCgst,
  totalSgst,
  totalIgst,
  grandTotal,
  logoUrl,
  paymentMode,
}: Props) {
  const gstBreakdown = groupByGstRate(lineItems);
  const hsnBreakdown = groupByHsn(lineItems);
  const dashedLine = "- - - - - - - - - - - - - - - - - - - -";
  const solidLine = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  const paymentIcon =
    paymentMode === "Cash"
      ? "💵"
      : paymentMode === "Card"
        ? "💳"
        : paymentMode === "UPI"
          ? "📲"
          : "";

  // Task 7: Total items and total qty
  const totalItems = lineItems.length;
  const totalQty = lineItems.reduce((sum, li) => sum + Number(li.qty), 0);

  // Task 8: QR code
  const [qrDataUrl, setQrDataUrl] = useState("");
  const qrGenerated = useRef(false);

  useEffect(() => {
    if (lineItems.length === 0) return;
    qrGenerated.current = false;
    const qrData = JSON.stringify({
      inv: invoiceNumber.toString(),
      store: store?.name ?? "",
      date: date.toISOString().slice(0, 10),
      total: Number(grandTotal) / 100,
      gst: Number(isIgst ? totalIgst : totalCgst + totalSgst) / 100,
      customer: customerName ?? "",
    });
    generateQrDataUrl(qrData, 80)
      .then((url) => {
        setQrDataUrl(url);
        qrGenerated.current = true;
      })
      .catch(() => setQrDataUrl(""));
  }, [
    invoiceNumber,
    store,
    date,
    grandTotal,
    totalIgst,
    totalCgst,
    totalSgst,
    customerName,
    isIgst,
    lineItems.length,
  ]);

  return (
    <div
      id="thermal-receipt"
      style={{
        width: "302px",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "11px",
        lineHeight: "1.5",
        color: "#000",
        background: "#fff",
        padding: "8px 10px",
      }}
    >
      {/* Store Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "6px",
          paddingTop: "6px",
          borderTop: "3px solid #000",
        }}
      >
        {/* Store Logo */}
        {logoUrl && (
          <div style={{ marginBottom: "6px" }}>
            <img
              src={logoUrl}
              alt="Store Logo"
              style={{
                maxHeight: "60px",
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
        )}
        <div
          style={{
            fontWeight: "bold",
            fontSize: "15px",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          {store?.name || "STORE NAME"}
        </div>
        {store?.address && (
          <div
            style={{ fontSize: "10px", marginTop: "3px", lineHeight: "1.4" }}
          >
            {store.address}
          </div>
        )}
        {store?.phone && (
          <div style={{ fontSize: "10px", marginTop: "1px" }}>
            Ph: {store.phone}
          </div>
        )}
        {store?.gstin && (
          <div
            style={{ fontSize: "10px", marginTop: "1px", fontWeight: "600" }}
          >
            GSTIN: {store.gstin}
          </div>
        )}
        {store?.fssai && (
          <div style={{ fontSize: "10px", marginTop: "1px" }}>
            FSSAI: {store.fssai}
          </div>
        )}
        {/* Decorative line below header */}
        <div
          style={{ fontSize: "9px", marginTop: "5px", letterSpacing: "1px" }}
        >
          {dashedLine}
        </div>
      </div>

      {/* TAX INVOICE label */}
      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "12px",
          letterSpacing: "3px",
          padding: "3px 0",
          borderTop: "1px solid #000",
          borderBottom: "1px solid #000",
          marginBottom: "5px",
        }}
      >
        TAX INVOICE
      </div>

      {/* Invoice Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          marginBottom: "2px",
        }}
      >
        <span>Invoice #: {invoiceNumber.toString()}</span>
        <span>{date.toLocaleDateString("en-IN")}</span>
      </div>
      {customerName && (
        <div style={{ fontSize: "10px" }}>Customer: {customerName}</div>
      )}
      {customerGstin && (
        <div style={{ fontSize: "10px" }}>GSTIN: {customerGstin}</div>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      {/* Column Headers */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          fontSize: "10px",
          paddingBottom: "2px",
        }}
      >
        <span style={{ flex: 3 }}>Item</span>
        <span style={{ flex: 1, textAlign: "right" }}>Qty</span>
        <span style={{ flex: 1, textAlign: "right" }}>Rate</span>
        <span style={{ flex: 1, textAlign: "right" }}>Amt</span>
      </div>

      <div style={{ borderTop: "1px solid #000", margin: "2px 0" }} />

      {/* Line Items */}
      {lineItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#666",
            padding: "8px 0",
            fontSize: "10px",
          }}
        >
          No items added
        </div>
      ) : (
        lineItems.map((item) => (
          <div
            key={`${item.productName}-${item.hsnCode}`}
            style={{ marginBottom: "3px" }}
          >
            <div style={{ fontSize: "10px", fontWeight: "600" }}>
              {item.productName}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
              }}
            >
              <span style={{ flex: 3, color: "#555" }}>
                HSN:{item.hsnCode} GST:{item.gstRate.toString()}%
              </span>
              <span style={{ flex: 1, textAlign: "right" }}>
                {item.qty.toString()}
              </span>
              <span style={{ flex: 1, textAlign: "right" }}>
                {fmt(item.rate)}
              </span>
              <span style={{ flex: 1, textAlign: "right" }}>
                {fmt(item.qty * item.rate)}
              </span>
            </div>
            {item.costPrice !== undefined && item.costPrice > 0n && (
              <div
                style={{ fontSize: "9px", color: "#666", paddingLeft: "4px" }}
              >
                Cost: {fmt(item.costPrice)} | Margin:{" "}
                {fmt(item.rate - item.costPrice)}
              </div>
            )}
          </div>
        ))
      )}

      {/* Task 7: Total items and total qty */}
      {lineItems.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9px",
            color: "#555",
            marginTop: "3px",
          }}
        >
          <span>Total Items: {totalItems}</span>
          <span>Total Qty: {totalQty}</span>
        </div>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      {/* Subtotal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
        }}
      >
        <span>Subtotal (Taxable)</span>
        <span>{fmt(subtotal)}</span>
      </div>

      {/* Task 6: HSN-wise GST breakdown */}
      {hsnBreakdown.size > 0 && (
        <>
          <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
          <div
            style={{
              textAlign: "center",
              fontSize: "9px",
              fontWeight: "bold",
              letterSpacing: "1px",
              marginBottom: "3px",
            }}
          >
            -- HSN-wise GST --
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "8px",
              fontWeight: "bold",
              color: "#555",
              borderBottom: "1px solid #000",
              paddingBottom: "1px",
              marginBottom: "2px",
            }}
          >
            <span style={{ flex: 2 }}>HSN</span>
            <span style={{ flex: 2, textAlign: "right" }}>Taxable</span>
            <span style={{ flex: 1, textAlign: "center" }}>GST%</span>
            <span style={{ flex: 2, textAlign: "right" }}>Tax Amt</span>
          </div>
          {Array.from(hsnBreakdown.entries()).map(([hsn, vals]) => {
            const taxAmt = isIgst ? vals.igst : vals.cgst + vals.sgst;
            return (
              <div
                key={`hsn-${hsn}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                }}
              >
                <span style={{ flex: 2 }}>{hsn}</span>
                <span style={{ flex: 2, textAlign: "right" }}>
                  {fmt(vals.taxable)}
                </span>
                <span style={{ flex: 1, textAlign: "center" }}>
                  {vals.gstRate}%
                </span>
                <span style={{ flex: 2, textAlign: "right" }}>
                  {fmt(taxAmt)}
                </span>
              </div>
            );
          })}
        </>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      {/* GST Rate Breakdown */}
      {Array.from(gstBreakdown.entries()).map(([rate, vals]) => (
        <div key={rate}>
          {isIgst ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
              }}
            >
              <span>IGST @{rate}%</span>
              <span>{fmt(vals.igst)}</span>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                }}
              >
                <span>CGST @{rate / 2}%</span>
                <span>{fmt(vals.cgst)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                }}
              >
                <span>SGST @{rate / 2}%</span>
                <span>{fmt(vals.sgst)}</span>
              </div>
            </>
          )}
        </div>
      ))}

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      {/* Total GST */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
        }}
      >
        <span>Total GST</span>
        <span>{fmt(isIgst ? totalIgst : totalCgst + totalSgst)}</span>
      </div>

      {lineItems.some(
        (li) => li.costPrice !== undefined && li.costPrice > 0n,
      ) && (
        <>
          <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
          <div
            style={{
              fontSize: "9px",
              color: "#555",
              marginBottom: "2px",
              fontWeight: "bold",
              letterSpacing: "1px",
              textAlign: "center",
            }}
          >
            -- Cost Summary --
          </div>
          {lineItems
            .filter((li) => li.costPrice !== undefined && li.costPrice > 0n)
            .map((li) => (
              <div
                key={`cost-${li.productName}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                }}
              >
                <span style={{ flex: 3 }}>{li.productName}</span>
                <span style={{ flex: 2, textAlign: "right" }}>
                  Cost: {fmt(li.costPrice! * li.qty)}
                </span>
              </div>
            ))}
          {(() => {
            const totalCostVal = lineItems.reduce(
              (sum, li) =>
                li.costPrice !== undefined ? sum + li.costPrice * li.qty : sum,
              0n,
            );
            return (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  fontWeight: "600",
                  marginTop: "2px",
                }}
              >
                <span>Total Cost</span>
                <span>{fmt(totalCostVal)}</span>
              </div>
            );
          })()}
        </>
      )}

      <div style={{ borderTop: "2px solid #000", margin: "5px 0" }} />

      {/* Grand Total */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
        <span>GRAND TOTAL</span>
        <span>{fmt(grandTotal)}</span>
      </div>

      <div style={{ borderTop: "2px solid #000", margin: "5px 0" }} />

      {/* Payment Mode */}
      {paymentMode && (
        <div
          style={{
            textAlign: "center",
            margin: "5px 0",
          }}
        >
          <div style={{ fontSize: "9px", letterSpacing: "1px", color: "#555" }}>
            {solidLine}
          </div>
          <div
            style={{
              fontWeight: "bold",
              fontSize: "12px",
              padding: "4px 0",
              letterSpacing: "1px",
            }}
          >
            {paymentIcon} Payment Mode: {paymentMode.toUpperCase()} ✓
          </div>
          <div style={{ fontSize: "9px", letterSpacing: "1px", color: "#555" }}>
            {solidLine}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          fontSize: "10px",
          marginTop: "8px",
          paddingTop: "6px",
          borderTop: "1px dashed #000",
        }}
      >
        <div style={{ fontWeight: "600" }}>Thanks for shopping with us!</div>
        {store?.name && (
          <div style={{ fontSize: "10px", marginTop: "2px" }}>
            — {store.name}
          </div>
        )}
        <div style={{ fontSize: "9px", color: "#888", marginTop: "4px" }}>
          ** Thank You, Visit Again **
        </div>
      </div>

      {/* Task 8: QR Code at bottom */}
      {qrDataUrl && (
        <div
          style={{
            textAlign: "center",
            marginTop: "8px",
            paddingTop: "6px",
            borderTop: "1px dashed #000",
          }}
        >
          <img
            src={qrDataUrl}
            alt="Bill QR"
            style={{
              width: "60px",
              height: "60px",
              display: "block",
              margin: "0 auto 2px",
            }}
          />
          <div style={{ fontSize: "8px", color: "#888" }}>
            Scan for bill details
          </div>
        </div>
      )}
    </div>
  );
}
