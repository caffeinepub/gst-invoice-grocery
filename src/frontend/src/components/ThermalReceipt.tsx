import { useEffect, useRef, useState } from "react";
import type { Invoice, StoreProfile } from "../backend.d";
import { generateQrDataUrl } from "../utils/qrCodeCdn";

// Paise → ₹XX.XX
const fmt = (paise: bigint) => `₹${(Number(paise) / 100).toFixed(2)}`;

export interface InvoiceLineItemDisplay {
  productName: string;
  barcode: string; // SKU / barcode
  hsnCode: string;
  qty: bigint;
  rate: bigint; // MRP in paise
  gstRate: bigint;
  lineTotal: bigint;
  cgstAmt: bigint;
  sgstAmt: bigint;
  igstAmt: bigint;
  costPrice?: bigint; // rate used for taxable calc, in paise (if different from MRP)
}

interface Props {
  store: StoreProfile | null;
  invoiceNumber: bigint | string;
  date: Date;
  customerName?: string;
  customerMobile?: string;
  customerGstin?: string;
  isIgst: boolean;
  lineItems: InvoiceLineItemDisplay[];
  subtotal: bigint; // total taxable amount
  totalCgst: bigint;
  totalSgst: bigint;
  totalIgst: bigint;
  grandTotal: bigint;
  paymentMode?: string;
}

export function invoiceToDisplay(inv: Invoice): Omit<Props, "store"> {
  const isIgst = inv.isIgst;
  const items: InvoiceLineItemDisplay[] = inv.lineItems.map((li) => {
    const rate = li.rate; // MRP in paise
    const taxableBase = li.qty * rate;
    const cgstAmt = isIgst ? 0n : (taxableBase * li.gstRate) / 200n;
    const sgstAmt = isIgst ? 0n : (taxableBase * li.gstRate) / 200n;
    const igstAmt = isIgst ? (taxableBase * li.gstRate) / 100n : 0n;
    const lineTotal = taxableBase + cgstAmt + sgstAmt + igstAmt;
    return {
      productName: li.productName,
      barcode: li.productId || "",
      hsnCode: li.hsnCode,
      qty: li.qty,
      rate,
      gstRate: li.gstRate,
      lineTotal,
      cgstAmt,
      sgstAmt,
      igstAmt,
      costPrice: undefined,
    };
  });

  const subtotal = items.reduce((s, li) => s + li.qty * li.rate, 0n);
  const totalCgst = items.reduce((s, li) => s + li.cgstAmt, 0n);
  const totalSgst = items.reduce((s, li) => s + li.sgstAmt, 0n);
  const totalIgst = items.reduce((s, li) => s + li.igstAmt, 0n);
  const grandTotal = subtotal + (isIgst ? totalIgst : totalCgst + totalSgst);

  return {
    invoiceNumber: inv.invoiceNumber,
    date: new Date(Number(inv.date) / 1_000_000),
    customerName: inv.customerName || undefined,
    customerMobile: undefined,
    customerGstin: inv.customerGstin || undefined,
    isIgst,
    lineItems: items,
    subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    grandTotal,
    paymentMode: undefined,
  };
}

// Group by HSN for the HSN-wise summary table
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
    const base =
      item.costPrice !== undefined && item.costPrice > 0n
        ? item.costPrice
        : item.rate;
    const taxable = item.qty * base;
    const existing = map.get(hsn) || {
      taxable: 0n,
      cgst: 0n,
      sgst: 0n,
      igst: 0n,
      gstRate: Number(item.gstRate),
    };
    map.set(hsn, {
      taxable: existing.taxable + taxable,
      cgst: existing.cgst + item.cgstAmt,
      sgst: existing.sgst + item.sgstAmt,
      igst: existing.igst + item.igstAmt,
      gstRate: Number(item.gstRate),
    });
  }
  return map;
}

// Group by GST rate for the GST calculation section
function groupByGstRate(items: InvoiceLineItemDisplay[]) {
  const map = new Map<number, { cgst: bigint; sgst: bigint; igst: bigint }>();
  for (const item of items) {
    const rate = Number(item.gstRate);
    const existing = map.get(rate) || { cgst: 0n, sgst: 0n, igst: 0n };
    map.set(rate, {
      cgst: existing.cgst + item.cgstAmt,
      sgst: existing.sgst + item.sgstAmt,
      igst: existing.igst + item.igstAmt,
    });
  }
  return map;
}

