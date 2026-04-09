import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  HelpCircle,
  MessageCircle,
  Phone,
  Printer,
  ShieldCheck,
  Smartphone,
  Star,
  Store,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    step: 1,
    title: "Login with Internet Identity",
    desc: 'Tap "Get Started Free" on the home screen. Internet Identity provides secure, passwordless login — no username or password needed.',
  },
  {
    step: 2,
    title: "Set Up Your Store",
    desc: "Go to the Store tab and enter your store name, address, GSTIN, FSSAI number, phone, and state. This info prints on every invoice.",
  },
  {
    step: 3,
    title: "Add Your Products",
    desc: "Go to Products and add items with HSN code, MRP, GST rate (0/5/12/18/28%), SKU, and current stock level.",
  },
  {
    step: 4,
    title: "Create a New Invoice",
    desc: "Tap New Bill → enter customer name/GSTIN → add products from your catalog → choose GST type (CGST+SGST or IGST).",
  },
  {
    step: 5,
    title: "Preview & Print Receipt",
    desc: "Live preview updates as you add items. Tap Print to send the 80mm thermal receipt to your printer via browser print.",
  },
  {
    step: 6,
    title: "Manage All Invoices",
    desc: "The Invoices tab lists all your bills with edit, delete, reprint options and Excel export with date filter for reports.",
  },
  {
    step: 7,
    title: "Scan Barcodes (Android & iPhone)",
    desc: "On the New Bill page, tap the scan icon to open camera. Works on Android Chrome, iPhone Safari, and iPhone Chrome. Make sure camera permission is allowed in your phone settings.",
  },
  {
    step: 8,
    title: "Expiry Date Alerts on Dashboard",
    desc: "The Dashboard shows a Product Expiry Alert section listing expired and soon-to-expire products (within 30 days) with barcode/SKU and remaining stock. Tap 'Go to Products' to update them.",
  },
  {
    step: 9,
    title: "Download Invoices as ZIP",
    desc: "On the Invoices page, set a date range and tap 'Download ZIP' to download all invoices in that period as individual HTML files in a single zip archive.",
  },
  {
    step: 10,
    title: "Admin Panel (Admin Only)",
    desc: "Admin can activate new store accounts, add recharge credits, search stores, and send WhatsApp notifications from the Admin tab.",
  },
  {
    step: 11,
    title: "Manager PIN & Recovery",
    desc: "Go to Store Setup to set a 4-digit Manager PIN. This PIN is required to edit store details, edit/delete invoices, and view your Principal ID. If you forget your PIN, tap 'Forgot PIN?' in the PIN entry dialog and enter your registered phone number to reset it. After reset, go to Store Setup to set a new PIN.",
  },
  {
    step: 12,
    title: "Barcode Label Generator",
    desc: "Tap the 'Barcode' tab to open the label generator. Select a barcode type (Code128, EAN-13, QR, etc.), pick a product from your catalog or enter details manually, set the quantity of labels to print, then tap Print. Labels are saved automatically for future reprinting — just find the saved label, change qty if needed, and reprint.",
  },
];

const TECH = [
  {
    icon: Database,
    name: "Internet Computer (ICP)",
    desc: "Blockchain platform by DFINITY. Your data lives on-chain with no central server.",
  },
  {
    icon: Code2,
    name: "Motoko Smart Contracts",
    desc: "Backend written in Motoko — designed for ICP. Data stored in stable variables, survives upgrades.",
  },
  {
    icon: Zap,
    name: "React 19 + TypeScript",
    desc: "Modern, fast frontend with type safety. Runs directly in your browser with no app download needed.",
  },
  {
    icon: Smartphone,
    name: "Tailwind CSS (Mobile-First)",
    desc: "Utility-first CSS framework. Every screen is designed for mobile first, then adapts to tablet/desktop.",
  },
  {
    icon: Printer,
    name: "80mm Thermal Printing",
    desc: "Uses browser's built-in print API. Works with any 80mm thermal printer connected via USB or Bluetooth.",
  },
  {
    icon: ShieldCheck,
    name: "Internet Identity Auth",
    desc: "Passwordless login via DFINITY's Internet Identity — no email, no password, secured by your device biometrics.",
  },
];

