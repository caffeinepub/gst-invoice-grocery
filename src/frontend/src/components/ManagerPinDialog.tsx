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
import { AlertCircle, Lock, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { hasManagerPin, unlockManagerMode } from "../hooks/useManagerMode";

interface ManagerPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
}

export default function ManagerPinDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "Manager PIN Required",
}: ManagerPinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const pinSet = hasManagerPin();

  function handleClose() {
    setPin("");
    setError("");
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
      onSuccess();
      onOpenChange(false);
    } else {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    }
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
              <Lock className="w-4 h-4 text-amber-600" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        {!pinSet ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Manager PIN not set</p>
              <p className="text-xs mt-0.5">
                Go to <strong>Store Setup</strong> to set a Manager PIN first.
              </p>
            </div>
          </div>
        ) : (
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
          </div>
        )}

        <DialogFooter className="gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
