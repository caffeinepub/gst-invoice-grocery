import { Button } from "@/components/ui/button";
import { Check, Copy, ShieldOff } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface InactiveAccountProps {
  principal: string;
  onLogout: () => void;
}

export default function InactiveAccount({
  principal,
  onLogout,
}: InactiveAccountProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(principal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6"
      data-ocid="inactive.section"
    >
      {/* Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-destructive/10 blur-2xl scale-150" />
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-destructive flex items-center justify-center shadow-lg"
        >
          <ShieldOff className="w-12 h-12 text-white" />
        </motion.div>
      </div>

      {/* Text */}
      <h1 className="font-display text-3xl font-bold text-foreground mb-3 tracking-tight">
        Account Inactive
      </h1>
      <p className="text-muted-foreground max-w-sm mb-6 leading-relaxed">
        Your account has been deactivated. Please contact the admin to recharge
        your credits and resume using{" "}
        <span className="text-saffron font-semibold">BillKaro</span>.
      </p>

      {/* Contact info */}
      <div className="w-full max-w-sm bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6">
        <p className="text-xs font-semibold text-orange-700 mb-1 uppercase tracking-wide">
          Contact Admin
        </p>
        <p className="text-sm text-orange-800">
          WhatsApp:{" "}
          <a
            href="https://wa.me/917023295769"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            +91 7023295769
          </a>
        </p>
      </div>

      {/* Principal ID */}
      <div className="w-full max-w-sm mb-8">
        <p className="text-xs text-muted-foreground mb-2 font-medium">
          Share your Principal ID with the admin:
        </p>
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <code className="text-xs font-mono text-foreground flex-1 text-left break-all leading-relaxed">
            {principal}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-border transition-colors"
            data-ocid="inactive.toggle"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={onLogout}
        className="text-muted-foreground"
        data-ocid="inactive.secondary_button"
      >
        Logout
      </Button>
      <p className="mt-4 text-[10px] text-muted-foreground/60">
        Developed by Ankit Verma 7023295769
      </p>
    </motion.div>
  );
}
