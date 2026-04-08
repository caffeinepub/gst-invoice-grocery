import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  Store,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  formatBatchDate,
  getBatchExpiryStatus,
  getBatches,
  getExpiryThreshold,
  setExpiryThreshold,
} from "../hooks/useBatchInventory";
import {
  useGetMyCredits,
  useGetProducts,
  useGetStoreSummary,
  useRefreshAllData,
} from "../hooks/useQueries";

const fmt = (paise: bigint) => `₹${(Number(paise) / 100).toFixed(2)}`;

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex gap-3 items-start">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-semibold text-red-700 text-sm">{title}</div>
        <div className="text-red-600 text-xs mt-1 font-mono break-all">
          {message}
        </div>
      </div>
    </div>
  );
}

interface ExpiryEntry {
  productName: string;
  sku: string;
  batchId: string;
  expiryDate: string;
  qty: number;
  status: "expired" | "expiring" | "ok";
  daysLeft: number;
}

interface Props {
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const {
    data: summary,
    isLoading,
    isFetching: actorFetching,
    error: summaryError,
  } = useGetStoreSummary();
  const { data: credits } = useGetMyCredits();
  const { data: products = [] } = useGetProducts();
  const refreshAllData = useRefreshAllData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const [lowStockDismissed, setLowStockDismissed] = useState(false);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [thresholdInput, setThresholdInput] =
    useState<number>(getExpiryThreshold);
  // expiryThreshold drives re-render of expiry section when settings are saved
  const [expiryThreshold, setExpiryThresholdState] =
    useState<number>(getExpiryThreshold);

  // Re-render trigger for batch data (localStorage) — increments when batch-updated event fires
  const [batchRevision, setBatchRevision] = useState(0);

  // Store logo from localStorage
  const [storeLogo, setStoreLogo] = useState<string | null>(() =>
    localStorage.getItem("store_logo"),
  );

