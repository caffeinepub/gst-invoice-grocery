import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  ImagePlus,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  Save,
  Shield,
  Store,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ManagerPinDialog from "../components/ManagerPinDialog";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  SECURITY_QUESTIONS,
  clearSecurityQuestion,
  getManagerPin,
  getSecurityQuestion,
  hasManagerPin,
  hasSecurityQuestion,
  setSecurityQuestion as saveSecurityQuestion,
  setManagerPin,
  verifySecurityAnswer,
} from "../hooks/useManagerMode";
import {
  useGetStore,
  useRegisterStore,
  useUpdateStore,
} from "../hooks/useQueries";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
];

export default function StoreSetup() {
  const { data: store, isLoading } = useGetStore();
  const { identity } = useInternetIdentity();
  const registerMutation = useRegisterStore();
  const updateMutation = useUpdateStore();
  const [editing, setEditing] = useState(false);
  const [principalCopied, setPrincipalCopied] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(
    () => localStorage.getItem("store_logo") ?? "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    gstin: "",
    fssai: "",
    phone: "",
    state: "",
  });

  // ── PIN management state ─────────────────────────────────────────────────
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinHasBeenSet, setPinHasBeenSet] = useState(() => hasManagerPin());
  const [pinForm, setPinForm] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [pinError, setPinError] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [principalRevealed, setPrincipalRevealed] = useState(false);
  const [principalPinOpen, setPrincipalPinOpen] = useState(false);
  const [editPinOpen, setEditPinOpen] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotPinPhone, setForgotPinPhone] = useState("");
  const [forgotPinError, setForgotPinError] = useState("");
  const [forgotPinSuccess, setForgotPinSuccess] = useState(false);
  // Security question recovery
  const [forgotMethod, setForgotMethod] = useState<"phone" | "question">(
    "phone",
  );
  // forgotQuestion removed - not needed, security question is fetched via getSecurityQuestion()
  const [forgotAnswer, setForgotAnswer] = useState("");
  // Security question setup in PIN dialog
  const [securityQuestion, setSecurityQuestion] = useState(
    () => getSecurityQuestion() ?? "",
  );
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [hasSecQ, setHasSecQ] = useState(() => hasSecurityQuestion());

  const principal = identity?.getPrincipal().toString() ?? "";

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name,
        address: store.address,
        gstin: store.gstin,
        fssai: store.fssai,
        phone: store.phone,
        state: store.state,
      });
    }
  }, [store]);

  const isNew = !store;
  const isPending = registerMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isNew) {
        await registerMutation.mutateAsync(form);
        toast.success("Store registered successfully!");
      } else {
        await updateMutation.mutateAsync(form);
        toast.success("Store updated successfully!");
        setEditing(false);
      }
    } catch {
      toast.error("Failed to save store. Please try again.");
    }
  };

  const handleCopyPrincipal = async () => {
    if (!principal) return;
    await navigator.clipboard.writeText(principal);
    setPrincipalCopied(true);
    setTimeout(() => setPrincipalCopied(false), 1800);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      localStorage.setItem("store_logo", dataUrl);
      setLogoUrl(dataUrl);
      toast.success("Logo saved for invoice printing!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    localStorage.removeItem("store_logo");
    setLogoUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("Logo removed.");
  };

  // ── PIN save handler ─────────────────────────────────────────────────────
  const handleSavePin = () => {
    setPinError("");
    const { currentPin, newPin, confirmPin } = pinForm;

    // If changing existing PIN, verify current first
    if (pinHasBeenSet) {
      const stored = getManagerPin();
      if (currentPin !== stored) {
        setPinError("Current PIN is incorrect.");
        return;
      }
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinError("New PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PINs do not match.");
      return;
    }

    // Validate security question if being set for the first time or changed
    if (securityAnswer.trim() && !securityQuestion) {
      setPinError("Please select a security question.");
      return;
    }

    setPinSaving(true);
    setTimeout(() => {
      setManagerPin(newPin);
      // Save security question if provided
      if (securityQuestion && securityAnswer.trim()) {
        saveSecurityQuestion(securityQuestion, securityAnswer.trim());
        setHasSecQ(true);
        setSecurityAnswer("");
      }
      setPinHasBeenSet(true);
      setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
      setPinError("");
      setPinSaving(false);
      setPinDialogOpen(false);
      toast.success("Manager PIN saved!");
    }, 400);
  };

  const handleForgotPin = () => {
    setForgotPinError("");

    if (forgotMethod === "phone") {
      const phone = forgotPinPhone.trim().replace(/\s/g, "");
      if (!phone) {
        setForgotPinError("Please enter your registered phone number.");
        return;
      }
      const storePhone = (store?.phone ?? "").trim().replace(/\s/g, "");
      if (!storePhone) {
        setForgotPinError(
          "No phone number found in store profile. Please contact admin.",
        );
        return;
      }
      const normalize = (p: string) => p.replace(/^(\+91|91)/, "").slice(-10);
      if (normalize(phone) !== normalize(storePhone)) {
        setForgotPinError(
          "Phone number does not match. Enter the number saved in Store Setup.",
        );
        return;
      }
    } else {
      // Security question recovery
      if (!forgotAnswer.trim()) {
        setForgotPinError("Please enter your answer.");
        return;
      }
      if (!verifySecurityAnswer(forgotAnswer)) {
        setForgotPinError("Answer is incorrect. Please try again.");
        return;
      }
    }

    localStorage.removeItem("manager_pin");
    sessionStorage.removeItem("manager_mode_active");
    setPinHasBeenSet(false);
    setForgotPinSuccess(true);
    setForgotPinPhone("");
    setForgotAnswer("");
    toast.success("Manager PIN has been reset. Please set a new PIN.");
  };

  const isReadOnly = !!store && !editing;

  const field = (
    id: keyof typeof form,
    label: string,
    placeholder: string,
    required = false,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        value={form[id]}
        onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
        placeholder={placeholder}
        readOnly={isReadOnly}
        className={isReadOnly ? "bg-muted cursor-default" : "bg-card"}
        data-ocid={`store.${id}_input` as string}
      />
    </div>
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-ocid="store.loading_state"
      >
        <Loader2 className="w-8 h-8 animate-spin text-saffron" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-4"
      data-ocid="store.section"
    >
      {/* Principal ID Card — gated behind manager PIN */}
      {principal && (
        <>
          {!principalRevealed ? (
            <Card className="border-saffron/20 bg-saffron-light/40">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-saffron-dark" />
                    <p className="text-xs font-semibold text-saffron-dark uppercase tracking-wide">
                      Store Principal ID
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!hasManagerPin()) {
                        setPrincipalRevealed(true);
                      } else {
                        setPrincipalPinOpen(true);
                      }
                    }}
                    className="border-saffron/40 text-saffron-dark hover:bg-saffron/10 text-xs h-7"
                    data-ocid="store.toggle"
                  >
                    <Lock className="w-3 h-3 mr-1" /> Reveal (Manager Only)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-saffron/20 bg-saffron-light/40">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-saffron-dark uppercase tracking-wide mb-1">
                      Your Store Principal ID
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-foreground bg-white/70 px-2 py-1 rounded break-all leading-relaxed">
                        {principal}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyPrincipal}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-saffron/20 transition-colors"
                        title="Copy Principal ID"
                      >
                        {principalCopied ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-saffron-dark" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrincipalRevealed(false)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-saffron/20 transition-colors"
                    title="Lock Principal ID"
                  >
                    <Lock className="w-3.5 h-3.5 text-saffron-dark" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
          <ManagerPinDialog
            open={principalPinOpen}
            onOpenChange={setPrincipalPinOpen}
            onSuccess={() => {
              setPrincipalRevealed(true);
              setPrincipalPinOpen(false);
            }}
            title="Manager PIN Required to View Principal ID"
          />
        </>
      )}

      <Card className="shadow-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-saffron-light flex items-center justify-center">
                <Store className="w-5 h-5 text-saffron" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {isNew ? "Register Your Store" : "Store Configuration"}
                </CardTitle>
                <CardDescription>
                  {isNew
                    ? "Set up your grocery store to start billing"
                    : "Manage your store profile and GST details"}
                </CardDescription>
              </div>
            </div>
            {!isNew && !editing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!hasManagerPin()) {
                      setEditing(true);
                    } else {
                      setEditPinOpen(true);
                    }
                  }}
                  data-ocid="store.edit_button"
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <ManagerPinDialog
                  open={editPinOpen}
                  onOpenChange={setEditPinOpen}
                  onSuccess={() => {
                    setEditing(true);
                    setEditPinOpen(false);
                  }}
                  title="Manager PIN Required to Edit Store"
                />
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("name", "Store Name", "e.g. Sharma General Store", true)}
              {field("phone", "Phone Number", "e.g. 9876543210", true)}
              {field("gstin", "GSTIN", "e.g. 22AAAAA0000A1Z5", true)}
              {field("fssai", "FSSAI License No.", "e.g. 10123456789012")}
            </div>
            {field("address", "Address", "Shop No., Street, City, PIN", true)}

            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-sm font-medium">
                State <span className="text-destructive">*</span>
              </Label>
              {isReadOnly ? (
                <Input
                  value={form.state}
                  readOnly
                  className="bg-muted cursor-default"
                />
              ) : (
                <select
                  id="state"
                  value={form.state}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, state: e.target.value }))
                  }
                  required
                  data-ocid="store.select"
                  className="w-full h-9 px-3 rounded-md border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Store Logo Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Store Logo{" "}
                <span className="text-muted-foreground font-normal">
                  (for invoice printing)
                </span>
              </Label>
              {logoUrl ? (
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30">
                  <img
                    src={logoUrl}
                    alt="Store Logo Preview"
                    className="max-h-20 max-w-[120px] object-contain rounded"
                  />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      Logo saved for invoices
                    </p>
                    {!isReadOnly && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          data-ocid="store.upload_button"
                        >
                          <ImagePlus className="w-3.5 h-3.5 mr-1" /> Change
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
                          data-ocid="store.delete_button"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 border-dashed transition-colors text-left ${
                    isReadOnly
                      ? "border-border bg-muted/20 cursor-default opacity-70"
                      : "border-border hover:border-saffron/50 cursor-pointer bg-muted/10"
                  }`}
                  data-ocid="store.dropzone"
                >
                  <ImagePlus className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isReadOnly ? "No logo uploaded" : "Upload store logo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isReadOnly
                        ? "Enable edit to upload a logo"
                        : "PNG, JPG or SVG — shown on printed invoices"}
                    </p>
                  </div>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={isReadOnly}
                className="hidden"
              />
            </div>

            {(isNew || editing) && (
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-saffron hover:bg-saffron-dark text-white"
                  data-ocid="store.submit_button"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isPending
                    ? "Saving..."
                    : isNew
                      ? "Register Store"
                      : "Save Changes"}
                </Button>
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      if (store) {
                        setForm({
                          name: store.name,
                          address: store.address,
                          gstin: store.gstin,
                          fssai: store.fssai,
                          phone: store.phone,
                          state: store.state,
                        });
                      }
                    }}
                    data-ocid="store.cancel_button"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Manager PIN Section — outside the form */}
      <Card className="shadow-card border-border">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Manager PIN</CardTitle>
              <CardDescription className="text-sm">
                Protect edit and delete actions with a 4-digit PIN
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  pinHasBeenSet ? "bg-green-500" : "bg-red-400"
                }`}
              />
              <span className="text-sm text-foreground">
                {pinHasBeenSet ? "Manager PIN is set" : "Manager PIN not set"}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
                setPinError("");
                setPinDialogOpen(true);
              }}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              data-ocid="store.open_modal_button"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              {pinHasBeenSet ? "Change PIN" : "Set PIN"}
            </Button>
          </div>
          {!pinHasBeenSet && (
            <p className="text-xs text-muted-foreground mt-3">
              Without a PIN, anyone can edit and delete invoices. Setting a PIN
              adds manager-level protection.
            </p>
          )}

          {/* Forgot PIN recovery */}
          {pinHasBeenSet && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPin(!showForgotPin);
                  setForgotPinError("");
                  setForgotPinSuccess(false);
                  setForgotPinPhone("");
                  setForgotAnswer("");
                }}
                className="text-xs text-amber-600 hover:text-amber-700 underline underline-offset-2 flex items-center gap-1"
                data-ocid="store.link"
              >
                <KeyRound className="w-3 h-3" />
                Forgot PIN? Reset here
              </button>

              {showForgotPin && !forgotPinSuccess && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                  {/* Method toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMethod("phone");
                        setForgotPinError("");
                      }}
                      className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors ${forgotMethod === "phone" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"}`}
                    >
                      📞 Via Phone Number
                    </button>
                    {hasSecQ && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMethod("question");
                          setForgotPinError("");
                        }}
                        className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors ${forgotMethod === "question" ? "bg-amber-600 text-white border-amber-600" : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"}`}
                      >
                        ❓ Via Secret Question
                      </button>
                    )}
                  </div>

                  {forgotMethod === "phone" ? (
                    <>
                      <p className="text-xs text-amber-800">
                        Enter your store&apos;s registered phone number to
                        verify and reset the Manager PIN.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="tel"
                          inputMode="numeric"
                          value={forgotPinPhone}
                          onChange={(e) => {
                            setForgotPinError("");
                            setForgotPinPhone(e.target.value);
                          }}
                          placeholder="e.g. 9876543210"
                          className="h-9 text-sm flex-1"
                          data-ocid="store.input"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleForgotPin}
                          disabled={!forgotPinPhone.trim()}
                          className="bg-amber-600 hover:bg-amber-700 text-white h-9"
                          data-ocid="store.confirm_button"
                        >
                          <Phone className="w-3.5 h-3.5 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-amber-800 font-medium">
                        {getSecurityQuestion()}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={forgotAnswer}
                          onChange={(e) => {
                            setForgotPinError("");
                            setForgotAnswer(e.target.value);
                          }}
                          placeholder="Your answer..."
                          className="h-9 text-sm flex-1"
                          data-ocid="store.input"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleForgotPin}
                          disabled={!forgotAnswer.trim()}
                          className="bg-amber-600 hover:bg-amber-700 text-white h-9"
                          data-ocid="store.confirm_button"
                        >
                          <KeyRound className="w-3.5 h-3.5 mr-1" />
                          Verify
                        </Button>
                      </div>
                    </>
                  )}

                  {forgotPinError && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="store.error_state"
                    >
                      {forgotPinError}
                    </p>
                  )}
                </div>
              )}

              {showForgotPin && forgotPinSuccess && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800">
                    PIN has been reset. Use the <strong>Set PIN</strong> button
                    above to create a new PIN.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PIN Setup Dialog */}
      <Dialog
        open={pinDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPinDialogOpen(false);
            setPinError("");
          }
        }}
      >
        <DialogContent className="max-w-sm" data-ocid="store.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              {pinHasBeenSet ? "Change Manager PIN" : "Set Manager PIN"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {pinHasBeenSet && (
              <div className="space-y-1.5">
                <Label htmlFor="current-pin">Current PIN</Label>
                <Input
                  id="current-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinForm.currentPin}
                  onChange={(e) =>
                    setPinForm((p) => ({
                      ...p,
                      currentPin: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  placeholder="Enter current PIN"
                  className="text-center text-xl tracking-[0.5em] h-11"
                  data-ocid="store.input"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-pin">New PIN (4 digits)</Label>
              <Input
                id="new-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinForm.newPin}
                onChange={(e) =>
                  setPinForm((p) => ({
                    ...p,
                    newPin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                placeholder="● ● ● ●"
                className="text-center text-xl tracking-[0.5em] h-11"
                autoFocus={!pinHasBeenSet}
                data-ocid="store.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pin">Confirm New PIN</Label>
              <Input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pinForm.confirmPin}
                onChange={(e) =>
                  setPinForm((p) => ({
                    ...p,
                    confirmPin: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePin();
                }}
                placeholder="● ● ● ●"
                className="text-center text-xl tracking-[0.5em] h-11"
                data-ocid="store.input"
              />
            </div>

            {/* Security question setup */}
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-amber-700">
                  Security Question
                </span>{" "}
                — Set this for PIN recovery if you forget your PIN (optional but
                recommended).
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Choose a question</Label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Select a question --</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
              {securityQuestion && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Your answer</Label>
                  <Input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter your answer"
                    className="h-9 text-sm"
                    data-ocid="store.input"
                  />
                </div>
              )}
              {hasSecQ && !securityAnswer && (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Security question already set. Fill in answer only to change
                  it.
                </p>
              )}
            </div>

            {pinError && (
              <p
                className="text-sm text-destructive"
                data-ocid="store.error_state"
              >
                {pinError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPinDialogOpen(false);
                setPinError("");
              }}
              data-ocid="store.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePin}
              disabled={
                pinSaving ||
                pinForm.newPin.length !== 4 ||
                pinForm.confirmPin.length !== 4
              }
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-ocid="store.save_button"
            >
              {pinSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
