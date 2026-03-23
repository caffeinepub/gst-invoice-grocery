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
import { Check, Copy, Plus, ShieldCheck, Store } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAddCreditsAdmin,
  useGetAllStoresAdmin,
  useIsCallerAdmin,
} from "../hooks/useQueries";

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

export default function AdminPanel() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: stores = [], isLoading: storesLoading } =
    useGetAllStoresAdmin();
  const [addingFor, setAddingFor] = useState<string | null>(null);

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      data-ocid="admin.section"
    >
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
        <div className="ml-auto">
          <Badge className="bg-indigo/10 text-indigo border-indigo/20 font-semibold">
            {stores.length} Stores
          </Badge>
        </div>
      </div>

      {/* Desktop Table */}
      {storesLoading ? (
        <div className="space-y-3" data-ocid="admin.loading_state">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground text-sm"
          data-ocid="admin.empty_state"
        >
          <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No stores registered yet.
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
                    <TableHead className="font-semibold">
                      Principal ID
                    </TableHead>
                    <TableHead className="font-semibold">Credits</TableHead>
                    <TableHead className="font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store, idx) => {
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
                          {store.storeName || (
                            <span className="text-muted-foreground italic">
                              Unnamed
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground max-w-[200px] truncate block">
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
            {stores.map((store, idx) => {
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
                        <CardTitle className="text-base">
                          {store.storeName || (
                            <span className="text-muted-foreground italic font-normal">
                              Unnamed Store
                            </span>
                          )}
                        </CardTitle>
                      </div>
                      <CreditBadge credits={store.credits} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
