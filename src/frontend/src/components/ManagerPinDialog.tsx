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
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import {
  hasManagerPin,
  lockManagerMode,
  unlockManagerMode,
} from "../hooks/useManagerMode";
import { useGetStore } from "../hooks/useQueries";

interface ManagerPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
}

type View = "pin" | "forgot" | "reset-success";

export default function ManagerPinDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Manager PIN Required",
}: ManagerPinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("pin");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryError, setRecoveryError] = useState("");

  const { data: store } = useGetStore();
  const pinSet = hasManagerPin();

  function handleClose() {
    setPin("");
    setError("");
    setView("pin");
    setRecoveryPhone("");
    setRecoveryError("");
    onOpenChange(false);
  }

  function handleUnlock() {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("Please enter a 4-digit PIN");
      return;
    }
    const ok = unlockManagerMode(pin);
    if (ok) {
      setPin("");
      setError("");
      setView("pin");
      onSuccess();
      onOpenChange(false);
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }
  }

  function handleRecovery() {
    setRecoveryError("");
    const phone = recoveryPhone.trim().replace(/\s/g, "");
    if (!phone) {
      setRecoveryError("Please enter your registered phone number.");
      return;
    }
    const storePhone = (store?.phone ?? "").trim().replace(/\s/g, "");
    if (!storePhone) {
      setRecoveryError(
        "No phone number found in store profile. Please contact admin: +91 7023295769",
      );
      return;
    }
    // Normalize both: strip +91 or 91 prefix, compare last 10 digits
    const normalize = (p: string) => p.replace(/^(\+91|91)/, "").slice(-10);
    if (normalize(phone) !== normalize(storePhone)) {
      setRecoveryError(
        "Phone number does not match. Enter the number saved in Store Setup.",
      );
      return;
    }
    // Reset PIN
    localStorage.removeItem("manager_pin");
    lockManagerMode();
    sessionStorage.removeItem("manager_mode_active");
    setView("reset-success");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-sm" data-ocid="manager.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              {view === "forgot" ? (
                <Phone className="w-4 h-4 text-amber-600" />
              ) : view === "reset-success" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Lock className="w-4 h-4 text-amber-600" />
              )}
            </div>
            {view === "forgot"
              ? "Reset Manager PIN"
              : view === "reset-success"
                ? "PIN Reset Successful"
                : title}
          </DialogTitle>
        </DialogHeader>

        {/* ── PIN NOT SET ─────────────────────────────────────────── */}
        {view === "pin" && !pinSet && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Manager PIN not set</p>
              <p className="text-xs mt-0.5">
                Go to <strong>Store Setup</strong> to set a Manager PIN first.
              </p>
            </div>
          </div>
        )}

        {/* ── ENTER PIN ───────────────────────────────────────────── */}
        {view === "pin" && pinSet && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 4-digit Manager PIN to proceed.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="manager-pin">Manager PIN</Label>
              <Input
                id="manager-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setError("");
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUnlock();
                }}
                placeholder="● ● ● ●"
                className="text-center text-xl tracking-[0.5em] h-12"
                autoFocus
                data-ocid="manager.input"
              />
            </div>
            {error && (
              <div
                className="flex items-center gap-2 text-sm text-destructive"
                data-ocid="manager.error_state"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            {/* Forgot PIN link */}
            <button
              type="button"
              onClick={() => {
                setError("");
                setPin("");
                setRecoveryPhone("");
                setRecoveryError("");
                setView("forgot");
              }}
              className="text-xs text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors"
              data-ocid="manager.link"
            >
              <KeyRound className="inline w-3 h-3 mr-1" />
              Forgot PIN? Reset using phone number
            </button>
          </div>
        )}

        {/* ── FORGOT PIN / RECOVERY ───────────────────────────────── */}
        {view === "forgot" && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <p className="font-medium mb-1">Verify your identity</p>
              <p className="text-xs">
                Enter the phone number saved in your Store Setup to reset your
                Manager PIN.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recovery-phone">Registered Phone Number</Label>
              <Input
                id="recovery-phone"
                type="tel"
                inputMode="numeric"
                value={recoveryPhone}
                onChange={(e) => {
                  setRecoveryError("");
                  setRecoveryPhone(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRecovery();
                }}
                placeholder="e.g. 9876543210"
                className="h-11"
                autoFocus
                data-ocid="manager.input"
              />
            </div>
            {recoveryError && (
              <div
                className="flex items-start gap-2 text-sm text-destructive"
                data-ocid="manager.error_state"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{recoveryError}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              If you don&apos;t remember your phone number, contact admin:{" "}
              <a
                href="https://wa.me/917023295769"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline"
              >
                WhatsApp +91 7023295769
              </a>
            </p>
          </div>
        )}

        {/* ── RESET SUCCESS ───────────────────────────────────────── */}
        {view === "reset-success" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium">PIN has been reset.</p>
                <p className="text-xs mt-0.5">
                  Please go to{" "}
                  <strong>Store Setup → Manager PIN → Set PIN</strong> to create
                  a new PIN.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {view === "pin" && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                data-ocid="manager.cancel_button"
              >
                Cancel
              </Button>
              {pinSet && (
                <Button
                  onClick={handleUnlock}
                  disabled={pin.length !== 4}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  data-ocid="manager.confirm_button"
                >
                  Unlock
                </Button>
              )}
            </>
          )}
          {view === "forgot" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setView("pin");
                  setRecoveryError("");
                  setRecoveryPhone("");
                }}
                data-ocid="manager.cancel_button"
              >
                Back
              </Button>
              <Button
                onClick={handleRecovery}
                disabled={!recoveryPhone.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                data-ocid="manager.confirm_button"
              >
                <Phone className="w-4 h-4 mr-1" />
                Verify & Reset PIN
              </Button>
            </>
          )}
          {view === "reset-success" && (
            <Button
              onClick={handleClose}
              className="bg-green-600 hover:bg-green-700 text-white w-full"
              data-ocid="manager.confirm_button"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Got it, Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
