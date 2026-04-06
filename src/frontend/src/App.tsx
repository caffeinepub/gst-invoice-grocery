import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  Receipt,
  ShieldCheck,
  Store,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ShyamaChatbot from "./components/ShyamaChatbot";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetMyCredits, useIsCallerAdmin } from "./hooks/useQueries";
import AdminPanel from "./pages/AdminPanel";
import Dashboard from "./pages/Dashboard";
import HelpSupport from "./pages/HelpSupport";
import InactiveAccount from "./pages/InactiveAccount";
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/NewInvoice";
import Products from "./pages/Products";
import StoreSetup from "./pages/StoreSetup";

const BASE_TABS = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "store", label: "Store", icon: Store },
  { id: "products", label: "Products", icon: Package },
  { id: "invoice", label: "New Bill", icon: Receipt },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "help", label: "Help", icon: HelpCircle },
] as const;

const ADMIN_TAB = { id: "admin", label: "Admin", icon: ShieldCheck } as const;

type BaseTabId = (typeof BASE_TABS)[number]["id"];
type TabId = BaseTabId | "admin";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const { login, clear, loginStatus, identity, isInitializing } =
    useInternetIdentity();
  const isLoggedIn = !!identity;
  const isLoggingIn = loginStatus === "logging-in";
  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-3)}`
    : "";

  const { data: isAdmin = false } = useIsCallerAdmin();
  const {
    data: credits,
    isLoading: creditsLoading,
    isError: creditsError,
  } = useGetMyCredits();

  const TABS = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  // FIX: Only show inactive screen when credits are definitively 0 AND fully loaded.
  // Prevents wrongly locking out new devices/new principals when getMyCredits
  // fails transiently on first load (network blip, canister cold-start).
  const isInactive =
    isLoggedIn &&
    !isAdmin &&
    !creditsLoading &&
    !creditsError &&
    credits !== undefined &&
    credits === 0n;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-saffron to-saffron-dark flex items-center justify-center shadow-warm">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight">
              Bill<span className="text-saffron">Karo</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          {isLoggedIn && !isInactive && (
            <nav className="hidden md:flex items-center gap-1 flex-1 ml-4">
              {TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  data-ocid={`nav.${tab.id}_link` as string}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-saffron text-white shadow-warm"
                      : "text-muted-foreground hover:text-foreground hover:bg-saffron-light"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label === "New Bill" ? "New Invoice" : tab.label}
                </button>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-indigo/10 border border-indigo/20 text-xs font-semibold text-indigo">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-saffron-light border border-saffron/20 text-sm">
                  <div className="w-2 h-2 rounded-full bg-saffron" />
                  <span className="font-mono text-xs text-saffron-dark font-medium">
                    {shortPrincipal}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  className="text-muted-foreground hover:text-destructive h-9 w-9 p-0"
                  data-ocid="nav.logout_button"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={login}
                disabled={isLoggingIn || isInitializing}
                className="bg-saffron hover:bg-saffron-dark text-white shadow-warm h-9 px-4 text-sm font-semibold"
                data-ocid="nav.login_button"
              >
                {isLoggingIn ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-1.5" />
                )}
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 max-w-7xl mx-auto w-full px-4 py-5 ${
          isLoggedIn && !isInactive ? "pb-24 md:pb-6" : ""
        }`}
      >
        {!isLoggedIn ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4"
            data-ocid="landing.section"
          >
            {/* Hero gradient orb */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-saffron/20 blur-2xl scale-150" />
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-saffron via-saffron-dark to-indigo flex items-center justify-center shadow-warm-lg">
                <Zap className="w-12 h-12 text-white fill-white" />
              </div>
            </div>

            <h1 className="font-display text-4xl font-bold text-foreground mb-2 tracking-tight">
              Bill<span className="text-saffron">Karo</span>
            </h1>
            <p className="text-lg text-saffron-dark font-semibold mb-3">
              GST Billing for Grocery Stores
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
              Create GST-compliant invoices, manage your product catalog, and
              track sales — all from your phone.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-sm">
              {[
                { label: "Thermal Print", desc: "80mm ready", emoji: "🖨️" },
                { label: "GST Ready", desc: "CGST/SGST/IGST", emoji: "📋" },
                { label: "Inventory", desc: "Product catalog", emoji: "📦" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="p-3 rounded-2xl bg-white border border-border shadow-xs text-center"
                >
                  <div className="text-2xl mb-1">{f.emoji}</div>
                  <div className="font-semibold text-xs text-foreground leading-tight">
                    {f.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={login}
              disabled={isLoggingIn || isInitializing}
              size="lg"
              className="bg-gradient-to-r from-saffron to-saffron-dark hover:from-saffron-dark hover:to-saffron-darker text-white shadow-warm-lg w-full max-w-xs h-12 text-base font-semibold rounded-xl"
              data-ocid="landing.primary_button"
            >
              {isLoggingIn ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              Get Started Free
            </Button>

            <p className="mt-6 text-xs text-muted-foreground">
              Developed by <span className="font-medium">Ankit Verma</span> ·
              Mob:{" "}
              <a
                href="tel:7023285769"
                className="text-saffron hover:underline font-medium"
              >
                7023285769
              </a>
            </p>
          </motion.div>
        ) : isInactive ? (
          <InactiveAccount principal={principal} onLogout={clear} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && (
                <Dashboard onNavigate={(t) => setActiveTab(t as TabId)} />
              )}
              {activeTab === "store" && <StoreSetup />}
              {activeTab === "products" && <Products />}
              {activeTab === "invoice" && <NewInvoice />}
              {activeTab === "invoices" && <Invoices />}
              {activeTab === "admin" && <AdminPanel />}
              {activeTab === "help" && <HelpSupport />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      {isLoggedIn && !isInactive && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border pb-safe">
          <div className="flex items-center justify-around px-1 pt-1 pb-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  data-ocid={`nav.${tab.id}_link` as string}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] min-h-[52px] px-1.5 py-1 rounded-xl transition-all ${
                    isActive
                      ? "text-saffron"
                      : "text-muted-foreground active:scale-95"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-9 h-7 rounded-xl transition-all ${
                      isActive ? "bg-saffron/12" : ""
                    }`}
                  >
                    <tab.icon
                      className={`w-4 h-4 transition-all ${
                        isActive ? "stroke-saffron scale-110" : ""
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[9px] font-medium leading-none ${
                      isActive ? "text-saffron font-semibold" : ""
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Footer — desktop only */}
      <footer className="hidden md:block border-t border-border bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} BillKaro · Developed by{" "}
          <span className="text-saffron font-medium">Ankit Verma</span> · Mob:{" "}
          <a
            href="tel:7023285769"
            className="text-saffron hover:underline font-medium"
          >
            7023285769
          </a>
        </div>
      </footer>

      {/* Shyama Chatbot — visible for all logged-in users */}
      {isLoggedIn && <ShyamaChatbot />}
    </div>
  );
}
