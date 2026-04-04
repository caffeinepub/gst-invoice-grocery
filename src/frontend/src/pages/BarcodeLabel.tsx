import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Barcode,
  CheckCircle2,
  Download,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Ruler,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGetProducts, useGetStore } from "../hooks/useQueries";

// Barcode libraries loaded from npm packages (bundled, no CDN dependency)
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

const BARCODE_TYPES = [
  { value: "CODE128", label: "Code128 (Recommended)" },
  { value: "CODE39", label: "Code39" },
  { value: "EAN13", label: "EAN-13" },
  { value: "EAN8", label: "EAN-8" },
  { value: "UPC", label: "UPC-A" },
  { value: "QR", label: "QR Code" },
];

const LABEL_SIZES = [
  { label: "38 × 25 mm (Standard)", width: 38, height: 25 },
  { label: "50 × 25 mm (Wide)", width: 50, height: 25 },
  { label: "40 × 30 mm (Medium)", width: 40, height: 30 },
  { label: "57 × 32 mm (Large)", width: 57, height: 32 },
  { label: "100 × 50 mm (Extra Large)", width: 100, height: 50 },
  { label: "Custom", width: 0, height: 0 },
];

const STORAGE_KEY = "barcode_labels";

interface SavedLabel {
  id: string;
  productName: string;
  sku: string;
  mrp: string;
  qty: number;
  barcodeType: string;
  showStoreName: boolean;
  storeName: string;
  savedAt: string;
  labelWidth: number;
  labelHeight: number;
}

