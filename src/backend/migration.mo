import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  // ── Old types (copied from previous version; no defaultRate, no customerMobile) ──
  type OldProduct = {
    storeId : Principal;
    name : Text;
    hsnCode : Text;
    sku : Text;
    price : Nat;
    gstRate : Nat;
    stockQty : Nat;
    createdAt : Time.Time;
  };

  type OldLineItem = {
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

  type OldInvoice = {
    storeId : Principal;
    invoiceNumber : Nat;
    date : Time.Time;
    customerName : Text;
    customerGstin : Text;
    isIgst : Bool;
    lineItems : [OldLineItem];
    subtotal : Nat;
    totalCgst : Nat;
    totalSgst : Nat;
    totalIgst : Nat;
    grandTotal : Nat;
    createdAt : Time.Time;
  };

  // ── New types (matching current main.mo) ──
  type NewProduct = {
    storeId : Principal;
    name : Text;
    hsnCode : Text;
    sku : Text;
    price : Nat;
    gstRate : Nat;
    stockQty : Nat;
    defaultRate : ?Nat;
    createdAt : Time.Time;
  };

  type NewLineItem = {
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

  type NewInvoice = {
    storeId : Principal;
    invoiceNumber : Nat;
    date : Time.Time;
    customerName : Text;
    customerGstin : Text;
    customerMobile : Text;
    isIgst : Bool;
    lineItems : [NewLineItem];
    subtotal : Nat;
    totalCgst : Nat;
    totalSgst : Nat;
    totalIgst : Nat;
    grandTotal : Nat;
    createdAt : Time.Time;
  };

  type OldActor = {
    products : Map.Map<Principal, Map.Map<Text, OldProduct>>;
    invoices : Map.Map<Principal, Map.Map<Nat, OldInvoice>>;
  };

  type NewActor = {
    products : Map.Map<Principal, Map.Map<Text, NewProduct>>;
    invoices : Map.Map<Principal, Map.Map<Nat, NewInvoice>>;
  };

  public func run(old : OldActor) : NewActor {
    // Migrate products: add defaultRate = null to every product
    let newProducts = old.products.map<Principal, Map.Map<Text, OldProduct>, Map.Map<Text, NewProduct>>(
      func(_owner, prodMap) {
        prodMap.map<Text, OldProduct, NewProduct>(
          func(_sku, p) {
            { p with defaultRate = null };
          }
        );
      }
    );

    // Migrate invoices: add customerMobile = "" to every invoice
    let newInvoices = old.invoices.map<Principal, Map.Map<Nat, OldInvoice>, Map.Map<Nat, NewInvoice>>(
      func(_owner, invMap) {
        invMap.map<Nat, OldInvoice, NewInvoice>(
          func(_num, inv) {
            { inv with customerMobile = "" };
          }
        );
      }
    );

    { products = newProducts; invoices = newInvoices };
  };
};
