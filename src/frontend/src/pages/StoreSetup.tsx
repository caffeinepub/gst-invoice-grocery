import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check,
  Copy,
  Edit2,
  ImagePlus,
  Loader2,
  Save,
  Store,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
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
      {/* Principal ID Card */}
      {principal && (
        <Card className="border-saffron/20 bg-saffron-light/40">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <div>
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
                    data-ocid="store.toggle"
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
            </div>
          </CardContent>
        </Card>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                data-ocid="store.edit_button"
              >
                <Edit2 className="w-4 h-4 mr-1" /> Edit
              </Button>
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
    </motion.div>
  );
}
