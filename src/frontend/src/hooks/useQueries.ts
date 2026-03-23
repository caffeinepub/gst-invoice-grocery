import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LineItem, UserProfile } from "../backend.d";
import { ACTOR_QUERY_KEY, useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

const FIXED_ADMIN_PRINCIPALS = [
  "f3axn-iphna-qs373-xc2my-2epru-xspto-xluny-flo3l-4nqhb-j2e4r-mqe",
];

const DATA_QUERY_DEFAULTS = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: false,
  retry: 3,
  retryDelay: 2000,
};

export function useGetStore() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["store"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await actor.getStore();
        return result;
      } catch (e) {
        console.error("getStore error:", e);
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetStoreSummary() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["storeSummary"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await actor.getStoreSummary();
        return result;
      } catch (e) {
        console.error("getStoreSummary error:", e);
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetProducts() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getProducts();
        return result;
      } catch (e) {
        console.error("getProducts error:", e);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getInvoices();
        return result;
      } catch (e) {
        console.error("getInvoices error:", e);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetNextInvoiceNumber() {
  const { actor, isFetching } = useActor();
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
    enabled: !!actor && !isFetching,
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
      return actor.createInvoice(
        data.customerName,
        data.customerGstin,
        data.isIgst,
        data.lineItems,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["storeSummary"] });
      qc.invalidateQueries({ queryKey: ["nextInvoiceNumber"] });
    },
  });
}

export function useGetCallerProfile() {
  const { actor, isFetching } = useActor();
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
    enabled: !!actor && !isFetching,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useGetMyCredits() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myCredits"],
    queryFn: async (): Promise<bigint> => {
      if (!actor) return 0n;
      try {
        return await actor.getMyCredits();
      } catch {
        return 0n;
      }
    },
    enabled: !!actor && !isFetching,
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
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "";

  return useQuery({
    queryKey: ["allStoresAdmin", principal],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getAllStoresAdmin();
        return result;
      } catch (e) {
        console.error("getAllStoresAdmin error:", e);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!principal,
    ...DATA_QUERY_DEFAULTS,
  });
}

export function useAddCreditsAdmin() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { storeId: any; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addCreditsAdmin(data.storeId, data.amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allStoresAdmin", principal] });
      qc.invalidateQueries({ queryKey: ["myCredits"] });
    },
  });
}

// Refresh all data queries
export function useRefreshAllData() {
  const qc = useQueryClient();
  const { refetchActor } = useActor();

  return async () => {
    try {
      await refetchActor();
    } catch (e) {
      console.warn("Actor refetch failed:", e);
    }
    await qc.invalidateQueries({
      predicate: (q) => !q.queryKey.includes(ACTOR_QUERY_KEY),
    });
    await qc.refetchQueries({
      predicate: (q) => !q.queryKey.includes(ACTOR_QUERY_KEY),
    });
  };
}
