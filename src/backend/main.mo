import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Array "mo:core/Array";

import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import List "mo:core/List";

actor {
  let ADMIN_PRINCIPAL : Principal = Principal.fromText("f3axn-iphna-qs373-xc2my-2epru-xspto-xluny-flo3l-4nqhb-j2e4r-mqe");

  // Migration stubs: these stable variables existed in the previous version and must be
  // explicitly migrated away. They are no longer used but must be declared to allow upgrade.
  type _LegacyUserRole = { #admin; #user; #guest };
  type _LegacyACState = { var adminAssigned : Bool; userRoles : Map.Map<Principal, _LegacyUserRole> };
  stable var ADMIN_PRINCIPAL_2 : Principal = ADMIN_PRINCIPAL;
  stable var accessControlState : _LegacyACState = {
    var adminAssigned = true;
    userRoles = Map.empty<Principal, _LegacyUserRole>();
  };

  func isAdminCaller(caller : Principal) : Bool {
    caller == ADMIN_PRINCIPAL;
  };

  func requireUser(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
  };

  module Store {
    public func compare(store1 : StoreProfile, store2 : StoreProfile) : Order.Order {
      Text.compare(store1.gstin, store2.gstin);
    };
  };

  module Product {
    public func compare(product1 : Product, product2 : Product) : Order.Order {
      Text.compare(product1.sku, product2.sku);
    };
  };

  module LineItem {
    public func compareByProduct(lineItem1 : LineItem, lineItem2 : LineItem) : Order.Order {
      Text.compare(lineItem1.productName, lineItem2.productName);
    };
  };

  type StoreProfile = {
    owner : Principal;
    name : Text;
    address : Text;
    gstin : Text;
    fssai : Text;
    phone : Text;
    state : Text;
    createdAt : Time.Time;
  };

  type Product = {
    storeId : Principal;
    name : Text;
    hsnCode : Text;
    sku : Text;
    price : Nat;
    gstRate : Nat;
    stockQty : Nat;
    createdAt : Time.Time;
  };

  type LineItem = {
    productId : Text;
    productName : Text;
    hsnCode : Text;
    qty : Nat;
    rate : Nat;
    gstRate : Nat;
    cgstAmt : Nat;
    sgstAmt : Nat;
    igstAmt : Nat;
    lineTotal : Nat;
  };

  type Invoice = {
    storeId : Principal;
    invoiceNumber : Nat;
    date : Time.Time;
    customerName : Text;
    customerGstin : Text;
    isIgst : Bool;
    lineItems : [LineItem];
    subtotal : Nat;
    totalCgst : Nat;
    totalSgst : Nat;
    totalIgst : Nat;
    grandTotal : Nat;
    createdAt : Time.Time;
  };

  type StoreSummary = {
    storeProfile : StoreProfile;
    totalProducts : Nat;
    totalInvoices : Nat;
    totalSales : Nat;
    totalCgst : Nat;
    totalSgst : Nat;
    totalIgst : Nat;
  };

  type UserProfile = {
    name : Text;
  };

  type AdminStoreView = {
    owner : Principal;
    storeName : Text;
    credits : Nat;
    phone : Text;
    address : Text;
    gstin : Text;
    fssai : Text;
    state : Text;
  };

  let stores = Map.empty<Principal, StoreProfile>();
  let products = Map.empty<Principal, Map.Map<Text, Product>>();
  let lineItems = Map.empty<Nat, LineItem>();
  let invoices = Map.empty<Principal, Map.Map<Nat, Invoice>>();
  let nextInvoiceNumber = Map.empty<Principal, Nat>();
  let credits = Map.empty<Principal, Nat>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    requireUser(caller);
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    requireUser(caller);
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func registerStore(name : Text, address : Text, gstin : Text, fssai : Text, phone : Text, state : Text) : async StoreProfile {
    requireUser(caller);
    if (stores.containsKey(caller)) { Runtime.trap("Store already registered for this caller") };
    let storeProfile : StoreProfile = {
      owner = caller;
      name;
      address;
      gstin;
      fssai;
      phone;
      state;
      createdAt = Time.now();
    };
    stores.add(caller, storeProfile);
    storeProfile;
  };

  public query ({ caller }) func getStore() : async StoreProfile {
    requireUser(caller);
    switch (stores.get(caller)) {
      case (null) { Runtime.trap("Store not found for this caller") };
      case (?store) { store };
    };
  };

  public shared ({ caller }) func updateStore(name : Text, address : Text, gstin : Text, fssai : Text, phone : Text, state : Text) : async StoreProfile {
    requireUser(caller);
    switch (stores.get(caller)) {
      case (null) { Runtime.trap("Store not found for this caller") };
      case (?store) {
        let updatedStore : StoreProfile = {
          owner = caller;
          name;
          address;
          gstin;
          fssai;
          phone;
          state;
          createdAt = store.createdAt;
        };
        stores.add(caller, updatedStore);
        updatedStore;
      };
    };
  };

  public shared ({ caller }) func addProduct(name : Text, hsnCode : Text, sku : Text, price : Nat, gstRate : Nat, stockQty : Nat) : async Product {
    requireUser(caller);
    if (not stores.containsKey(caller)) { Runtime.trap("Store not found for this caller") };
    let existingProducts = switch (products.get(caller)) {
      case (null) { Map.empty<Text, Product>() };
      case (?prods) { prods };
    };
    if (existingProducts.containsKey(sku)) { Runtime.trap("SKU already shows up in product catalog") };
    let product : Product = {
      storeId = caller;
      name;
      hsnCode;
      sku;
      price;
      gstRate;
      stockQty;
      createdAt = Time.now();
    };
    existingProducts.add(sku, product);
    products.add(caller, existingProducts);
    product;
  };

  public shared ({ caller }) func updateProduct(sku : Text, name : Text, hsnCode : Text, price : Nat, gstRate : Nat, stockQty : Nat) : async Product {
    requireUser(caller);
    switch (products.get(caller)) {
      case (null) { Runtime.trap("Product not found for this store") };
      case (?prods) {
        switch (prods.get(sku)) {
          case (null) { Runtime.trap("Product not found for this store") };
          case (?product) {
            let updatedProduct : Product = {
              storeId = caller;
              name;
              hsnCode;
              sku;
              price;
              gstRate;
              stockQty;
              createdAt = product.createdAt;
            };
            prods.add(sku, updatedProduct);
            products.add(caller, prods);
            updatedProduct;
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteProduct(sku : Text) : async () {
    requireUser(caller);
    switch (products.get(caller)) {
      case (null) { Runtime.trap("Product not found for this store") };
      case (?prods) {
        prods.remove(sku);
        products.add(caller, prods);
      };
    };
  };

  public query ({ caller }) func getProducts() : async [Product] {
    requireUser(caller);
    switch (products.get(caller)) {
      case (null) { [] };
      case (?prods) {
        prods.values().toArray().sort();
      };
    };
  };

  public shared ({ caller }) func createInvoice(customerName : Text, customerGstin : Text, isIgst : Bool, lineItems : [LineItem]) : async Invoice {
    requireUser(caller);
    let currentCredits = switch (credits.get(caller)) {
      case (null) { 0 };
      case (?c) { c };
    };
    if (currentCredits == 0) {
      Runtime.trap("Insufficient credits: You need at least 1 credit to create an invoice");
    };
    let invoiceNumber = switch (nextInvoiceNumber.get(caller)) {
      case (null) { 1 };
      case (?num) { num };
    };
    let subtotal = lineItems.foldLeft(0, func(acc, item) { acc + item.lineTotal });
    let totalCgst = lineItems.foldLeft(0, func(acc, item) { acc + item.cgstAmt });
    let totalSgst = lineItems.foldLeft(0, func(acc, item) { acc + item.sgstAmt });
    let totalIgst = lineItems.foldLeft(0, func(acc, item) { acc + item.igstAmt });
    let grandTotal = subtotal + totalCgst + totalSgst + totalIgst;
    let invoice : Invoice = {
      storeId = caller;
      invoiceNumber;
      date = Time.now();
      customerName;
      customerGstin;
      isIgst;
      lineItems;
      subtotal;
      totalCgst;
      totalSgst;
      totalIgst;
      grandTotal;
      createdAt = Time.now();
    };
    let existingInvoices = switch (invoices.get(caller)) {
      case (null) { Map.empty<Nat, Invoice>() };
      case (?invs) { invs };
    };
    existingInvoices.add(invoiceNumber, invoice);
    invoices.add(caller, existingInvoices);
    nextInvoiceNumber.add(caller, invoiceNumber + 1);
    credits.add(caller, if (currentCredits > 0) { currentCredits - 1 } else { 0 });
    invoice;
  };

  public shared ({ caller }) func deleteInvoice(invoiceNumber : Nat) : async () {
    requireUser(caller);
    switch (invoices.get(caller)) {
      case (null) { Runtime.trap("Invoice not found for this store") };
      case (?invs) {
        if (not invs.containsKey(invoiceNumber)) {
          Runtime.trap("Invoice not found for this store");
        };
        invs.remove(invoiceNumber);
        invoices.add(caller, invs);
      };
    };
  };

  public shared ({ caller }) func updateInvoice(invoiceNumber : Nat, customerName : Text, customerGstin : Text, isIgst : Bool, lineItems : [LineItem]) : async Invoice {
    requireUser(caller);
    switch (invoices.get(caller)) {
      case (null) { Runtime.trap("Invoice not found for this store") };
      case (?invs) {
        switch (invs.get(invoiceNumber)) {
          case (null) { Runtime.trap("Invoice not found for this store") };
          case (?existing) {
            let subtotal = lineItems.foldLeft(0, func(acc, item) { acc + item.lineTotal });
            let totalCgst = lineItems.foldLeft(0, func(acc, item) { acc + item.cgstAmt });
            let totalSgst = lineItems.foldLeft(0, func(acc, item) { acc + item.sgstAmt });
            let totalIgst = lineItems.foldLeft(0, func(acc, item) { acc + item.igstAmt });
            let grandTotal = subtotal + totalCgst + totalSgst + totalIgst;
            let updated : Invoice = {
              storeId = existing.storeId;
              invoiceNumber = existing.invoiceNumber;
              date = existing.date;
              customerName;
              customerGstin;
              isIgst;
              lineItems;
              subtotal;
              totalCgst;
              totalSgst;
              totalIgst;
              grandTotal;
              createdAt = existing.createdAt;
            };
            invs.add(invoiceNumber, updated);
            invoices.add(caller, invs);
            updated;
          };
        };
      };
    };
  };

  public shared ({ caller }) func updateProductStock(productId : Text, newQty : Nat) : async () {
    requireUser(caller);
    switch (products.get(caller)) {
      case (null) { Runtime.trap("Product not found for this store") };
      case (?prods) {
        switch (prods.get(productId)) {
          case (null) { Runtime.trap("Product not found for this store") };
          case (?product) {
            let updatedProduct : Product = {
              storeId = caller;
              name = product.name;
              hsnCode = product.hsnCode;
              sku = product.sku;
              price = product.price;
              gstRate = product.gstRate;
              stockQty = newQty;
              createdAt = product.createdAt;
            };
            prods.add(productId, updatedProduct);
            products.add(caller, prods);
          };
        };
      };
    };
  };

  public query ({ caller }) func getInvoices() : async [Invoice] {
    requireUser(caller);
    switch (invoices.get(caller)) {
      case (null) { [] };
      case (?invs) { invs.values().toArray() };
    };
  };

  public query ({ caller }) func getInvoice(invoiceNumber : Nat) : async Invoice {
    requireUser(caller);
    switch (invoices.get(caller)) {
      case (null) { Runtime.trap("Invoice not found for this store") };
      case (?invs) {
        switch (invs.get(invoiceNumber)) {
          case (null) { Runtime.trap("Invoice not found for this store") };
          case (?invoice) { invoice };
        };
      };
    };
  };

  public query ({ caller }) func getStoreSummary() : async StoreSummary {
    requireUser(caller);
    switch (stores.get(caller)) {
      case (null) { Runtime.trap("Store not found for this caller") };
      case (?store) {
        let totalProducts = switch (products.get(caller)) {
          case (null) { 0 };
          case (?prods) { prods.size() };
        };
        let myInvoices = switch (invoices.get(caller)) {
          case (null) { Map.empty<Nat, Invoice>() };
          case (?invs) { invs };
        };
        let totalInvoices = myInvoices.size();
        var totalCgst = 0;
        var totalSgst = 0;
        var totalIgst = 0;
        var totalSales = 0;
        for (invoice in myInvoices.values()) {
          totalCgst += invoice.totalCgst;
          totalSgst += invoice.totalSgst;
          totalIgst += invoice.totalIgst;
          totalSales += invoice.subtotal;
        };
        {
          storeProfile = store;
          totalProducts;
          totalInvoices;
          totalSales;
          totalCgst;
          totalSgst;
          totalIgst;
        };
      };
    };
  };

  public query ({ caller }) func getNextInvoiceNumber() : async Nat {
    requireUser(caller);
    switch (nextInvoiceNumber.get(caller)) {
      case (null) { 1 };
      case (?num) { num };
    };
  };

  public query ({ caller }) func getMyCredits() : async Nat {
    switch (credits.get(caller)) {
      case (null) { 0 };
      case (?c) { c };
    };
  };

  public query ({ caller }) func getAllStoresAdmin() : async [AdminStoreView] {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let results = List.empty<AdminStoreView>();
    stores.forEach(
      func(principal, storeProfile) {
        let storeCredits = switch (credits.get(principal)) {
          case (null) { 0 };
          case (?c) { c };
        };
        let storeView : AdminStoreView = {
          owner = principal;
          storeName = storeProfile.name;
          credits = storeCredits;
          phone = storeProfile.phone;
          address = storeProfile.address;
          gstin = storeProfile.gstin;
          fssai = storeProfile.fssai;
          state = storeProfile.state;
        };
        results.add(storeView);
      }
    );
    results.toArray();
  };

  public shared ({ caller }) func addCreditsAdmin(storeId : Principal, amount : Nat) : async () {
    if (not isAdminCaller(caller)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    let currentBalance = switch (credits.get(storeId)) {
      case (null) { 0 };
      case (?c) { c };
    };
    credits.add(storeId, currentBalance + amount);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    isAdminCaller(caller);
  };
};
