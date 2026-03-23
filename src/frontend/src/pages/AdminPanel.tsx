import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Principal } from "@dfinity/principal";
import {
  AlertTriangle,
  Check,
  Copy,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAddCreditsAdmin,
  useGetAllStoresAdmin,
  useIsCallerAdmin,
  useRefreshAllData,
} from "../hooks/useQueries";

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 p-1 rounded hover:bg-muted transition-colors"
      title="Copy principal ID"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("91") && p.length > 10) p = p.slice(2);
  if (p.startsWith("0")) p = p.slice(1);
  return p;
}

function WhatsAppButton({ phone }: { phone: string }) {
  const hasPhone = !!phone;
  const cleaned = normalizePhone(phone);
  const waUrl = `https://wa.me/91${cleaned}?text=Dear%20Store%20Owner%2C%20your%20recharge%20is%20completed.%20Your%20account%20is%20now%20active.`;

  if (!hasPhone) {
    return (
      <button
        type="button"
        disabled
        title="No phone number"
        className="p-1.5 rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
      >
        <MessageCircle className="w-4 h-4" />
      </button>
    );
  }

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Send WhatsApp notification"
      className="inline-flex items-center justify-center p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
      data-ocid="admin.secondary_button"
    >
      <MessageCircle className="w-4 h-4" />
    </a>
  );
}

function CreditBadge({ credits }: { credits: bigint }) {
  const n = Number(credits);
  if (n === 0)
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 font-semibold">
        {n} credits
      </Badge>
    );
  if (n <= 10)
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 font-semibold">
        {n} credits
      </Badge>
    );
  return (
    <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold">
      {n} credits
    </Badge>
  );
}

