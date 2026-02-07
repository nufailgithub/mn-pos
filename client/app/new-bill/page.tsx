"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "../_components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Scan, Plus, Trash2, Printer } from "lucide-react";
import { productsApi, type Product } from "@/lib/api/products";
import { salesApi, type Sale } from "@/lib/api/sales";
import { toast } from "sonner";
import { SaleItemInput } from "@/lib/validations/sale";

const CATEGORIES = ["Kids", "Men", "Ladies"] as const;
const ALL_CATEGORIES = "__ALL__";

type BillItem = SaleItemInput & {
  product: Product;
  itemSubtotal: number;
};

export default function NewBillPage() {
  const searchParams = useSearchParams();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "AMOUNT">("AMOUNT");
  
  // Bill summary
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<"PERCENTAGE" | "AMOUNT">("AMOUNT");
  const [notes, setNotes] = useState("");

  // Payment state
  const [payments, setPayments] = useState<{ method: string; amount: number; reference?: string }[]>([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<"CASH" | "CARD" | "MOBILE" | "BANK_TRANSFER" | "CREDIT">("CASH");
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<string>("");
  const [currentPaymentReference, setCurrentPaymentReference] = useState("");

  const calculateBillTotals = () => {
    const subtotal = billItems.reduce((sum, item) => sum + item.itemSubtotal, 0);
    let discountAmount = 0;
    
    if (billDiscount > 0) {
      if (billDiscountType === "PERCENTAGE") {
        discountAmount = (subtotal * billDiscount) / 100;
      } else {
        discountAmount = billDiscount;
      }
    }
    
    const tax = 0; 
    const total = Math.max(0, subtotal + tax - discountAmount);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, total - totalPaid);
    const change = Math.max(0, totalPaid - total);
    
    return { subtotal, tax, discount: discountAmount, total, totalPaid, balance, change };
  };

  const billSummary = calculateBillTotals();

  // Auto-fill payment amount when total changes - REMOVED per user request
  // Users should manually enter the amount they want to pay
  // useEffect(() => {
  //   if (billSummary.balance > 0 && !currentPaymentAmount) {
  //       setCurrentPaymentAmount(billSummary.balance.toString());
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [billSummary.total]);

  const handleAddPayment = () => {
      const amount = Number(currentPaymentAmount);
      if (!amount || amount <= 0) {
          toast.error("Please enter a valid amount");
          return;
      }
      // Allow overpayment: amount can exceed balance (change will be added as customer advance)
      setPayments([...payments, {
          method: currentPaymentMethod,
          amount,
          reference: currentPaymentReference
      }]);
      setCurrentPaymentAmount("");
      setCurrentPaymentReference("");
  };

  const handleRemovePayment = (index: number) => {
      setPayments(payments.filter((_, i) => i !== index));
  };

  // --- Product & Cart Logic ---

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await productsApi.getAll({ search: search || undefined, category: category === ALL_CATEGORIES ? undefined : category, limit: 50 });
        setProducts(data.products);
      } catch (error) {
        console.error("Failed to fetch products", error);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [search, category]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
       handleBarcodeScan(barcodeInput);
    }
  };

  const handleBarcodeScan = async (code: string) => {
    if (!code) return;
    
    // First check checked loaded products
    let product = products.find(p => p.productId === code || p.barcode === code);
    
    // If not found, try to fetch specifically
    if (!product) {
         try {
             product = await productsApi.getByBarcode(code);
         } catch(e) { 
            // Fallback to searching if barcode specific endpoint fails/not exact
            try {
                const results = await productsApi.getAll({ search: code });
                product = results.products.find(p => p.productId === code || p.barcode === code);
            } catch (err) { /* ignore */ }
         }
    }

    if (product) {
      handleProductSelect(product);
      setBarcodeInput("");
    } else {
      toast.error("Product not found");
    }
  };

  const handleProductSelect = (product: Product) => {
      setSelectedProduct(product);
      setQuantity(1);
      setDiscount(0);
      setDiscountType("AMOUNT");
      // Default size selection if applicable
      if (!product.freeSize && product.productSizes.length > 0) {
          // Select first available size
          const avail = product.productSizes.find(s => s.quantity > 0);
          setSelectedSize(avail?.size || product.productSizes[0].size);
      } else {
          setSelectedSize("");
      }
      setDialogOpen(true);
  };

  const calculateItemSubtotal = (price: number, qty: number, disc: number, type: "PERCENTAGE" | "AMOUNT") => {
      const sub = price * qty;
      let d = 0;
      if (type === "PERCENTAGE") {
          d = (sub * disc) / 100;
      } else {
          d = disc;
      }
      return Math.max(0, sub - d);
  };

  const handleAddToBill = () => {
      if (!selectedProduct) return;
      
      const available = selectedProduct.freeSize 
          ? selectedProduct.productSizes[0]?.quantity || 0
          : selectedProduct.productSizes.find(ps => ps.size === selectedSize)?.quantity || 0;
          
      if (quantity > available) {
          toast.error(`Only ${available} items available in stock`);
          return;
      }

      const itemSubtotal = calculateItemSubtotal(selectedProduct.sellingPrice, quantity, discount, discountType);

      setBillItems([...billItems, {
          productId: selectedProduct.id,
          product: selectedProduct, // Store full object for UI
          quantity,
          price: selectedProduct.sellingPrice,
          discount,
          discountType,
          size: selectedProduct.freeSize ? undefined : selectedSize,
          itemSubtotal
      }]);

      setDialogOpen(false);
      // Reset selection
      setSelectedProduct(null);
  };

  const handleRemoveItem = (index: number) => {
      setBillItems(billItems.filter((_, i) => i !== index));
  };


  const handleConfirmBill = async (shouldPrint: boolean = false) => {
    if (billItems.length === 0) {
      toast.error("Please add at least one item to the bill");
      return;
    }

    // Customer required only when credit is used (balance left as credit or Credit payment selected)
    const needsCustomer = billSummary.balance > 0 || payments.some(p => p.method === "CREDIT");
    if (needsCustomer && (!customerName?.trim() || !customerPhone?.trim())) {
      toast.error("Customer name and phone are required when using Credit payment.");
      return;
    }

    try {
      const paymentsList = Array.isArray(payments) ? payments : [];
      const saleData = {
        items: billItems.map(item => ({
             productId: item.productId,
             quantity: Number(item.quantity),
             price: Number(item.price),
             discount: Number(item.discount) || 0,
             size: item.size,
             discountType: item.discount > 0 ? item.discountType : undefined
        })),
        payments: paymentsList.map(p => ({
            method: p.method as "CASH" | "BANK_TRANSFER" | "CARD" | "MOBILE" | "CREDIT",
            amount: p.amount,
            reference: p.reference
        })),
        discount: Number(billDiscount) || 0,
        discountType: billDiscount > 0 ? billDiscountType : undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined
      };

      console.log("Creating sale with data:", saleData);
      const sale = await salesApi.create(saleData as any);
      toast.success(billSummary.balance > 0 ? "Bill created with Credit/Loan! 🎉" : "Bill created successfully! 🎉");
      
      if (shouldPrint) {
        handlePrintBill(sale);
      }
      
      // Reset
      setBillItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setPayments([]);
      setBillDiscount(0);
      setNotes("");
    } catch (error: any) {
      console.error("Error creating bill:", error);
      toast.error(error.message || "Failed to create bill");
    }
  };

  const handlePrintBill = (sale?: Sale) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the bill");
      return;
    }

    const { subtotal, tax, discount, total, totalPaid, balance } = calculateBillTotals();
    const saleNumber = sale?.saleNumber || `BILL-${Date.now()}`;
    const date = new Date().toLocaleString();

    const discountDisplay = discount > 0 ? `
      <div class="total-row" style="color: green;">
        <span>Discount:</span>
        <span>- Rs. ${discount.toLocaleString()}</span>
      </div>
    ` : "";

    const customerInfo = customerName ? `<div class="info">Customer: ${customerName}</div>` : "";
    const phoneInfo = customerPhone ? `<div class="info">Phone: ${customerPhone}</div>` : "";
    
    // Payments HTML
    const paymentsHtml = payments.map(p => `
        <div class="total-row" style="font-size: 11px; color: #555;">
            <span>${p.method}:</span>
            <span>Rs. ${p.amount.toLocaleString()}</span>
        </div>
    `).join("");

    const balanceHtml = balance > 0 ? `
        <div class="total-row" style="margin-top: 5px; font-weight: bold; color: red;">
            <span>Balance (Credit):</span>
            <span>Rs. ${balance.toLocaleString()}</span>
        </div>
    ` : "";

    const changeHtml = billSummary.change > 0 ? `
        <div class="total-row" style="margin-top: 5px; font-weight: bold; color: green;">
            <span>Change:</span>
            <span>Rs. ${billSummary.change.toLocaleString()}</span>
        </div>
    ` : "";

    const itemsHtml = billItems.map((item) => {
      const discountText = item.discount > 0 
        ? ` <span style="color: green;">(-${item.discount})</span>` : "";
      const sizeText = item.size ? `Size: ${item.size} • ` : "";
      return `
        <div class="item">
          <div class="item-name">${item.product.name}</div>
          <div class="item-details">
            ${sizeText}${item.quantity} × Rs. ${item.price.toLocaleString()}${discountText}
          </div>
          <div style="text-align: right;">Rs. ${item.itemSubtotal.toLocaleString()}</div>
        </div>
      `;
    }).join("");

    const printContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Bill - ${saleNumber}</title>
    <style>
      @media print { @page { margin: 5mm; } }
      body { font-family: 'Courier New', monospace; max-width: 80mm; margin: 0 auto; padding: 10px; font-size: 12px; }
      .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
      .header h1 { margin: 0; font-size: 18px; }
      .info { margin: 5px 0; }
      .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
      .item-name { flex: 1; font-weight: bold; }
      .item-details { font-size: 10px; color: #444; margin-right: 5px; }
      .totals { border-top: 1px dashed #000; padding-top: 5px; margin-top: 10px; }
      .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
      .total-final { font-size: 14px; font-weight: bold; border-top: 1px solid #000; margin-top: 5px; padding-top: 2px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>RAHMATH POINT</h1>
      <div class="info">Bill: ${saleNumber}</div>
      <div class="info">${date}</div>
      ${customerInfo} ${phoneInfo}
    </div>
    <div class="items">${itemsHtml}</div>
    <div class="totals">
      <div class="total-row"><span>Subtotal:</span><span>Rs. ${subtotal.toLocaleString()}</span></div>
      ${discountDisplay}
      <div class="total-row total-final"><span>TOTAL:</span><span>Rs. ${total.toLocaleString()}</span></div>
      <div style="margin: 5px 0; border-top: 1px dotted #ccc;"></div>
      ${paymentsHtml}
      <div class="total-row"><span>Total Paid:</span><span>Rs. ${totalPaid.toLocaleString()}</span></div>
      ${balanceHtml}
      ${changeHtml}
    </div>
    <div style="text-align: center; margin-top: 20px;">Thank you!</div>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Bill</h1>
          <p className="text-muted-foreground mt-2">
            Create a new bill by scanning barcode or selecting products
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Product Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Barcode Scanner & Search (Existing code remains same) */}
            <Card>
              <CardHeader>
                <CardTitle>Scan Barcode</CardTitle>
                <CardDescription>Scan or enter barcode to add product</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Scan className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Scan barcode or enter manually..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={handleBarcodeKeyDown}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  <Button onClick={() => handleBarcodeScan(barcodeInput)}>
                    Scan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Products</CardTitle>
                <CardDescription>Search and select products to add</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {/* Product List UI (Existing code remains same) */}
                 <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
                  {!loading && products.length > 0 && products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-left"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.productId} • Rs. {product.sellingPrice.toLocaleString()}</div>
                          </div>
                            <div className="text-right">
                              <div className={`text-sm font-medium ${(product.totalQuantity || 0) <= product.stockAlertLimit ? "text-red-600" : "text-green-600"}`}>
                                Stock: {product.totalQuantity || 0}
                              </div>
                            </div>
                        </button>
                    ))}
                 </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Bill Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bill Items</CardTitle>
                <CardDescription>{billItems.length} item(s) in bill</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {billItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No items added yet</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {billItems.map((item, index) => (
                      <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity} × Rs. {item.price}
                            {item.discount > 0 && <span className="text-green-600"> (-{item.discount})</span>}
                          </div>
                          <div className="text-sm font-semibold mt-1">Rs. {item.itemSubtotal.toLocaleString()}</div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Payment & Checkout</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info - required only when Credit payment is used */}
                <div className="space-y-2">
                  <Input placeholder="Customer Name (required for credit only)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                  <Input placeholder="Customer Phone (required for credit only)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>

                {/* Bill Discount */}
                <div className="flex gap-2">
                    <Input type="number" placeholder="Discount" value={billDiscount || ""} onChange={(e) => setBillDiscount(Number(e.target.value) || 0)} className="flex-1" />
                    <Select value={billDiscountType} onValueChange={(v: any) => setBillDiscountType(v)}>
                      <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="AMOUNT">Rs</SelectItem><SelectItem value="PERCENTAGE">%</SelectItem></SelectContent>
                    </Select>
                </div>

                {/* Payment Entry */}
                <div className="border p-3 rounded-md bg-muted/20 space-y-3">
                    <div className="text-sm font-medium">Add Payment</div>
                    <div className="grid grid-cols-2 gap-2">
                        <Select value={currentPaymentMethod} onValueChange={(v: any) => setCurrentPaymentMethod(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank / UPI</SelectItem>
                                <SelectItem value="CARD">Card</SelectItem>
                                <SelectItem value="MOBILE">Mobile</SelectItem>
                                <SelectItem value="CREDIT">Credit (remaining)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input 
                            type="number" 
                            placeholder="Amount" 
                            value={currentPaymentAmount} 
                            onChange={(e) => setCurrentPaymentAmount(e.target.value)} 
                        />
                    </div>
                    {currentPaymentMethod !== "CASH" && (
                         <Input placeholder="Transaction Ref / ID" value={currentPaymentReference} onChange={(e) => setCurrentPaymentReference(e.target.value)} />
                    )}
                    <Button variant="secondary" className="w-full" onClick={handleAddPayment} disabled={!currentPaymentAmount || Number(currentPaymentAmount) <= 0}>
                        Add Payment
                    </Button>
                </div>

                {/* Payment List */}
                {payments.length > 0 && (
                    <div className="space-y-2">
                        {payments.map((p, i) => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 bg-muted rounded border">
                                <div>
                                    <span className="font-semibold">{p.method}</span>
                                    {p.reference && <span className="text-xs text-muted-foreground"> ({p.reference})</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>Rs. {p.amount.toLocaleString()}</span>
                                    <Trash2 className="h-3 w-3 cursor-pointer text-destructive" onClick={() => handleRemovePayment(i)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                   <div className="flex justify-between text-sm"><span>Subtotal:</span><span>Rs. {billSummary.subtotal.toLocaleString()}</span></div>
                   {billSummary.discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount:</span><span>- Rs. {billSummary.discount.toLocaleString()}</span></div>}
                   <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total:</span><span>Rs. {billSummary.total.toLocaleString()}</span></div>
                   
                   <div className="flex justify-between text-sm text-muted-foreground mt-2"><span>Paid:</span><span>Rs. {billSummary.totalPaid.toLocaleString()}</span></div>
                   {billSummary.balance > 0 && (
                        <div className="flex justify-between text-sm font-bold text-red-600 bg-red-50 p-2 rounded">
                            <span>Balance (Credit):</span>
                            <span>Rs. {billSummary.balance.toLocaleString()}</span>
                        </div>
                   )}
                   {billSummary.change > 0 && (
                        <div className="flex justify-between text-sm font-bold text-green-600 bg-green-50 p-2 rounded">
                            <span>Change:</span>
                            <span>Rs. {billSummary.change.toLocaleString()}</span>
                        </div>
                   )}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" size="lg" variant="outline" onClick={() => handleConfirmBill(false)} disabled={billItems.length === 0}>
                    Save Bill
                  </Button>
                  <Button className="flex-1" size="lg" onClick={() => handleConfirmBill(true)} disabled={billItems.length === 0}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        

        {/* Add Product Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Product to Bill</DialogTitle>
              {selectedProduct && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{selectedProduct.name}</div>
                  <div className="flex gap-4">
                    <span>
                      Cost: <span className="font-medium">Rs. {selectedProduct.costPrice.toLocaleString()}</span>
                    </span>
                    <span>
                      Selling: <span className="font-medium text-green-600">Rs. {selectedProduct.sellingPrice.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="text-xs">
                    Profit: Rs. {(selectedProduct.sellingPrice - selectedProduct.costPrice).toLocaleString()} (
                    {Math.round(((selectedProduct.sellingPrice - selectedProduct.costPrice) / selectedProduct.costPrice) * 100)}%)
                  </div>
                </div>
              )}
            </DialogHeader>

            {selectedProduct && (
              <div className="space-y-4 py-4">
                {/* Size Selection (for sized products) */}
                {!selectedProduct.freeSize && (
                  <div className="space-y-2">
                    <label htmlFor="size-select" className="text-sm font-medium">Size</label>
                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                      <SelectTrigger id="size-select">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct.productSizes.map((ps) => (
                          <SelectItem
                            key={ps.size}
                            value={ps.size}
                            disabled={ps.quantity === 0}
                          >
                            {ps.size} {ps.quantity === 0 && "(Out of stock)"} ({ps.quantity} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quantity */}
                <div className="space-y-2">
                  <label htmlFor="quantity-input" className="text-sm font-medium">Quantity</label>
                  <Input
                    id="quantity-input"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                  {selectedProduct.freeSize ? (
                    <p className="text-xs text-muted-foreground">
                      Available: {selectedProduct.productSizes[0]?.quantity || 0}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Available: {selectedProduct.productSizes.find(ps => ps.size === selectedSize)?.quantity || 0}
                    </p>
                  )}
                </div>

                {/* Discount */}
                <div className="space-y-2">
                  <label htmlFor="discount-input" className="text-sm font-medium">Discount (Optional)</label>
                  <div className="flex gap-2">
                    <Input
                      id="discount-input"
                      type="number"
                      min="0"
                      placeholder="Discount"
                      value={discount || ""}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <Select
                      value={discountType}
                      onValueChange={(value: "PERCENTAGE" | "AMOUNT") => setDiscountType(value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AMOUNT">Amount</SelectItem>
                        <SelectItem value="PERCENTAGE">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {discount > 0 && (
                    <p className="text-xs text-green-600">
                      Discount: Rs.{" "}
                      {discountType === "PERCENTAGE"
                        ? ((selectedProduct.sellingPrice * quantity * discount) / 100).toLocaleString()
                        : discount.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Item Total Preview */}
                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Item Total:</span>
                    <span>
                      Rs.{" "}
                      {calculateItemSubtotal(
                        selectedProduct.sellingPrice,
                        quantity,
                        discount,
                        discountType
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddToBill}>Add to Bill</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
