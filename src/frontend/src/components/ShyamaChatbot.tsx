import { MessageCircle, Send, Volume2, VolumeX, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  time: Date;
}

// ── Knowledge Base ────────────────────────────────────────────────────────────
const KB: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["hello", "hi", "namaste", "hey", "start", "help"],
    answer:
      "Namaste! I'm Shyama, your BillKaro assistant. I can help you with creating invoices, managing products, printer setup, GST billing, and everything about this app. What would you like to know?",
  },
  {
    keywords: [
      "first invoice",
      "first bill",
      "pehla invoice",
      "create invoice",
      "new invoice",
      "how to bill",
      "kaise banaye",
      "generate invoice",
    ],
    answer:
      "To generate your first invoice:\n1) Login using Internet Identity.\n2) Go to Store tab and fill your store details (name, GSTIN, address).\n3) Go to Products tab and add your products with MRP, HSN code and GST rate.\n4) Tap 'New Bill' in the menu.\n5) Add customer name (optional).\n6) Select products and set quantities using − and + buttons.\n7) Choose Cash/Card/UPI payment mode.\n8) Tap 'Print Invoice' to print, or 'Save Invoice' to save it.",
  },
  {
    keywords: [
      "how to use",
      "kaise use",
      "guide",
      "tutorial",
      "steps",
      "usage",
      "use karna",
    ],
    answer:
      "BillKaro is easy to use! Steps:\n1) Login with Internet Identity (no password needed).\n2) Setup your store details in the Store tab.\n3) Add your products in Products tab.\n4) Create bills in New Bill tab.\n5) View all saved bills in Invoices tab.\n6) Admin panel is for account management.\nThe Help tab has detailed guides. Need help with any specific step?",
  },
  {
    keywords: [
      "menu",
      "navigation",
      "tabs",
      "nav",
      "screen",
      "pages",
      "sections",
    ],
    answer:
      "BillKaro has 6 main tabs:\n🏠 Home (Dashboard) — shows your sales summary and credits.\n🏪 Store — setup your store details, logo, GSTIN.\n📦 Products — manage your product catalog, add barcode/SKU.\n🧾 New Bill — create a new GST invoice.\n📄 Invoices — view, edit, delete, reprint all saved bills.\n❓ Help — guides and support!\nAdmin tab appears only for the admin account.",
  },
  {
    keywords: ["dashboard", "home", "summary", "stats", "credit", "balance"],
    answer:
      "The Dashboard (Home tab) shows: total invoices created, total sales amount, GST collected, and your account credit balance. Credits are color-coded: green (plenty), amber (low), red (very low). When credits reach 0, your account becomes inactive. Contact admin to recharge. You can also see low stock alerts here.",
  },
  {
    keywords: [
      "print",
      "printer",
      "thermal",
      "receipt",
      "bill print",
      "kaise print",
      "80mm",
      "printing",
    ],
    answer:
      "To print an invoice:\n1) On New Bill page, add products and tap 'Print Invoice'.\n2) A thermal printer animation plays (paper sliding out).\n3) Your browser's print dialog opens automatically.\n4) Select your thermal printer (80mm).\nMake sure your printer is connected via USB or Bluetooth. For best results use Chrome browser. The receipt is formatted for 80mm paper. You can also reprint saved invoices from the Invoices tab.",
  },
  {
    keywords: ["barcode", "scanner", "scan", "camera", "sku", "qr"],
    answer:
      "BillKaro has a built-in barcode scanner! First add barcode/SKU numbers to your products in the Products tab. Then on New Bill page, tap the orange scan icon 📷 button. Point your camera at the product barcode and it auto-adds to the invoice — just like a POS machine! Works on Android Chrome, iPhone Safari and iPhone Chrome. If camera doesn't work, type the barcode manually in the text box.",
  },
  {
    keywords: ["iphone", "ios", "safari", "apple", "camera not working"],
    answer:
      "For iPhone barcode scanning:\n1) Use Safari or Chrome browser on iPhone.\n2) When the camera screen opens, allow camera access when prompted.\n3) If camera is blocked, go to iPhone Settings → Safari → Camera → Allow.\n4) Make sure you're using HTTPS (the app URL starts with https://).\nIf still not working, use the 'Type barcode manually' option or a Bluetooth barcode scanner.",
  },
  {
    keywords: [
      "product",
      "add product",
      "inventory",
      "catalog",
      "stock",
      "item",
      "hsn",
      "gst rate",
    ],
    answer:
      "To add products: Go to Products tab → tap 'Add Product'. Fill in: Product Name, MRP (price in rupees), HSN Code (6-digit tax code), GST Rate (0%, 5%, 12%, 18%, or 28%), Stock Quantity, and Barcode/SKU (for scanning). You can also bulk import products using Excel. Stock is automatically deducted when you create an invoice.",
  },
  {
    keywords: ["excel", "import", "bulk", "upload", "sheet"],
    answer:
      "BillKaro supports bulk product upload via Excel!\n1) Tap 'Template' (green button) on the Products page to download the format.\n2) Fill in your products: Name, Barcode, MRP, Stock Qty, HSN Code, GST Rate.\n3) Tap 'Import Excel' and select your file.\n4) Preview shows each row with OK or error status.\n5) Tap 'Import X Products' to save all valid rows at once.",
  },
  {
    keywords: [
      "store",
      "shop",
      "gstin",
      "fssai",
      "address",
      "setup",
      "logo",
      "details",
    ],
    answer:
      "Store Setup: Go to Store tab and fill in — Store Name, Address, GSTIN (15-digit GST number), FSSAI License Number, Phone Number, State, and optionally upload your Store Logo. This information prints on every invoice. Your GSTIN determines whether CGST+SGST or IGST applies. Upload your store logo once — it appears on all receipts automatically.",
  },
  {
    keywords: ["gst", "cgst", "sgst", "igst", "tax", "intra", "inter", "state"],
    answer:
      "BillKaro handles both GST types:\n• CGST+SGST — for sales within same state (intra-state).\n• IGST — for sales to customers from a different state (inter-state).\nWhen creating an invoice, toggle the switch to select. Product GST rates can be 0%, 5%, 12%, 18%, or 28%. The system auto-calculates all tax amounts and shows the breakdown on the invoice.",
  },
  {
    keywords: [
      "benefit",
      "why use",
      "advantages",
      "reason",
      "why billkaro",
      "kyu use",
      "fayda",
      "billkaro",
    ],
    answer:
      "Why choose BillKaro?\n✅ 100% GST Compliant invoices (CGST/SGST/IGST).\n✅ No app download — runs in your browser.\n✅ Works on any phone (Android + iPhone).\n✅ Thermal printer ready (80mm receipts).\n✅ Barcode scanner built-in.\n✅ Data stored securely on blockchain (ICP).\n✅ Multi-store support.\n✅ Bulk product upload via Excel.\n✅ Auto stock deduction.\n✅ Customer management.\n✅ No data loss — runs on Internet Computer.",
  },
  {
    keywords: [
      "edit invoice",
      "delete invoice",
      "update",
      "modify bill",
      "invoice edit",
    ],
    answer:
      "To edit a saved invoice: Go to Invoices tab → find your invoice → tap the blue Edit (pencil) button. You can update customer name, GSTIN, GST type, line item quantities. Totals recalculate automatically. To delete: tap the red Delete (trash) button and confirm. You can also reprint any saved invoice by tapping the green Print button.",
  },
  {
    keywords: ["customer", "mobile number", "customer detail", "buyer"],
    answer:
      "When creating an invoice, you can optionally enter: Customer Name, Customer GSTIN, and Customer Mobile. These print on the receipt. For repeat customers, their details are auto-suggested. You can send invoice details via WhatsApp to the customer's mobile number using the WhatsApp button on the invoice.",
  },
  {
    keywords: ["payment", "cash", "card", "upi", "mode"],
    answer:
      "BillKaro supports 3 payment modes: 💵 Cash, 💳 Card, and 📱 UPI. Select the payment mode when creating an invoice — it prints on the receipt clearly. This helps you track how each customer paid.",
  },
  {
    keywords: [
      "inactive",
      "not working",
      "account inactive",
      "activate",
      "credits",
      "recharge",
    ],
    answer:
      "If you see 'Account Inactive': Your account needs credits from the admin to work. Share your Principal ID (shown on the inactive screen) with the admin via WhatsApp: +91 7023285769. The admin will activate your account with credits. Each invoice uses 1 credit. When credits run low, contact admin to recharge.",
  },
  {
    keywords: ["admin", "admin panel", "manage stores", "activate store"],
    answer:
      "The Admin Panel is only accessible to the admin account. It shows all registered stores with their name, GSTIN, address, phone. Admin can: Activate new store accounts, Add/recharge credits, Search stores, Send WhatsApp recharge notifications, Export invoice reports to Excel with date filters. Only the admin principal ID can access this panel.",
  },
  {
    keywords: [
      "login",
      "internet identity",
      "how to login",
      "sign in",
      "logout",
    ],
    answer:
      "BillKaro uses Internet Identity for secure login — no username or password needed! Tap 'Get Started Free' or 'Login'. Internet Identity opens — you can login using your phone's Face ID, fingerprint, or PIN. Your data is linked to your unique Principal ID. To logout, tap the logout button in the top right.",
  },
  {
    keywords: ["low stock", "out of stock", "stock alert", "reminder"],
    answer:
      "BillKaro shows low stock alerts! When any product's stock drops below 10 units, a reminder popup appears on your Dashboard. Out-of-stock products (0 quantity) are automatically hidden from the invoice creation screen. Restock by editing the product and updating the Stock Qty.",
  },
  {
    keywords: ["whatsapp", "share", "send", "notify"],
    answer:
      "BillKaro integrates with WhatsApp in multiple ways:\n1) Share invoice link with customers.\n2) Admin can send recharge notifications to store owners.\n3) Help & Support — contact admin via WhatsApp at +91 7023285769 for any issues.\nTap the green WhatsApp button wherever you see it.",
  },
  {
    keywords: [
      "technology",
      "tech",
      "how built",
      "blockchain",
      "icp",
      "motoko",
      "react",
    ],
    answer:
      "BillKaro is built on Internet Computer (ICP) by DFINITY — a blockchain platform.\n• Backend: Motoko smart contracts (data lives on-chain, no server!).\n• Frontend: React 19 + TypeScript + Tailwind CSS.\n• Auth: Internet Identity (passwordless).\n• Storage: Stable variables in Motoko canister.\nYour data is safe, decentralized, and you truly own it!",
  },
  {
    keywords: [
      "barcode label",
      "generate barcode",
      "barcode generator",
      "label generator",
      "print barcode",
      "barcode tab",
    ],
    answer:
      "Go to the Barcode tab in the bottom navigation. Select your barcode type (Code128, EAN-13, QR Code, etc.), pick a product from the dropdown to auto-fill its name, SKU, and MRP, then set the number of labels you want to print. Tap Print to generate a printable label sheet. Your labels are saved for future use — just tap Reprint on any saved label.",
  },
  {
    keywords: [
      "forgot pin",
      "forgot manager pin",
      "reset pin",
      "pin reset",
      "manager pin forgot",
      "recover pin",
      "pin recovery",
    ],
    answer:
      "Tap 'Forgot PIN?' on the PIN entry screen. Enter your store's registered phone number (the one saved in Store Setup). If it matches, your PIN will be reset and you can go to Store Setup to create a new one. If you don't remember the phone number either, contact support on WhatsApp: +91 7023285769.",
  },
  {
    keywords: [
      "how to print barcode",
      "print labels",
      "barcode sticker",
      "label print",
      "product label",
      "sticker print",
    ],
    answer:
      "1. Tap the Barcode tab. 2. Choose barcode type — use Code128 or EAN-13 for most grocery products. 3. Select product from the dropdown to auto-fill details. 4. Enter the quantity of labels needed. 5. Tap Print — a label sheet opens for your printer. 6. Use standard 2.5x4cm sticker labels in your printer. You can save labels and reprint them anytime from the Saved Labels section.",
  },
];