const REASONS = [
  {
    icon: "📋",
    title: "100% GST Compliant",
    desc: "CGST, SGST & IGST breakdowns on every invoice as per Indian tax law.",
  },
  {
    icon: "🔗",
    title: "Blockchain Data Storage",
    desc: "Your invoices and products live on-chain — no server that can go down permanently.",
  },
  {
    icon: "🔒",
    title: "You Own Your Data",
    desc: "Data is tied to your Internet Identity. Nobody else can access your store's records.",
  },
  {
    icon: "📱",
    title: "Works on Any Phone",
    desc: "Mobile-first design works perfectly on Android and iOS without installing any app.",
  },
  {
    icon: "🏪",
    title: "Multi-Store Support",
    desc: "Each login (principal) has its own isolated store — perfect for managing multiple outlets.",
  },
  {
    icon: "🖨️",
    title: "Thermal Printer Ready",
    desc: "Optimized 80mm print layout for thermal receipt printers used in grocery stores.",
  },
  {
    icon: "🆓",
    title: "Free to Start",
    desc: "Activate your account and start billing — no upfront cost required to try the app.",
  },
  {
    icon: "📦",
    title: "Expiry Date Tracking",
    desc: "Track product expiry dates with visual alerts on the dashboard — expired items shown in red, soon-expiring in amber.",
  },
];

export default function HelpSupport() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8" data-ocid="help.page">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center pt-2"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-saffron to-saffron-dark shadow-warm mb-4">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">
          Help &amp; Support
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything you need to know about BillKaro
        </p>
      </motion.div>

      {/* Technology */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="border-border shadow-xs" data-ocid="help.tech.card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-saffron text-base">
              <Code2 className="w-5 h-5" /> Technology Used
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TECH.map((t) => (
              <div
                key={t.name}
                className="flex gap-3 p-3 rounded-xl bg-saffron-light/40 border border-saffron/10"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-saffron/15 flex items-center justify-center">
                  <t.icon className="w-4 h-4 text-saffron-dark" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {t.desc}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* How to Use */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-border shadow-xs" data-ocid="help.howto.card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-saffron text-base">
              <BookOpen className="w-5 h-5" /> How to Use This App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className={`flex gap-3 ${i < STEPS.length - 1 ? "pb-3 border-b border-border" : ""}`}
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-saffron to-saffron-dark text-white text-xs font-bold flex items-center justify-center shadow-warm">
                  {s.step}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Why Choose */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="border-border shadow-xs" data-ocid="help.why.card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-saffron text-base">
              <Star className="w-5 h-5" /> Why Choose BillKaro
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REASONS.map((r) => (
              <div
                key={r.title}
                className="flex gap-3 p-3 rounded-xl bg-indigo/5 border border-indigo/10"
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {r.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Support */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card
          className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xs"
          data-ocid="help.support.card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-700 text-base">
                <MessageCircle className="w-5 h-5" /> Help &amp; Support
              </CardTitle>
              <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs px-2 py-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 24×7 Available
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white border-2 border-green-200 shadow-sm mb-3">
                <Store className="w-7 h-7 text-green-600" />
              </div>
              <p className="font-semibold text-foreground text-base">
                Ankit Verma
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;re here to help you anytime, day or night.
              </p>
            </div>
            <a
              href="https://wa.me/917023295769?text=Hi%2C%20I%20need%20help%20with%20BillKaro%20GST%20Invoice%20App"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid="help.support.button"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-base shadow-lg transition-all"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 fill-white"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="WhatsApp"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat on WhatsApp
            </a>
            <a
              href="tel:7023295769"
              data-ocid="help.support.link"
              className="flex items-center justify-center gap-3 w-full py-3 rounded-2xl bg-white border-2 border-green-200 hover:border-green-400 active:scale-95 text-green-700 font-semibold text-sm transition-all"
            >
              <Phone className="w-5 h-5" />
              Call: +91 7023295769
            </a>
            <div className="flex items-center justify-center gap-2 pt-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-700 font-medium">
                24×7 Support · WhatsApp &amp; Phone
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