function loadSavedLabels(): SavedLabel[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveLabelToStorage(label: SavedLabel) {
  const existing = loadSavedLabels();
  const updated = [label, ...existing.filter((l) => l.id !== label.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function deleteLabelFromStorage(id: string) {
  const updated = loadSavedLabels().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export default function BarcodeLabel() {
  const { data: products = [] } = useGetProducts();
  const { data: store } = useGetStore();

  const [barcodeType, setBarcodeType] = useState("CODE128");
  const [productName, setProductName] = useState("");
  const [skuValue, setSkuValue] = useState("");
  const [mrp, setMrp] = useState("");
  const [qty, setQty] = useState(1);
  const [showStoreName, setShowStoreName] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [savedLabels, setSavedLabels] = useState<SavedLabel[]>(loadSavedLabels);
  const [barcodeError, setBarcodeError] = useState("");
  // libsLoaded is always true since libraries are bundled via npm
  const libsLoaded = true;

  // Label size state
  const [selectedSizeLabel, setSelectedSizeLabel] = useState(
    "38 × 25 mm (Standard)",
  );
  const [labelWidth, setLabelWidth] = useState(38);
  const [labelHeight, setLabelHeight] = useState(25);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  const svgRef = useRef<SVGSVGElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const storeName = store?.name ?? "";
  const isCustomSize = selectedSizeLabel === "Custom";

  // Libraries are bundled via npm — no dynamic loading needed

  const handleSizeSelect = (sizeLabel: string) => {
    setSelectedSizeLabel(sizeLabel);
    const preset = LABEL_SIZES.find((s) => s.label === sizeLabel);
    if (preset && preset.width > 0) {
      setLabelWidth(preset.width);
      setLabelHeight(preset.height);
      setCustomWidth("");
      setCustomHeight("");
    }
  };

  const handleCustomWidth = (val: string) => {
    setCustomWidth(val);
    const n = Number.parseFloat(val);
    if (!Number.isNaN(n) && n > 0) setLabelWidth(n);
  };

  const handleCustomHeight = (val: string) => {
    setCustomHeight(val);
    const n = Number.parseFloat(val);
    if (!Number.isNaN(n) && n > 0) setLabelHeight(n);
  };

  // Auto-fill from selected product
  const handleProductSelect = (sku: string) => {
    setSelectedProduct(sku);
    if (!sku) return;
    const p = products.find((prod) => prod.sku === sku);
    if (!p) return;
    setProductName(p.name);
    setSkuValue(p.sku);
    setMrp(String(Number(p.price)));
  };

  // Render barcode preview
  useEffect(() => {
    if (!libsLoaded) return;
    setBarcodeError("");
    if (!skuValue) return;

    if (barcodeType === "QR") {
      if (qrCanvasRef.current) {
        QRCode.toCanvas(qrCanvasRef.current, skuValue, {
          width: 100,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        }).catch(() => setBarcodeError("QR generation failed"));
      }
    } else {
      if (svgRef.current) {
        try {
          JsBarcode(svgRef.current, skuValue, {
            format: barcodeType,
            width: 1.8,
            height: 50,
            displayValue: true,
            fontSize: 10,
            margin: 4,
            background: "#ffffff",
            lineColor: "#000000",
          });
          setBarcodeError("");
        } catch {
          setBarcodeError(
            `Invalid value "${skuValue}" for ${barcodeType} format. Try Code128 or QR Code.`,
          );
        }
      }
    }
  }, [skuValue, barcodeType]);

  const handleSaveLabel = () => {
    if (!productName || !skuValue) {
      toast.error("Enter product name and barcode value first.");
      return;
    }
    const label: SavedLabel = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productName,
      sku: skuValue,
      mrp,
      qty,
      barcodeType,
      showStoreName,
      storeName,
      savedAt: new Date().toISOString(),
      labelWidth,
      labelHeight,
    };
    saveLabelToStorage(label);
    setSavedLabels(loadSavedLabels());
    toast.success("Label saved! You can reprint it anytime.");
  };

  const handleDeleteSaved = (id: string) => {
    deleteLabelFromStorage(id);
    setSavedLabels(loadSavedLabels());
    toast.success("Label removed.");
  };

  const handleReprint = (label: SavedLabel) => {
    setBarcodeType(label.barcodeType);
    setProductName(label.productName);
    setSkuValue(label.sku);
    setMrp(label.mrp);
    setQty(label.qty);
    setShowStoreName(label.showStoreName);
    setSelectedProduct("");

    // Restore label size
    const savedW = label.labelWidth ?? 38;
    const savedH = label.labelHeight ?? 25;
    setLabelWidth(savedW);
    setLabelHeight(savedH);
    const matchingPreset = LABEL_SIZES.find(
      (s) => s.width === savedW && s.height === savedH,
    );
    if (matchingPreset) {
      setSelectedSizeLabel(matchingPreset.label);
      setCustomWidth("");
      setCustomHeight("");
    } else {
      setSelectedSizeLabel("Custom");
      setCustomWidth(String(savedW));
      setCustomHeight(String(savedH));
    }

    toast.success("Label loaded — adjust qty/MRP if needed, then print.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => {
    if (!skuValue) {
      toast.error("Enter a barcode value first.");
      return;
    }
    if (barcodeError) {
      toast.error("Fix the barcode error before printing.");
      return;
    }

    const labelCount = Math.max(1, Math.min(qty, 200));
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    // Determine barcode height based on label height
    let barcodeHeightPx = 40;
    if (labelHeight > 35) {
      barcodeHeightPx = 70;
    } else if (labelHeight > 25) {
      barcodeHeightPx = 55;
    }

    // Re-generate barcode SVG at correct height for printing
    let barcodeHtml = "";
    if (barcodeType === "QR" && qrCanvasRef.current) {
      const dataUrl = qrCanvasRef.current.toDataURL("image/png");
      const qrSize = Math.min(labelWidth * 2, 80);
      barcodeHtml = `<img src="${dataUrl}" style="width:${qrSize}px;height:${qrSize}px;display:block;margin:0 auto 2px;" alt="QR" />`;
    } else if (svgRef.current) {
      // Clone SVG and regenerate at proper height
      const tempSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      try {
        JsBarcode(tempSvg, skuValue, {
          format: barcodeType,
          width: 1.5,
          height: barcodeHeightPx,
          displayValue: true,
          fontSize: 9,
          margin: 2,
          background: "#ffffff",
          lineColor: "#000000",
        });
        tempSvg.style.maxWidth = "100%";
        barcodeHtml = `<div style="display:flex;justify-content:center;">${tempSvg.outerHTML}</div>`;
      } catch {
        const svgHtml = svgRef.current.outerHTML;
        barcodeHtml = `<div style="display:flex;justify-content:center;">${svgHtml}</div>`;
      }
    }

    const storeNameHtml =
      showStoreName && storeName
        ? `<div style="font-size:8px;font-weight:600;text-align:center;margin-bottom:2px;color:#1f2937;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${storeName}</div>`
        : "";

    const labelHtml = `
      <div class="label">
        ${storeNameHtml}
        ${barcodeHtml}
        <div style="font-size:9px;font-weight:700;text-align:center;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${productName}</div>
        <div style="display:flex;justify-content:space-between;font-size:8px;margin-top:1px;">
          <span style="color:#374151;">${mrp ? `MRP: \u20B9${mrp}` : ""}</span>
          <span style="color:#9ca3af;font-size:7px;">${barcodeType}</span>
        </div>
      </div>`;

    const allLabels = Array(labelCount).fill(labelHtml).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Labels \u2014 ${productName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: #fff; padding: 4mm; }
          .grid { display: flex; flex-wrap: wrap; gap: 2mm; }
          .label {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            border: 0.5px solid #d1d5db;
            border-radius: 2px;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            background: #fff;
            page-break-inside: avoid;
          }
          .label svg { max-width: 100%; height: auto; }
          @media print {
            body { padding: 2mm; }
            @page { margin: 4mm; }
          }
        </style>
      </head>
      <body>
        <div class="grid">${allLabels}</div>
        <script>window.onload = function(){ window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Compute scaled preview dimensions
  const previewWidth = Math.min(labelWidth * 3, 240);
  const previewMinHeight = Math.min(labelHeight * 3, 180);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-5"
      data-ocid="barcode.section"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron to-indigo flex items-center justify-center shadow-warm">
          <Barcode className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">
            Barcode Label Generator
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate &amp; print labels for grocery products
          </p>
        </div>
      </div>

      {/* Generator Card */}
      <Card className="shadow-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Barcode className="w-4 h-4 text-saffron" />
            Label Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {/* Barcode Type */}
          <div className="space-y-1.5">
            <Label>Barcode Type</Label>
            <Select
              value={barcodeType}
              onValueChange={(v) => {
                setBarcodeType(v);
                setBarcodeError("");
              }}
            >
              <SelectTrigger data-ocid="barcode.select">
                <SelectValue placeholder="Select barcode type" />
              </SelectTrigger>
              <SelectContent>
                {BARCODE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label Size */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-saffron" />
              Label Size
            </Label>
            <Select value={selectedSizeLabel} onValueChange={handleSizeSelect}>
              <SelectTrigger data-ocid="barcode.select">
                <SelectValue placeholder="Select label size" />
              </SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map((s) => (
                  <SelectItem key={s.label} value={s.label}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom size inputs */}
            {isCustomSize && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 pt-1"
              >
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="custom-w"
                    className="text-xs text-muted-foreground"
                  >
                    Width (mm)
                  </Label>
                  <Input
                    id="custom-w"
                    type="number"
                    min={10}
                    max={200}
                    value={customWidth}
                    onChange={(e) => handleCustomWidth(e.target.value)}
                    placeholder="e.g. 60"
                    className="h-8 text-sm"
                    data-ocid="barcode.input"
                  />
                </div>
                <div className="flex items-end pb-1 text-muted-foreground font-bold text-lg">
                  ×
                </div>
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="custom-h"
                    className="text-xs text-muted-foreground"
                  >
                    Height (mm)
                  </Label>
                  <Input
                    id="custom-h"
                    type="number"
                    min={10}
                    max={200}
                    value={customHeight}
                    onChange={(e) => handleCustomHeight(e.target.value)}
                    placeholder="e.g. 40"
                    className="h-8 text-sm"
                    data-ocid="barcode.input"
                  />
                </div>
                {labelWidth > 0 && labelHeight > 0 && (
                  <div className="flex items-end pb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-saffron/10 text-saffron border-saffron/30 whitespace-nowrap"
                    >
                      {labelWidth}×{labelHeight}mm
                    </Badge>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Product Auto-fill */}
          {products.length > 0 && (
            <div className="space-y-1.5">
              <Label>Auto-fill from Product Catalog</Label>
              <Select
                value={selectedProduct}
                onValueChange={handleProductSelect}
              >
                <SelectTrigger data-ocid="barcode.select">
                  <SelectValue placeholder="Select product to auto-fill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Manual entry —</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.sku} value={p.sku}>
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>
                          {p.name}{" "}
                          <span className="text-muted-foreground text-xs">
                            ({p.sku})
                          </span>
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Manual Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lbl-name">Product Name</Label>
              <Input
                id="lbl-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Tata Salt 1kg"
                data-ocid="barcode.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lbl-sku">Barcode / SKU Value</Label>
              <Input
                id="lbl-sku"
                value={skuValue}
                onChange={(e) => {
                  setSkuValue(e.target.value);
                  setBarcodeError("");
                }}
                placeholder="e.g. 8901058007929"
                data-ocid="barcode.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lbl-mrp">MRP (₹)</Label>
              <Input
                id="lbl-mrp"
                type="number"
                min={0}
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="e.g. 30"
                data-ocid="barcode.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lbl-qty">Number of Labels to Print</Label>
              <Input
                id="lbl-qty"
                type="number"
                min={1}
                max={200}
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, Math.min(200, Number(e.target.value))))
                }
                placeholder="e.g. 10"
                data-ocid="barcode.input"
              />
            </div>
          </div>

          {/* Store name toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-store"
              checked={showStoreName}
              onCheckedChange={(v) => setShowStoreName(!!v)}
              data-ocid="barcode.checkbox"
            />
            <Label htmlFor="show-store" className="cursor-pointer font-normal">
              Show store name on label
              {storeName && (
                <span className="ml-1 text-muted-foreground text-xs">
                  ({storeName})
                </span>
              )}
            </Label>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Label Preview</Label>
            {!libsLoaded && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading barcode library...
              </div>
            )}
            <div className="flex justify-center">
              <div
                className="inline-flex flex-col items-center p-3 rounded-lg border-2 border-dashed border-saffron/40 bg-white gap-1 transition-all duration-300"
                style={{
                  width: `${previewWidth}px`,
                  minHeight: `${previewMinHeight}px`,
                }}
                data-ocid="barcode.card"
              >
                {showStoreName && storeName && (
                  <p className="text-[10px] font-semibold text-gray-800 max-w-full truncate">
                    {storeName}
                  </p>
                )}

                {skuValue ? (
                  barcodeType === "QR" ? (
                    <canvas
                      ref={qrCanvasRef}
                      width={100}
                      height={100}
                      className="block"
                    />
                  ) : (
                    <svg ref={svgRef} className="max-w-full" />
                  )
                ) : (
                  <div className="w-full h-14 flex items-center justify-center bg-gray-50 rounded text-xs text-muted-foreground">
                    Enter barcode value
                  </div>
                )}

                {productName && (
                  <p className="text-[10px] font-bold text-gray-900 max-w-full truncate">
                    {productName}
                  </p>
                )}
                <div className="flex items-center justify-between w-full">
                  {mrp && (
                    <span className="text-[10px] font-semibold text-gray-700">
                      MRP: ₹{mrp}
                    </span>
                  )}
                  <span className="text-[9px] text-gray-400 ml-auto">
                    {barcodeType}
                  </span>
                </div>
                {/* Size indicator */}
                <div className="mt-0.5 flex items-center gap-1">
                  <Ruler className="w-2.5 h-2.5 text-saffron/60" />
                  <span className="text-[9px] text-saffron/70 font-medium">
                    {labelWidth}×{labelHeight}mm
                  </span>
                </div>
              </div>
            </div>

            {barcodeError && (
              <div
                className="flex items-start gap-2 text-sm text-destructive p-2 rounded bg-destructive/5 border border-destructive/20"
                data-ocid="barcode.error_state"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="text-xs">{barcodeError}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={handlePrint}
              disabled={!skuValue || !!barcodeError || !libsLoaded}
              className="bg-saffron hover:bg-saffron-dark text-white flex-1 min-w-[120px]"
              data-ocid="barcode.primary_button"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print {qty > 1 ? `${qty} Labels` : "Label"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveLabel}
              disabled={!productName || !skuValue}
              className="border-indigo/30 text-indigo hover:bg-indigo/5 flex-1 min-w-[120px]"
              data-ocid="barcode.save_button"
            >
              <Download className="w-4 h-4 mr-2" />
              Save for Later
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Labels */}
      {savedLabels.length > 0 && (
        <Card className="shadow-card border-border">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Saved Labels
              <Badge
                variant="secondary"
                className="ml-1 bg-saffron/10 text-saffron border-saffron/20"
              >
                {savedLabels.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {savedLabels.map((label, idx) => (
                <motion.div
                  key={label.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-saffron/30 bg-white transition-colors"
                  data-ocid={`barcode.item.${idx + 1}` as string}
                >
                  <div className="w-8 h-8 rounded-lg bg-saffron-light flex items-center justify-center flex-shrink-0">
                    <Barcode className="w-4 h-4 text-saffron" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {label.productName}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        SKU: {label.sku}
                      </span>
                      {label.mrp && (
                        <span className="text-xs text-muted-foreground">
                          MRP: ₹{label.mrp}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 h-4"
                      >
                        {label.barcodeType}
                      </Badge>
                      {label.labelWidth > 0 && label.labelHeight > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 h-4 bg-saffron/5 text-saffron border-saffron/20 flex items-center gap-0.5"
                        >
                          <Ruler className="w-2.5 h-2.5" />
                          {label.labelWidth}×{label.labelHeight}mm
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Saved{" "}
                      {new Date(label.savedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReprint(label)}
                      className="h-8 border-saffron/30 text-saffron hover:bg-saffron/10 text-xs"
                      data-ocid={`barcode.edit_button.${idx + 1}` as string}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Reprint
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSaved(label.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      data-ocid={`barcode.delete_button.${idx + 1}` as string}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {savedLabels.length === 0 && (
        <div
          className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground"
          data-ocid="barcode.empty_state"
        >
          <Barcode className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm">
            No saved labels yet. Save a label to reprint it anytime.
          </p>
        </div>
      )}

      {/* Barcode Tips */}
      <Card className="border-indigo/20 bg-indigo/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-indigo flex items-center gap-2">
            <Loader2 className="w-4 h-4" />
            Barcode Type Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-1.5 text-xs text-foreground/80">
            <li>
              <strong>Code128</strong> — Best for grocery use. Encodes any text
              or numbers. Recommended for custom SKUs.
            </li>
            <li>
              <strong>EAN-13</strong> — Standard retail barcode. Value must be
              exactly 13 digits. Used on most packaged goods.
            </li>
            <li>
              <strong>EAN-8</strong> — Shorter EAN. Value must be exactly 8
              digits. Used on small packages.
            </li>
            <li>
              <strong>Code39</strong> — Uppercase letters and numbers only.
              Commonly used in logistics.
            </li>
            <li>
              <strong>UPC-A</strong> — US standard, 12 digits. Used on imported
              products.
            </li>
            <li>
              <strong>QR Code</strong> — 2D code. Can encode any text, URL, or
              phone number. Works on smartphone cameras.
            </li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