const QUICK_QUESTIONS = [
  "How to create first invoice?",
  "How to use printer?",
  "How to scan barcode?",
  "What is BillKaro?",
  "How to add products?",
  "How to setup store?",
  "What is GST?",
  "How to use on iPhone?",
  "How to import Excel?",
  "Account inactive help",
  "How to generate barcode labels?",
  "I forgot my manager PIN",
];

const GREETING =
  "Namaste! 🙏 Main Shyama hoon, aapki BillKaro assistant. Main aapko invoice banana, products manage karna, printer use karna, aur sab kuch sikhane mein madad karungi! Kya jaanna chahte hain? (I can also answer in English!)";

// ── Helpers ───────────────────────────────────────────────────────────────────
function findAnswer(query: string): string {
  const lower = query.toLowerCase();
  for (const entry of KB) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.answer;
    }
  }
  return "I'm not sure about that specific question. You can ask me about: creating invoices, products, barcode scanning, GST types, printer setup, account activation, or app navigation. Or contact our support: WhatsApp +91 7023285769";
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-IN";
  utter.rate = 0.9;
  utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShyamaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGreetedRef = useRef(false);
  const autoSpeakRef = useRef(autoSpeak);

  // Keep autoSpeakRef in sync
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  // Show greeting on first open
  useEffect(() => {
    if (isOpen && !hasGreetedRef.current) {
      hasGreetedRef.current = true;
      const greeting: ChatMessage = {
        id: "greeting",
        role: "bot",
        text: GREETING,
        time: new Date(),
      };
      setMessages([greeting]);
    }
  }, [isOpen]);

  // Auto-scroll to latest message
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages and isTyping intentionally trigger scroll when content changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text: text.trim(),
        time: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setIsTyping(true);

      setTimeout(() => {
        const answer = findAnswer(text);
        const botMsg: ChatMessage = {
          id: `b-${Date.now()}`,
          role: "bot",
          text: answer,
          time: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        if (autoSpeakRef.current) speak(answer);
      }, 800);
    },
    [isTyping],
  );

  const handleClose = () => {
    setIsOpen(false);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  const handleToggleSpeak = () => {
    setAutoSpeak((prev) => !prev);
    if (autoSpeak && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <>
      {/* ── Chat Panel ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 380 }}
            data-ocid="chatbot.modal"
            className="fixed bottom-[148px] right-4 md:bottom-20 md:right-6 z-50"
            style={{
              width: "340px",
              maxWidth: "calc(100vw - 2rem)",
              height: "480px",
              maxHeight: "calc(100vh - 12rem)",
              display: "flex",
              flexDirection: "column",
              borderRadius: "1.25rem",
              boxShadow:
                "0 20px 60px -10px rgba(0,0,0,0.25), 0 4px 20px -4px rgba(0,0,0,0.12)",
              border: "1px solid oklch(0.92 0.015 70)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.45 0.22 275))",
                flexShrink: 0,
              }}
              className="flex items-center gap-3 px-4 py-3 text-white"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center font-bold text-base border border-white/30">
                  S
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white block" />
              </div>

              {/* Name + subtitle */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight tracking-wide">
                  Shyama
                </div>
                <div className="text-xs text-white/75 leading-tight">
                  BillKaro Assistant · Online
                </div>
              </div>

              {/* Auto-speak toggle */}
              <button
                type="button"
                onClick={handleToggleSpeak}
                title={autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}
                data-ocid="chatbot.toggle"
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/35 transition-colors active:scale-90"
              >
                {autoSpeak ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                data-ocid="chatbot.close_button"
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/35 transition-colors active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-3"
              style={{ background: "oklch(0.978 0.006 80)" }}
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.role === "user" ? 16 : -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Bot avatar */}
                  {msg.role === "bot" && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 self-end"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.45 0.22 275))",
                      }}
                    >
                      S
                    </div>
                  )}

                  <div
                    className={`flex flex-col gap-0.5 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                    style={{ maxWidth: "76%" }}
                  >
                    <div
                      className={`px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "text-white rounded-2xl rounded-br-sm"
                          : "text-gray-800 rounded-2xl rounded-bl-sm border"
                      }`}
                      style={{
                        background:
                          msg.role === "user" ? "oklch(0.72 0.18 50)" : "white",
                        borderColor:
                          msg.role === "bot"
                            ? "oklch(0.92 0.015 70)"
                            : undefined,
                        boxShadow:
                          msg.role === "bot"
                            ? "0 1px 3px rgba(0,0,0,0.07)"
                            : undefined,
                      }}
                    >
                      {msg.text}
                    </div>

                    {/* Timestamp + speak button */}
                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[10px] text-gray-400">
                        {msg.time.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.role === "bot" && (
                        <button
                          type="button"
                          onClick={() => speak(msg.text)}
                          title="Read aloud"
                          className="text-gray-400 hover:text-saffron transition-colors"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.45 0.22 275))",
                    }}
                  >
                    S
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center"
                    style={{
                      background: "white",
                      border: "1px solid oklch(0.92 0.015 70)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block w-2 h-2 rounded-full"
                        style={{ background: "oklch(0.72 0.18 50)" }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          duration: 0.55,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            <div
              className="flex-shrink-0 overflow-x-auto px-3 py-2"
              style={{
                background: "white",
                borderTop: "1px solid oklch(0.92 0.015 70)",
              }}
            >
              <div className="flex gap-2" style={{ width: "max-content" }}>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={isTyping}
                    data-ocid="chatbot.button"
                    className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-medium transition-all disabled:opacity-40"
                    style={{
                      background: "oklch(0.96 0.05 60)",
                      color: "oklch(0.48 0.18 42)",
                      border: "1px solid oklch(0.90 0.08 55)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "oklch(0.72 0.18 50)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "white";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "oklch(0.96 0.05 60)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "oklch(0.48 0.18 42)";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input area */}
            <div
              className="flex-shrink-0 flex gap-2 p-3"
              style={{
                background: "white",
                borderTop: "1px solid oklch(0.92 0.015 70)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(inputText);
                  }
                }}
                placeholder="Ask me anything about BillKaro..."
                disabled={isTyping}
                data-ocid="chatbot.input"
                className="flex-1 text-sm rounded-xl px-3 py-2 outline-none disabled:opacity-50"
                style={{
                  border: "1.5px solid oklch(0.88 0.012 70)",
                  background: "oklch(0.978 0.008 80)",
                  fontSize: "16px", // prevent iOS zoom
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.72 0.18 50)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px oklch(0.72 0.18 50 / 0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "oklch(0.88 0.012 70)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => handleSend(inputText)}
                disabled={!inputText.trim() || isTyping}
                data-ocid="chatbot.submit_button"
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity disabled:opacity-40 active:scale-95"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.45 0.22 275))",
                }}
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Button ───────────────────────────────────────────────── */}
      <div className="fixed bottom-[88px] right-4 md:bottom-6 md:right-6 z-[60]">
        {/* Tooltip */}
        <div className="group relative">
          <AnimatePresence>
            {!isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-full right-0 mb-2 pointer-events-none hidden group-hover:block"
              >
                <div className="bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                  Chat with Shyama
                  <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-800" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => {
              if (isOpen) {
                handleClose();
              } else {
                setIsOpen(true);
              }
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            title="Chat with Shyama — BillKaro Assistant"
            data-ocid="chatbot.open_modal_button"
            className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.45 0.22 275))",
              boxShadow:
                "0 8px 32px -4px oklch(0.72 0.18 50 / 0.45), 0 2px 8px -2px oklch(0.45 0.22 275 / 0.3)",
            }}
          >
            {/* Pulsing online indicator */}
            {!isOpen && (
              <span className="absolute -top-0.5 -right-0.5">
                <span className="absolute inline-flex w-3.5 h-3.5 rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white block" />
              </span>
            )}

            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <MessageCircle
                className="w-6 h-6 text-white"
                fill="rgba(255,255,255,0.25)"
              />
            )}
          </motion.button>
        </div>
      </div>
    </>
  );
}