  // Listen for logo updates and batch updates
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "store_logo") {
        setStoreLogo(e.newValue);
      }
    };
    const onBatchUpdated = () => {
      setBatchRevision((prev) => prev + 1);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("batch-updated", onBatchUpdated);
    if (summary) {
      setStoreLogo(localStorage.getItem("store_logo"));
    }
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("batch-updated", onBatchUpdated);
    };
  }, [summary]);

  const lowStockItems = products.filter((p) => Number(p.stockQty) < 10);
  const hasShownLowStockRef = useRef(false);

  useEffect(() => {
    if (lowStockItems.length > 0 && !hasShownLowStockRef.current) {
      hasShownLowStockRef.current = true;
      setShowLowStock(true);
    }
  }, [lowStockItems.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const creditCount = credits !== undefined ? Number(credits) : null;

  const creditColor =
    creditCount === null
      ? "text-muted-foreground"
      : creditCount === 0
        ? "text-red-500"
        : creditCount <= 10
          ? "text-amber-500"
          : "text-emerald-600";

  const creditBg =
    creditCount === null
      ? "bg-muted"
      : creditCount === 0
        ? "bg-red-50 border border-red-200"
        : creditCount <= 10
          ? "bg-amber-50 border border-amber-200"
          : "bg-emerald-50 border border-emerald-200";

  if (actorFetching || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {["a", "b", "c", "d"].map((k) => (
            <Skeleton key={k} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const isStoreNotFound =
    summaryError &&
    String(summaryError).toLowerCase().includes("store not found");

  const hasError = summaryError && !isStoreNotFound;

  const noStore =
    isStoreNotFound || (!hasError && !summary && !isLoading && !actorFetching);

  if (hasError || noStore || !summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-10 text-center px-4 space-y-4"
        data-ocid="dashboard.empty_state"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-saffron-light to-saffron/20 flex items-center justify-center shadow-warm">
          <Store className="w-10 h-10 text-saffron" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          {hasError ? "Error loading data" : "Set up your store"}
        </h2>
        {!hasError && (
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Register your store details to start creating GST invoices.
          </p>
        )}

        {summaryError && !isStoreNotFound && (
          <ErrorBox
            title="Data Fetch Error (storeSummary)"
            message={String(summaryError)}
          />
        )}

        {(noStore || !hasError) && (
          <Button
            onClick={() => onNavigate("store")}
            className="bg-gradient-to-r from-saffron to-saffron-dark text-white shadow-warm h-12 px-6 rounded-xl font-semibold"
            data-ocid="dashboard.primary_button"
          >
            <Store className="w-4 h-4 mr-2" /> Set Up Store
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-saffron transition-colors disabled:opacity-50"
          data-ocid="dashboard.secondary_button"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Retrying..." : "Retry loading data"}
        </button>
      </motion.div>
    );
  }

  const stats = [
    {
      label: "Total Invoices",
      value: summary.totalInvoices.toString(),
      icon: Receipt,
      gradient: "from-indigo to-indigo-dark",
      iconBg: "bg-indigo-light",
      iconColor: "text-indigo",
      textColor: "text-white",
    },
    {
      label: "Total Sales",
      value: fmt(summary.totalSales),
      icon: TrendingUp,
      gradient: "from-saffron to-saffron-dark",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
    },
    {
      label: "Products",
      value: summary.totalProducts.toString(),
      icon: Package,
      gradient: "from-saffron-dark to-indigo",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
    },
    {
      label: "GST Collected",
      value: fmt(summary.totalCgst + summary.totalSgst + summary.totalIgst),
      icon: Wallet,
      gradient: "from-indigo-dark to-indigo",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      textColor: "text-white",
    },
  ];

  // Task 3: Batch-wise expiry entries (re-computed on batchRevision or expiryThreshold change)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // batchRevision and expiryThreshold are used here to force re-evaluation when batches or settings change
  void batchRevision;

  const expiryEntries: ExpiryEntry[] = [];
  for (const p of products) {
    const batches = getBatches(p.sku);
    if (batches.length > 0) {
      // Use batch data
      for (const batch of batches) {
        const status = getBatchExpiryStatus(batch.expiryDate, expiryThreshold);
        if (status === "ok") continue; // only show expired/expiring
        const expDate = batch.expiryDate ? new Date(batch.expiryDate) : null;
        const daysLeft = expDate
          ? Math.floor(
              (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0;
        expiryEntries.push({
          productName: p.name,
          sku: p.sku,
          batchId: `${batch.batchId.split("-").slice(-1)[0]}…`,
          expiryDate: batch.expiryDate,
          qty: batch.stockQty,
          status,
          daysLeft,
        });
      }
    } else {
      // Fall back to legacy expiry_{sku}
      const d = localStorage.getItem(`expiry_${p.sku}`);
      if (!d) continue;
      const expDate = new Date(d);
      expDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.floor(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (expDate < today) {
        expiryEntries.push({
          productName: p.name,
          sku: p.sku,
          batchId: "—",
          expiryDate: d,
          qty: Number(p.stockQty),
          status: "expired",
          daysLeft,
        });
      } else if (daysLeft <= expiryThreshold) {
        expiryEntries.push({
          productName: p.name,
          sku: p.sku,
          batchId: "—",
          expiryDate: d,
          qty: Number(p.stockQty),
          status: "expiring",
          daysLeft,
        });
      }
    }
  }

  // Sort by expiry date ascending (soonest/most expired first)
  expiryEntries.sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  const expiredEntries = expiryEntries.filter((e) => e.status === "expired");
  const expiringEntries = expiryEntries.filter((e) => e.status === "expiring");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
      data-ocid="dashboard.section"
    >
      {/* Low Stock Dialog */}
      <Dialog open={showLowStock} onOpenChange={setShowLowStock}>
        <DialogContent className="max-w-sm" data-ocid="dashboard.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Low Stock Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {lowStockItems.map((product) => {
              const qty = Number(product.stockQty);
              return (
                <div
                  key={product.sku}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {product.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      SKU: {product.sku}
                    </div>
                  </div>
                  {qty === 0 ? (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Out of Stock
                    </span>
                  ) : qty < 5 ? (
                    <span className="text-xs font-bold text-red-600">
                      {qty} left
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600">
                      {qty} left
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowLowStock(false);
                setLowStockDismissed(true);
              }}
              data-ocid="dashboard.cancel_button"
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                setShowLowStock(false);
                setLowStockDismissed(true);
                onNavigate("products");
              }}
              data-ocid="dashboard.primary_button"
            >
              <Package className="w-3.5 h-3.5 mr-1" /> Go to Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog
        open={showSettings}
        onOpenChange={(open) => {
          setShowSettings(open);
          if (open) setThresholdInput(getExpiryThreshold());
        }}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="dashboard.settings_modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Settings className="w-5 h-5 text-saffron" />
              Dashboard Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="expiry-threshold"
                className="text-sm font-semibold text-foreground"
              >
                Expiry Alert Threshold (days)
              </Label>
              <Input
                id="expiry-threshold"
                type="number"
                min={1}
                max={90}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(Number(e.target.value))}
                className="h-10 border-input"
                data-ocid="dashboard.settings_threshold_input"
              />
              <p className="text-xs text-muted-foreground">
                Products expiring within this many days will be highlighted.
                Min: 1 day — Max: 90 days.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(false)}
              data-ocid="dashboard.settings_cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-saffron to-saffron-dark text-white shadow-warm"
              onClick={() => {
                const clamped = Math.max(1, Math.min(90, thresholdInput || 30));
                setExpiryThreshold(clamped);
                setExpiryThresholdState(clamped);
                setThresholdInput(clamped);
                setShowSettings(false);
              }}
              data-ocid="dashboard.settings_save_button"
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-saffron via-saffron-dark to-indigo p-5 text-white shadow-warm-lg"
      >
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -right-2 w-24 h-24 rounded-full bg-white/8" />
        <div className="absolute top-2 right-16 w-8 h-8 rounded-full bg-white/15" />

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-60 z-10"
          title="Refresh data"
          data-ocid="dashboard.toggle"
        >
          <RefreshCw
            className={`w-4 h-4 text-white ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="absolute top-3 right-14 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors z-10"
          title="Dashboard settings"
          aria-label="Dashboard settings"
          data-ocid="dashboard.settings_button"
        >
          <Settings className="w-4 h-4 text-white" />
        </button>

        <div className="relative flex items-center gap-4">
          {/* Store Logo */}
          {storeLogo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex-shrink-0"
            >
              <img
                src={storeLogo}
                alt="Store logo"
                className="h-16 w-auto max-w-[80px] object-contain drop-shadow-md"
              />
            </motion.div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
              Welcome back
            </p>
            <h1 className="font-display text-2xl font-bold leading-tight truncate">
              {summary.storeProfile.name}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {summary.storeProfile.state || "Your store overview"}
            </p>
          </div>
        </div>

        <div className="relative mt-4 flex gap-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-white/70 text-xs">Today</div>
            <div className="text-white font-bold text-sm">
              {fmt(summary.totalSales)}
            </div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-white/70 text-xs">Invoices</div>
            <div className="text-white font-bold text-sm">
              {summary.totalInvoices.toString()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Credit Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`flex items-center justify-between rounded-2xl px-5 py-4 ${creditBg}`}
        data-ocid="dashboard.credit_balance"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs">
            <Zap className="w-5 h-5 text-saffron fill-saffron" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">
              Invoice Credits
            </div>
            <div className={`text-2xl font-bold leading-tight ${creditColor}`}>
              {creditCount !== null ? creditCount : "--"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              creditCount === 0
                ? "bg-red-100 text-red-600"
                : creditCount !== null && creditCount <= 10
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {creditCount === 0
              ? "Inactive"
              : creditCount !== null && creditCount <= 10
                ? "Low Credits"
                : "Active"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            1 credit = 1 invoice
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-4 shadow-card`}
          >
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
            <div
              className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center mb-3`}
            >
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <div
              className={`text-xl font-bold ${stat.textColor} leading-tight truncate`}
            >
              {stat.value}
            </div>
            <div className="text-white/70 text-xs mt-1 font-medium">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Task 3: Batch-wise Expiry Alert Section */}
      {(expiredEntries.length > 0 || expiringEntries.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-white shadow-card overflow-hidden"
          data-ocid="dashboard.expiry.card"
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-saffron" />
              <h2 className="font-display font-semibold text-foreground text-base">
                Expiry Alerts
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-saffron-light text-saffron-dark">
                {expiryThreshold}d
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {expiryEntries.length} batch
              {expiryEntries.length !== 1 ? "es" : ""}
            </span>
          </div>
          <div className="p-4 space-y-4">
            {expiredEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                  Expired Batches ({expiredEntries.length})
                </p>
                <div className="max-h-52 overflow-y-auto space-y-1.5">
                  {expiredEntries.map((entry, idx) => (
                    <div
                      key={`expired-${entry.sku}-${entry.batchId}-${idx}`}
                      className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2"
                      data-ocid={`dashboard.expiry.item.${idx + 1}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {entry.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {entry.sku}
                          {entry.batchId !== "—" && (
                            <span className="ml-2 font-mono">
                              Batch: {entry.batchId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                          Qty: {entry.qty}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.expiryDate
                            ? formatBatchDate(entry.expiryDate)
                            : "—"}
                        </span>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-semibold">
                          Expired
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {expiringEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
                  Expiring Within {expiryThreshold} Days (
                  {expiringEntries.length})
                </p>
                <div className="max-h-52 overflow-y-auto space-y-1.5">
                  {expiringEntries.map((entry, idx) => (
                    <div
                      key={`expiring-${entry.sku}-${entry.batchId}-${idx}`}
                      className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2"
                      data-ocid={`dashboard.expiry.item.${expiredEntries.length + idx + 1}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {entry.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {entry.sku}
                          {entry.batchId !== "—" && (
                            <span className="ml-2 font-mono">
                              Batch: {entry.batchId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">
                          Qty: {entry.qty}
                        </span>
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                          {entry.daysLeft === 0
                            ? "Exp today"
                            : entry.daysLeft > 0
                              ? `${entry.daysLeft}d left`
                              : "Expired"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("products")}
              className="w-full h-8 text-xs border-saffron/30 text-saffron-dark hover:bg-saffron-light"
              data-ocid="dashboard.expiry.button"
            >
              <Package className="w-3.5 h-3.5 mr-1" /> Go to Products
            </Button>
          </div>
        </motion.div>
      )}

      {/* Low Stock Banner (after dismissing popup) */}
      {lowStockItems.length > 0 && lowStockDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
          data-ocid="dashboard.panel"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-medium text-amber-800">
              ⚠ {lowStockItems.length} product
              {lowStockItems.length > 1 ? "s" : ""} have low stock
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLowStock(true)}
            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            data-ocid="dashboard.secondary_button"
          >
            View
          </Button>
        </motion.div>
      )}

      {/* GST Summary */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <h2 className="font-display font-semibold text-foreground text-base">
            GST Summary
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tax collected breakdown
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="p-4 text-center">
            <div className="w-8 h-8 rounded-full bg-saffron-light flex items-center justify-center mx-auto mb-2">
              <span className="text-xs font-bold text-saffron">C</span>
            </div>
            <div className="text-xs text-muted-foreground mb-1">CGST</div>
            <div className="font-bold text-saffron-dark text-sm">
              {fmt(summary.totalCgst)}
            </div>
          </div>
          <div
            className="p-4 text-center"
            style={{ background: "oklch(0.97 0.04 55)" }}
          >
            <div className="w-8 h-8 rounded-full bg-saffron/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-xs font-bold text-saffron-dark">S</span>
            </div>
            <div className="text-xs text-muted-foreground mb-1">SGST</div>
            <div className="font-bold text-saffron-darker text-sm">
              {fmt(summary.totalSgst)}
            </div>
          </div>
          <div
            className="p-4 text-center"
            style={{ background: "oklch(0.95 0.04 275)" }}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-light flex items-center justify-center mx-auto mb-2">
              <span className="text-xs font-bold text-indigo">I</span>
            </div>
            <div className="text-xs text-muted-foreground mb-1">IGST</div>
            <div className="font-bold text-indigo text-sm">
              {fmt(summary.totalIgst)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => onNavigate("invoice")}
          className="bg-gradient-to-r from-saffron to-saffron-dark text-white shadow-warm h-12 rounded-xl font-semibold"
          data-ocid="dashboard.primary_button"
        >
          <Receipt className="w-4 h-4 mr-2" /> New Invoice
        </Button>
        <Button
          variant="outline"
          onClick={() => onNavigate("products")}
          className="border-indigo/30 text-indigo hover:bg-indigo-light h-12 rounded-xl font-semibold"
          data-ocid="dashboard.secondary_button"
        >
          <Package className="w-4 h-4 mr-2" /> Products
        </Button>
      </div>
    </motion.div>
  );
}
