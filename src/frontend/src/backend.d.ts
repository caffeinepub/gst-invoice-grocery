import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AdminStoreView {
    credits: bigint;
    owner: Principal;
    storeName: string;
}
export type Time = bigint;
export interface LineItem {
    qty: bigint;
    rate: bigint;
    lineTotal: bigint;
    sgstAmt: bigint;
    hsnCode: string;
    productId: string;
    productName: string;
    gstRate: bigint;
    igstAmt: bigint;
    cgstAmt: bigint;
}
export interface Invoice {
    customerName: string;
    customerGstin: string;
    lineItems: Array<LineItem>;
    date: Time;
    storeId: Principal;
    createdAt: Time;
    totalCgst: bigint;
    totalIgst: bigint;
    isIgst: boolean;
    totalSgst: bigint;
    grandTotal: bigint;
    invoiceNumber: bigint;
    subtotal: bigint;
}
export interface StoreSummary {
    totalProducts: bigint;
    totalCgst: bigint;
    totalIgst: bigint;
    totalSgst: bigint;
    totalSales: bigint;
    storeProfile: StoreProfile;
    totalInvoices: bigint;
}
export interface StoreProfile {
    fssai: string;
    owner: Principal;
    name: string;
    createdAt: Time;
    state: string;
    gstin: string;
    address: string;
    phone: string;
}
export interface UserProfile {
    name: string;
}
export interface Product {
    sku: string;
    stockQty: bigint;
    storeId: Principal;
    name: string;
    createdAt: Time;
    hsnCode: string;
    gstRate: bigint;
    price: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCreditsAdmin(storeId: Principal, amount: bigint): Promise<void>;
    addProduct(name: string, hsnCode: string, sku: string, price: bigint, gstRate: bigint, stockQty: bigint): Promise<Product>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createInvoice(customerName: string, customerGstin: string, isIgst: boolean, lineItems: Array<LineItem>): Promise<Invoice>;
    deleteProduct(sku: string): Promise<void>;
    getAllStoresAdmin(): Promise<Array<AdminStoreView>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getInvoice(invoiceNumber: bigint): Promise<Invoice>;
    getInvoices(): Promise<Array<Invoice>>;
    getMyCredits(): Promise<bigint>;
    getNextInvoiceNumber(): Promise<bigint>;
    getProducts(): Promise<Array<Product>>;
    getStore(): Promise<StoreProfile>;
    getStoreSummary(): Promise<StoreSummary>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    registerStore(name: string, address: string, gstin: string, fssai: string, phone: string, state: string): Promise<StoreProfile>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateProduct(sku: string, name: string, hsnCode: string, price: bigint, gstRate: bigint, stockQty: bigint): Promise<Product>;
    updateProductStock(productId: string, newQty: bigint): Promise<void>;
    updateStore(name: string, address: string, gstin: string, fssai: string, phone: string, state: string): Promise<StoreProfile>;
}