function AddCreditsForm({
  storeName,
  storeId,
  onClose,
}: {
  storeName: string;
  storeId: any;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const mutation = useAddCreditsAdmin();

  const handleAdd = async () => {
    const n = Number.parseInt(amount, 10);
    if (!n || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await mutation.mutateAsync({ storeId, amount: BigInt(n) });
      toast.success(`Added ${n} credits to ${storeName}`);
      onClose();
    } catch {
      toast.error("Failed to add credits");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <Input
        type="number"
        min="1"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 h-8 text-sm"
        data-ocid="admin.input"
      />
      <Button
        size="sm"
        onClick={handleAdd}
        disabled={mutation.isPending}
        className="h-8 bg-saffron hover:bg-saffron-dark text-white text-xs"
        data-ocid="admin.confirm_button"
      >
        {mutation.isPending ? "Adding..." : "Add"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onClose}
        className="h-8 text-xs"
        data-ocid="admin.cancel_button"
      >
        Cancel
      </Button>
    </div>
  );
}

function ActivateNewAccount() {
  const [principalText, setPrincipalText] = useState("");
  const [credits, setCredits] = useState("10");
  const mutation = useAddCreditsAdmin();

  const handleActivate = async () => {
    const trimmed = principalText.trim();
    if (!trimmed) {
      toast.error("Paste the customer's Principal ID");
      return;
    }
    const n = Number.parseInt(credits, 10);
    if (!n || n <= 0) {
      toast.error("Enter a valid credit amount");
      return;
    }
    let principalObj: Principal;
    try {
      principalObj = Principal.fromText(trimmed);
    } catch {
      toast.error("Invalid Principal ID format");
      return;
    }
    try {
      await mutation.mutateAsync({ storeId: principalObj, amount: BigInt(n) });
      toast.success(`Account activated with ${n} credits`);
      setPrincipalText("");
      setCredits("10");
    } catch (e) {
      toast.error(`Failed to activate: ${String(e)}`);
    }
  };

  return (
    <Card className="shadow-card border-indigo/20 bg-indigo/5">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo/15 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-indigo" />
          </div>
          <div>
            <CardTitle className="text-base text-indigo">
              Activate New Account
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paste the Principal ID from a new customer's "Account Inactive"
              screen
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-foreground mb-1">
            Customer Principal ID
          </p>
          <Input
            placeholder="Paste principal ID here (e.g. abc12-xyz...)"
            value={principalText}
            onChange={(e) => setPrincipalText(e.target.value)}
            className="font-mono text-xs h-9"
            data-ocid="admin.activate_principal_input"
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground mb-1">
              Credits to Add
            </p>
            <Input
              type="number"
              min="1"
              placeholder="10"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="h-9 text-sm"
              data-ocid="admin.activate_credits_input"
            />
          </div>
          <Button
            onClick={handleActivate}
            disabled={mutation.isPending || !principalText.trim()}
            className="bg-indigo hover:bg-indigo/90 text-white h-9 px-5 font-semibold text-sm"
            data-ocid="admin.activate_button"
          >
            {mutation.isPending ? "Activating..." : "Activate"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPanel() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const {
    data: stores = [],
    isLoading: storesLoading,
    error: storesError,
  } = useGetAllStoresAdmin();
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshAllData = useRefreshAllData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSearchInput = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(searchInputRef.current?.value ?? "");
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredStores = stores.filter((store) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (store.storeName || "").toLowerCase().includes(q) ||
      (store.phone || "").toLowerCase().includes(q) ||
      (store.address || "").toLowerCase().includes(q) ||
      (store.gstin || "").toLowerCase().includes(q) ||
      (store.state || "").toLowerCase().includes(q) ||
      (store.fssai || "").toLowerCase().includes(q)
    );
  });

  // Only show full-page skeleton on the very first load (no cached data yet)
  if (isAdminLoading) {
    return (
      <div className="space-y-4" data-ocid="admin.loading_state">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
        data-ocid="admin.error_state"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Access Denied
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          You don't have admin privileges to view this page.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6" data-ocid="admin.section">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo flex items-center justify-center shadow">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Manage store credits and accounts
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-indigo/10 text-indigo border-indigo/20 font-semibold">
            {stores.length} Stores
          </Badge>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || storesLoading}
            className="w-8 h-8 rounded-lg bg-indigo/10 hover:bg-indigo/20 flex items-center justify-center transition-colors disabled:opacity-50"
            title="Refresh store list"
            data-ocid="admin.toggle"
          >
            <RefreshCw
              className={`w-4 h-4 text-indigo ${
                isRefreshing || storesLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Activate New Account */}
      <ActivateNewAccount />

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          autoComplete="off"
          placeholder="Search by store name, phone, address, or GSTIN..."
          onInput={handleSearchInput}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-ocid="admin.search_input"
        />
      </div>

      {/* Visible error box for debugging */}
      {storesError && (
        <ErrorBox
          title="Data Fetch Error (getAllStoresAdmin)"
          message={String(storesError)}
        />
      )}

      {/* Store List */}
      {storesLoading && stores.length === 0 ? (
        <div className="space-y-3" data-ocid="admin.loading_state">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground text-sm"
          data-ocid="admin.empty_state"
        >
          <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
          {searchQuery
            ? "No stores match your search."
            : "No stores registered yet."}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block" data-ocid="admin.table">
            <Card className="shadow-card border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">#</TableHead>
                    <TableHead className="font-semibold">Store Name</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Address</TableHead>
                    <TableHead className="font-semibold">
                      Principal ID
                    </TableHead>
                    <TableHead className="font-semibold">Credits</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store, idx) => {
                    const storeKey = store.owner.toString();
                    const rowNum = idx + 1;
                    return (
                      <TableRow
                        key={storeKey}
                        data-ocid={`admin.row.${rowNum}` as string}
                      >
                        <TableCell className="text-muted-foreground text-sm">
                          {rowNum}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            {store.storeName || (
                              <span className="text-muted-foreground italic">
                                Unnamed
                              </span>
                            )}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              GSTIN: {store.gstin || "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {store.phone ? (
                              <a
                                href={`tel:${store.phone}`}
                                className="flex items-center gap-1 text-sm text-indigo hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {store.phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs italic flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" /> —
                              </span>
                            )}
                            <WhatsAppButton phone={store.phone || ""} />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <div className="flex items-start gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {store.address
                                ? `${store.address}${store.state ? `, ${store.state}` : ""}`
                                : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground max-w-[150px] truncate block">
                              {storeKey}
                            </code>
                            <CopyButton text={storeKey} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <CreditBadge credits={store.credits} />
                        </TableCell>
                        <TableCell>
                          {addingFor === storeKey ? (
                            <AddCreditsForm
                              storeName={store.storeName}
                              storeId={store.owner}
                              onClose={() => setAddingFor(null)}
                            />
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAddingFor(storeKey)}
                              className="h-8 text-xs border-saffron/40 text-saffron hover:bg-saffron hover:text-white"
                              data-ocid={
                                `admin.edit_button.${rowNum}` as string
                              }
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add Credits
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3" data-ocid="admin.list">
            {filteredStores.map((store, idx) => {
              const storeKey = store.owner.toString();
              const rowNum = idx + 1;
              return (
                <Card
                  key={storeKey}
                  className="shadow-card border-border"
                  data-ocid={`admin.item.${rowNum}` as string}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-saffron-light flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-saffron" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {store.storeName || (
                              <span className="text-muted-foreground italic font-normal">
                                Unnamed Store
                              </span>
                            )}
                          </CardTitle>
                        </div>
                      </div>
                      <CreditBadge credits={store.credits} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Always-visible store details */}
                    <div className="grid grid-cols-1 gap-1.5 bg-muted/40 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3.5 h-3.5 text-indigo flex-shrink-0" />
                        <span className="text-xs text-muted-foreground font-medium w-14">
                          Mobile:
                        </span>
                        {store.phone ? (
                          <a
                            href={`tel:${store.phone}`}
                            className="text-sm text-indigo hover:underline font-medium"
                          >
                            {store.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-xs text-muted-foreground mt-0.5">
                          🏢
                        </span>
                        <span className="text-xs text-muted-foreground font-medium w-14">
                          GSTIN:
                        </span>
                        <span className="text-xs font-mono text-foreground">
                          {store.gstin || "—"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-muted-foreground font-medium w-14">
                          Address:
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {store.address
                            ? `${store.address}${store.state ? `, ${store.state}` : ""}`
                            : "—"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Principal ID
                      </p>
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground flex-1 truncate block">
                          {storeKey}
                        </code>
                        <CopyButton text={storeKey} />
                      </div>
                    </div>

                    {addingFor === storeKey ? (
                      <AddCreditsForm
                        storeName={store.storeName}
                        storeId={store.owner}
                        onClose={() => setAddingFor(null)}
                      />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setAddingFor(storeKey)}
                        className="w-full bg-saffron hover:bg-saffron-dark text-white text-sm"
                        data-ocid={`admin.edit_button.${rowNum}` as string}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Credits
                      </Button>
                    )}

                    {/* WhatsApp Notify Button */}
                    {store.phone ? (
                      <a
                        href={`https://wa.me/91${normalizePhone(store.phone || "")}?text=Dear%20Store%20Owner%2C%20your%20recharge%20is%20completed.%20Your%20account%20is%20now%20active.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                        data-ocid={`admin.secondary_button.${rowNum}` as string}
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp Notify
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-gray-200 text-gray-400 text-sm font-medium cursor-not-allowed"
                        title="No phone number on file"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp Notify
                      </button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
