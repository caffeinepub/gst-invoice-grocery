import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowRight,
  Package,
  Receipt,
  RefreshCw,
  Store,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  useGetMyCredits,
  useGetStoreSummary,
  useRefreshAllData,
} from "../hooks/useQueries";

const fmt = (paise: bigint) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(paise) / 100,
  );

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
  const refreshAllData = useRefreshAllData();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // "Store not found" is a normal state (new user, no store registered yet)
  const isStoreNotFound =
    summaryError &&
    String(summaryError).toLowerCase().includes("store not found");

  // Only treat as real error if it's NOT a "store not found" message
  const hasError = summaryError && !isStoreNotFound;

  // Show no-store UI if the error says store not found, or if there's no summary and no other error
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

        {/* Only show error boxes for real (unexpected) errors */}
        {summaryError && !isStoreNotFound && (
          <ErrorBox
            title="Data Fetch Error (storeSummary)"
            message={String(summaryError)}
          />
        )}

        {/* Always show the setup button when there's no store */}
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
      data-ocid="dashboard.section"
    >
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

        <div className="relative">
          <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">
            Welcome back
          </p>
          <h1 className="font-display text-2xl font-bold leading-tight">
            {summary.storeProfile.name}
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {summary.storeProfile.state || "Your store overview"}
          </p>
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