const MONO: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "10px",
  lineHeight: "1.5",
  color: "#000",
};

export default function ThermalReceipt({
  store,
  invoiceNumber,
  date,
  customerName,
  customerMobile,
  customerGstin,
  isIgst,
  lineItems,
  subtotal,
  totalCgst,
  totalSgst,
  totalIgst,
  grandTotal,
  paymentMode,
}: Props) {
  const hsnBreakdown = groupByHsn(lineItems);
  const gstBreakdown = groupByGstRate(lineItems);

  const totalItems = lineItems.length;
  const totalQty = lineItems.reduce((sum, li) => sum + Number(li.qty), 0);
  const totalGst = isIgst ? totalIgst : totalCgst + totalSgst;

  const paymentIcon =
    paymentMode === "Cash"
      ? "💵"
      : paymentMode === "Card"
        ? "💳"
        : paymentMode === "UPI"
          ? "📲"
          : "";

  // QR code generation
  const [qrDataUrl, setQrDataUrl] = useState("");
  const qrGenerated = useRef(false);

  useEffect(() => {
    if (lineItems.length === 0) return;
    qrGenerated.current = false;
    const qrData = JSON.stringify({
      inv: invoiceNumber.toString(),
      store: store?.name ?? "",
      gstin: store?.gstin ?? "",
      date: date.toISOString().slice(0, 10),
      total: (Number(grandTotal) / 100).toFixed(2),
      gst: (Number(totalGst) / 100).toFixed(2),
      customer: customerName ?? "",
      mobile: customerMobile ?? "",
      payMode: paymentMode ?? "",
      items: totalItems,
      qty: totalQty,
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
    totalGst,
    customerName,
    customerMobile,
    lineItems.length,
    paymentMode,
    totalItems,
    totalQty,
  ]);

  const divLine = (
    <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
  );
  const solidBorderLine = (
    <div style={{ borderTop: "2px solid #000", margin: "4px 0" }} />
  );

  return (
    <div
      id="thermal-receipt"
      style={{
        width: "302px",
        ...MONO,
        background: "#fff",
        padding: "8px 10px",
      }}
    >
      {/* 1. Store Name */}
      <div
        style={{
          textAlign: "center",
          borderTop: "3px solid #000",
          paddingTop: "6px",
          marginBottom: "4px",
        }}
      >
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
        {/* 2. Store Address */}
        {store?.address && (
          <div
            style={{ fontSize: "10px", marginTop: "2px", lineHeight: "1.4" }}
          >
            {store.address}
          </div>
        )}
        {store?.phone && (
          <div style={{ fontSize: "10px" }}>Ph: {store.phone}</div>
        )}
        {/* 3. GSTIN */}
        {store?.gstin && (
          <div style={{ fontSize: "10px", fontWeight: "600" }}>
            GSTIN: {store.gstin}
          </div>
        )}
        {/* 4. FSSAI */}
        {store?.fssai && (
          <div style={{ fontSize: "10px" }}>FSSAI: {store.fssai}</div>
        )}
      </div>

      {/* 5. Divider */}
      {divLine}

      {/* 6. TAX INVOICE banner */}
      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "12px",
          letterSpacing: "3px",
          padding: "2px 0",
          border: "1px solid #000",
          marginBottom: "4px",
        }}
      >
        TAX INVOICE
      </div>

      {/* 7. Invoice # and Date */}
      <div
        style={{ display: "flex", justifyContent: "space-between", ...MONO }}
      >
        <span>Invoice #: {invoiceNumber.toString()}</span>
        <span>{date.toLocaleDateString("en-IN")}</span>
      </div>

      {/* 8. Customer Name */}
      {customerName && <div style={{ ...MONO }}>Customer: {customerName}</div>}
      {/* 9. Customer Mobile */}
      {customerMobile && (
        <div style={{ ...MONO }}>Mobile: {customerMobile}</div>
      )}
      {/* Customer GSTIN if present */}
      {customerGstin && (
        <div style={{ ...MONO }}>Cust GSTIN: {customerGstin}</div>
      )}
      {/* 10. GST Type */}
      <div style={{ ...MONO }}>
        GST Type: {isIgst ? "IGST (Inter-State)" : "CGST+SGST (Intra-State)"}
      </div>

      {/* 11. Divider */}
      {divLine}

      {/* 12. LINE ITEMS TABLE header */}
      <div
        style={{
          ...MONO,
          fontWeight: "bold",
          fontSize: "9px",
          display: "flex",
          borderBottom: "1px solid #000",
          paddingBottom: "2px",
        }}
      >
        <span style={{ width: "14px" }}>Sr</span>
        <span style={{ flex: 3, minWidth: 0 }}>SKU Name</span>
        <span style={{ width: "50px" }}>Barcode</span>
        <span style={{ width: "36px", textAlign: "right" }}>MRP</span>
        <span style={{ width: "36px", textAlign: "right" }}>Rate</span>
        <span style={{ width: "20px", textAlign: "right" }}>Qty</span>
        <span style={{ width: "46px", textAlign: "right" }}>Taxable</span>
      </div>

      {lineItems.length === 0 ? (
        <div style={{ textAlign: "center", ...MONO, padding: "6px 0" }}>
          No items
        </div>
      ) : (
        lineItems.map((item) => {
          const costBase =
            item.costPrice !== undefined && item.costPrice > 0n
              ? item.costPrice
              : item.rate;
          const taxableAmt = item.qty * costBase;
          const mrpDisplay = (Number(item.rate) / 100).toFixed(0);
          const rateDisplay = (Number(costBase) / 100).toFixed(0);
          const taxableDisplay = (Number(taxableAmt) / 100).toFixed(2);
          const barcodeShort =
            item.barcode.length > 8
              ? `${item.barcode.slice(0, 8)}..`
              : item.barcode;
          const nameShort =
            item.productName.length > 10
              ? `${item.productName.slice(0, 10)}..`
              : item.productName;
          return (
            <div
              key={`${item.productName}-${item.barcode}-${item.hsnCode}`}
              style={{ marginBottom: "2px" }}
            >
              {/* Main row */}
              <div
                style={{
                  ...MONO,
                  fontSize: "9px",
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ width: "14px" }}>
                  {lineItems.indexOf(item) + 1}
                </span>
                <span
                  style={{ flex: 3, fontWeight: "600", minWidth: 0 }}
                  title={item.productName}
                >
                  {nameShort}
                </span>
                <span style={{ width: "50px", fontSize: "8px", color: "#555" }}>
                  {barcodeShort}
                </span>
                <span style={{ width: "36px", textAlign: "right" }}>
                  {mrpDisplay}
                </span>
                <span style={{ width: "36px", textAlign: "right" }}>
                  {rateDisplay}
                </span>
                <span style={{ width: "20px", textAlign: "right" }}>
                  {Number(item.qty)}
                </span>
                <span
                  style={{
                    width: "46px",
                    textAlign: "right",
                    fontWeight: "600",
                  }}
                >
                  {taxableDisplay}
                </span>
              </div>
              {/* HSN + GST% sub-row */}
              <div
                style={{
                  ...MONO,
                  fontSize: "8px",
                  color: "#666",
                  paddingLeft: "14px",
                }}
              >
                HSN: {item.hsnCode || "—"} | GST: {item.gstRate.toString()}%
              </div>
            </div>
          );
        })
      )}

      {/* 13. Divider */}
      {divLine}

      {/* 14. Total Taxable Amount */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...MONO,
        }}
      >
        <span>Total Taxable Amount</span>
        <span>{fmt(subtotal)}</span>
      </div>

      {/* 15. GST CALCULATION */}
      {Array.from(gstBreakdown.entries()).map(([rate, vals]) =>
        isIgst ? (
          <div
            key={`igst-${rate}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              ...MONO,
            }}
          >
            <span> IGST @{rate}%</span>
            <span>{fmt(vals.igst)}</span>
          </div>
        ) : (
          <div key={`cgst-sgst-${rate}`}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                ...MONO,
              }}
            >
              <span> CGST @{rate / 2}%</span>
              <span>{fmt(vals.cgst)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                ...MONO,
              }}
            >
              <span> SGST @{rate / 2}%</span>
              <span>{fmt(vals.sgst)}</span>
            </div>
          </div>
        ),
      )}

      {/* 16–17. Double solid line + GRAND TOTAL */}
      {solidBorderLine}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
          fontSize: "14px",
          fontFamily: "'Courier New', Courier, monospace",
          color: "#000",
        }}
      >
        <span>GRAND TOTAL</span>
        <span>{fmt(grandTotal)}</span>
      </div>
      {solidBorderLine}

      {/* 19. Total SKUs and Total Qty */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          ...MONO,
        }}
      >
        <span>Total SKUs: {totalItems}</span>
        <span>Total Qty: {totalQty}</span>
      </div>

      {/* 20. Payment Mode */}
      {paymentMode && (
        <div style={{ ...MONO, fontWeight: "bold", marginTop: "2px" }}>
          {paymentIcon} Payment Mode: {paymentMode.toUpperCase()} ✓
        </div>
      )}

      {/* 21. Divider */}
      {divLine}

      {/* 22. HSN-WISE GST SUMMARY */}
      {hsnBreakdown.size > 0 && (
        <>
          <div
            style={{
              textAlign: "center",
              ...MONO,
              fontWeight: "bold",
              fontSize: "9px",
              letterSpacing: "1px",
              marginBottom: "2px",
            }}
          >
            -- HSN-WISE GST SUMMARY --
          </div>
          {/* Table header */}
          <div
            style={{
              display: "flex",
              ...MONO,
              fontSize: "8px",
              fontWeight: "bold",
              borderBottom: "1px solid #000",
              paddingBottom: "1px",
              marginBottom: "2px",
            }}
          >
            <span style={{ flex: 2 }}>HSN</span>
            <span style={{ flex: 2, textAlign: "right" }}>Taxable</span>
            <span style={{ width: "30px", textAlign: "center" }}>GST%</span>
            {isIgst ? (
              <span style={{ flex: 2, textAlign: "right" }}>IGST</span>
            ) : (
              <>
                <span style={{ flex: 1, textAlign: "right" }}>CGST</span>
                <span style={{ flex: 1, textAlign: "right" }}>SGST</span>
              </>
            )}
          </div>
          {Array.from(hsnBreakdown.entries()).map(([hsn, vals]) => (
            <div
              key={`hsn-${hsn}`}
              style={{ display: "flex", ...MONO, fontSize: "9px" }}
            >
              <span style={{ flex: 2 }}>{hsn}</span>
              <span style={{ flex: 2, textAlign: "right" }}>
                {fmt(vals.taxable)}
              </span>
              <span style={{ width: "30px", textAlign: "center" }}>
                {vals.gstRate}%
              </span>
              {isIgst ? (
                <span style={{ flex: 2, textAlign: "right" }}>
                  {fmt(vals.igst)}
                </span>
              ) : (
                <>
                  <span style={{ flex: 1, textAlign: "right" }}>
                    {fmt(vals.cgst)}
                  </span>
                  <span style={{ flex: 1, textAlign: "right" }}>
                    {fmt(vals.sgst)}
                  </span>
                </>
              )}
            </div>
          ))}
          {divLine}
        </>
      )}

      {/* 24. Happy Shopping */}
      <div
        style={{
          textAlign: "center",
          ...MONO,
          fontWeight: "bold",
          fontSize: "11px",
          marginTop: "4px",
        }}
      >
        Happy Shopping!
      </div>
      {/* 25. Store Name */}
      {store?.name && (
        <div style={{ textAlign: "center", ...MONO, fontWeight: "600" }}>
          {store.name}
        </div>
      )}
      {/* 26. Branding */}
      <div
        style={{
          textAlign: "center",
          ...MONO,
          fontSize: "8px",
          color: "#888",
          marginTop: "2px",
        }}
      >
        Developed by Ankit Verma 7023295769
      </div>

      {/* 27. Divider */}
      {divLine}

      {/* 28. QR CODE at the very bottom */}
      {qrDataUrl ? (
        <div style={{ textAlign: "center", paddingTop: "4px" }}>
          <img
            src={qrDataUrl}
            alt="Bill QR"
            style={{
              width: "80px",
              height: "80px",
              display: "block",
              margin: "0 auto 2px",
            }}
          />
          <div style={{ ...MONO, fontSize: "8px", color: "#888" }}>
            Scan for bill details
          </div>
        </div>
      ) : (
        lineItems.length > 0 && (
          <div
            style={{
              textAlign: "center",
              ...MONO,
              fontSize: "8px",
              color: "#ccc",
            }}
          >
            [QR loading...]
          </div>
        )
      )}
    </div>
  );
}
