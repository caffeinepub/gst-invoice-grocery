import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LineItem, Product, UserProfile } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

const FIXED_ADMIN_PRINCIPALS = [
  "f3axn-iphna-qs373-xc2my-2epru-xspto-xluny-flo3l-4nqhb-j2e4r-mqe",
];

const DATA_QUERY_DEFAULTS = {
  staleTime: 30000,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: false,
  retry: 3,
  retryDelay: 2000,
};

export function useGetStore() {
  const { actor, isFetching: isLoading } = useActor();
  return useQuery({
    queryKey: ["store"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return await actor.getStore();
    },
    enabled: !!actor && !isLoading,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetStoreSummary() {
  const { actor, isFetching: isLoading } = useActor();
  return useQuery({
    queryKey: ["storeSummary"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.getStoreSummary();
      return result;
    },
    enabled: !!actor && !isLoading,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetProducts() {
  const { actor, isFetching: isLoading } = useActor();
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return await actor.getProducts();
    },
    enabled: !!actor && !isLoading,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetInvoices() {
  const { actor, isFetching: isLoading } = useActor();
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return await actor.getInvoices();
    },
    enabled: !!actor && !isLoading,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetNextInvoiceNumber() {
  const { actor, isFetching: isLoading } = useActor();
  return useQuery({
    queryKey: ["nextInvoiceNumber"],
    queryFn: async () => {
      if (!actor) return 1n;
      try {
        return await actor.getNextInvoiceNumber();
      } catch {
        return 1n;
      }
    },
    enabled: !!actor && !isLoading,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useRegisterStore() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      address: string;
      gstin: string;
      fssai: string;
      phone: string;
      state: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.registerStore(
        data.name,
        data.address,
        data.gstin,
        data.fssai,
        data.phone,
        data.state,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store"] });
      qc.invalidateQueries({ queryKey: ["storeSummary"] });
    },
  });
}

export function useUpdateStore() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      address: string;
      gstin: string;
      fssai: string;
      phone: string;
      state: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateStore(
        data.name,
        data.address,
        data.gstin,
        data.fssai,
        data.phone,
        data.state,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store"] });
      qc.invalidateQueries({ queryKey: ["storeSummary"] });
    },
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      hsnCode: string;
      sku: string;
      price: bigint;
      gstRate: bigint;
      stockQty: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addProduct(
        data.name,
        data.hsnCode,
        data.sku,
        data.price,
        data.gstRate,
        data.stockQty,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      sku: string;
      name: string;
      hsnCode: string;
      price: bigint;
      gstRate: bigint;
      stockQty: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateProduct(
        data.sku,
        data.name,
        data.hsnCode,
        data.price,
        data.gstRate,
        data.stockQty,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sku: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteProduct(sku);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useCreateInvoice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      customerName: string;
      customerGstin: string;
      isIgst: boolean;
      lineItems: LineItem[];
    }) => {
      if (!actor) throw new Error("Not connected");
      const invoice = await actor.createInvoice(
        data.customerName,
        data.customerGstin,
        data.isIgst,
        data.lineItems,
      );
      // Deduct stock for each line item
      const cachedProducts = qc.getQueryData<Product[]>(["products"]) || [];
      for (const item of data.lineItems) {
        const product = cachedProducts.find((p) => p.sku === item.productId);
        if (product) {
          const newQty = BigInt(
            Math.max(0, Number(product.stockQty) - Number(item.qty)),
          );
          try {
            await actor.updateProductStock(item.productId, newQty);
          } catch {
            // stock update failure is non-critical
          }
        }
      }
      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["storeSummary"] });
      qc.invalidateQueries({ queryKey: ["nextInvoiceNumber"] });
    },
  });
}

export function useDeleteInvoice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceNumber: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteInvoice(invoiceNumber);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["storeSummary"] });
    },
  });
}

export function useUpdateInvoice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      invoiceNumber: bigint;
      customerName: string;
      customerGstin: string;
      isIgst: boolean;
      lineItems: LineItem[];
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateInvoice(
        data.invoiceNumber,
        data.customerName,
        data.customerGstin,
        data.isIgst,
        data.lineItems,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["storeSummary"] });
    },
  });
}

export function useGetCallerProfile() {
  const { actor, isFetching: isLoading } = useActor();
  return useQuery({
    queryKey: ["callerProfile"],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!actor) return null;
      try {
        return await actor.getCallerUserProfile();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isLoading,
    ...DATA_QUERY_DEFAULTS,
  });
}

// FIX: No longer silently catch and return 0n on error.
// Let React Query's retry: 3 handle transient failures.
// This prevents showing "Account Inactive" on a new device when a
// network blip or cold-start error causes getMyCredits to fail transiently.
export function useGetMyCredits() {
  const { actor, isFetching: isLoading } = useActor();
  return useQuery({
    queryKey: ["myCredits"],
    queryFn: async (): Promise<bigint> => {
      if (!actor) throw new Error("Actor not ready");
      return await actor.getMyCredits();
    },
    enabled: !!actor && !isLoading,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useIsCallerAdmin() {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const principal = identity?.getPrincipal().toString() ?? "";

  return useQuery({
    queryKey: ["isCallerAdmin", principal],
    queryFn: async (): Promise<boolean> => {
      if (FIXED_ADMIN_PRINCIPALS.includes(principal)) return true;
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!principal,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetAllStoresAdmin() {
  const { actor, isFetching: isLoading } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "";

  return useQuery({
    queryKey: ["allStoresAdmin", principal],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return await actor.getAllStoresAdmin();
    },
    enabled: !!actor && !isLoading && !!principal,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useAddCreditsAdmin() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { storeId: unknown; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addCreditsAdmin(
        data.storeId as Parameters<typeof actor.addCreditsAdmin>[0],
        data.amount,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allStoresAdmin", principal] });
      qc.invalidateQueries({ queryKey: ["myCredits"] });
    },
  });
}

export function useRefreshAllData() {
  const qc = useQueryClient();

  return async () => {
    await qc.invalidateQueries();
    await qc.refetchQueries();
  };
}
