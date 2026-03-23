import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LineItem, UserProfile } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

const FIXED_ADMIN_PRINCIPALS = [
  "f3axn-iphna-qs373-xc2my-2epru-xspto-xluny-flo3l-4nqhb-j2e4r-mqe",
];

export function useGetStore() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["store"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getStore();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetStoreSummary() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["storeSummary"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getStoreSummary();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProducts() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetNextInvoiceNumber() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["nextInvoiceNumber"],
    queryFn: async () => {
      if (!actor) return 1n;
      return actor.getNextInvoiceNumber();
    },
    enabled: !!actor && !isFetching,
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
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
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
  });
}

export function useGetAllStoresAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "";

  return useQuery({
    // Include principal in key so query re-runs fresh after login
    queryKey: ["allStoresAdmin", principal],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllStoresAdmin();
      } catch (e) {
        console.error("getAllStoresAdmin error:", e);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!principal,
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
