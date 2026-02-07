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
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "MOBILE" | "BANK_TRANSFER">("CASH");
  const [billDiscount, setBillDiscount] = useState(0);
  const [billDiscountType, setBillDiscountType] = useState<"PERCENTAGE" | "AMOUNT">("AMOUNT");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  // Handle barcode from URL parameter (when navigated from global scanner)
  useEffect(() => {
    const barcodeParam = searchParams.get("barcode");
    if (barcodeParam) {
      handleBarcodeScan(barcodeParam);
      // Clean up URL
      globalThis.history.replaceState({}, "", "/new-bill");
    }
  }, [searchParams]);

  // Listen for barcodeScanned custom event (from global scanner)
  useEffect(() => {
    const handleBarcodeScanned = (event: CustomEvent<{ product: Product; barcode: string }>) => {
      const { product } = event.detail;
      setSelectedProduct(product);
      setQuantity(1);
      setDiscount(0);
      setDiscountType("AMOUNT");
      
      // Set default size for sized products
      if (!product.freeSize && product.productSizes.length > 0) {
        const availableSize = product.productSizes.find(ps => ps.quantity > 0);
        setSelectedSize(availableSize?.size || product.productSizes[0].size);
      } else {
        setSelectedSize("");
      }
      
      setDialogOpen(true);
    };

    globalThis.addEventListener("barcodeScanned", handleBarcodeScanned as EventListener);

    return () => {
      globalThis.removeEventListener("barcodeScanned", handleBarcodeScanned as EventListener);
    };
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const categoryFilter = category === ALL_CATEGORIES ? undefined : category;
      const result = await productsApi.getAll({
        page: 1,
        limit: 50,
        search: search || undefined,
        category: categoryFilter,
      });
      setProducts(result.products);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;

    try {
      const product = await productsApi.getByBarcode(barcode.trim());
      setSelectedProduct(product);
      setQuantity(1);
      setDiscount(0);
      setDiscountType("AMOUNT");
      
      // Set default size for sized products
      if (!product.freeSize && product.productSizes.length > 0) {
        const availableSize = product.productSizes.find(ps => ps.quantity > 0);
        setSelectedSize(availableSize?.size || product.productSizes[0].size);
      } else {
        setSelectedSize("");
      }
      
      setDialogOpen(true);
      setBarcodeInput("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Product not found";
      toast.error(errorMessage);
      setBarcodeInput("");
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBarcodeScan(barcodeInput);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setDiscount(0);
    setDiscountType("AMOUNT");
    
    // Set default size for sized products
    if (!product.freeSize && product.productSizes.length > 0) {
      const availableSize = product.productSizes.find(ps => ps.quantity > 0);
      setSelectedSize(availableSize?.size || product.productSizes[0].size);
    } else {
      setSelectedSize("");
    }
    
    setDialogOpen(true);
  };

  const calculateItemSubtotal = (price: number, qty: number, disc: number, type: "PERCENTAGE" | "AMOUNT") => {
    const subtotal = price * qty;
    if (type === "PERCENTAGE") {
      return subtotal - (subtotal * disc / 100);
    }
    return subtotal - disc;
  };

  const handleAddToBill = () => {
    if (!selectedProduct) return;

    // Validate size for sized products
    if (!selectedProduct.freeSize && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    // Check stock availability
    if (selectedProduct.freeSize) {
      const freeSizeStock = selectedProduct.productSizes[0]?.quantity || 0;
      if (freeSizeStock < quantity) {
        toast.error(`Insufficient stock. Available: ${freeSizeStock}`);
        return;
      }
    } else {
      const sizeStock = selectedProduct.productSizes.find(ps => ps.size === selectedSize)?.quantity || 0;
      if (sizeStock < quantity) {
        toast.error(`Insufficient stock for size ${selectedSize}. Available: ${sizeStock}`);
        return;
      }
    }

    const itemSubtotal = calculateItemSubtotal(
      selectedProduct.sellingPrice,
      quantity,
      discount,
      discountType
    );

    const newItem: BillItem = {
      productId: selectedProduct.id,
      size: selectedProduct.freeSize ? undefined : selectedSize,
      quantity,
      price: selectedProduct.sellingPrice,
      discount,
      discountType,
      product: selectedProduct,
      itemSubtotal,
    };

    setBillItems([...billItems, newItem]);
    setDialogOpen(false);
    setSelectedProduct(null);
    toast.success("Product added to bill");
  };

  const handleRemoveItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const calculateBillTotal = () => {
    const subtotal = billItems.reduce((sum, item) => sum + item.itemSubtotal, 0);
    let discountAmount = 0;
    
    if (billDiscount > 0) {
      if (billDiscountType === "PERCENTAGE") {
        discountAmount = (subtotal * billDiscount) / 100;
      } else {
        discountAmount = billDiscount;
      }
    }
    
    const tax = 0; // Can be configured later
    const total = subtotal + tax - discountAmount;
    
    return { subtotal, tax, discount: discountAmount, total };
  };

  const handleConfirmBill = async (shouldPrint: boolean = false) => {
    if (billItems.length === 0) {
      toast.error("Please add at least one item to the bill");
      return;
    }

    try {
      // Prepare sale data with proper validation
      type SaleItemData = {
        productId: string;
        quantity: number;
        price: number;
        discount: number;
        size?: string;
        discountType?: "PERCENTAGE" | "AMOUNT";
      };
      
      type SaleData = {
        items: SaleItemData[];
        paymentMethod: "CASH" | "CARD" | "MOBILE" | "BANK_TRANSFER";
        discount: number;
        customerName?: string;
        customerPhone?: string;
        discountType?: "PERCENTAGE" | "AMOUNT";
        notes?: string;
      };
      
      const saleData: SaleData = {
        items: billItems.map(item => {
          const itemData: SaleItemData = {
            productId: item.productId,
            quantity: Number(item.quantity),
            price: Number(item.price),
            discount: Number(item.discount) || 0,
          };
          
          // Only include size if it exists
          if (item.size) {
            itemData.size = item.size;
          }
          
          // Only include discountType if discount > 0
          if (item.discount > 0 && item.discountType) {
            itemData.discountType = item.discountType;
          }
          
          return itemData;
        }),
        paymentMethod,
        discount: Number(billDiscount) || 0,
      };
      
      // Only include optional fields if they have values
      if (customerName.trim()) {
        saleData.customerName = customerName.trim();
      }
      if (customerPhone.trim()) {
        saleData.customerPhone = customerPhone.trim();
      }
      if (billDiscount > 0 && billDiscountType) {
        saleData.discountType = billDiscountType;
      }
      if (notes.trim()) {
        saleData.notes = notes.trim();
      }

      console.log("Creating sale with data:", saleData);
      const sale = await salesApi.create(saleData);
      toast.success("Bill created successfully! 🎉");
      
      // Print bill if requested
      if (shouldPrint) {
        handlePrintBill(sale);
      }
      
      // Reset form
      setBillItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethod("CASH");
      setBillDiscount(0);
      setBillDiscountType("AMOUNT");
      setNotes("");
    } catch (error) {
      console.error("Error creating bill:", error);
      let errorMessage = "Failed to create bill";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = String(error.message);
      }
      
      toast.error(errorMessage);
    }
  };

  const handlePrintBill = (sale?: Sale) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the bill");
      return;
    }

    const { subtotal, tax, discount, total } = calculateBillTotal();
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
    const notesDisplay = notes ? `<div style="margin-top: 15px; font-size: 11px;">Notes: ${notes}</div>` : "";

    const itemsHtml = billItems.map((item) => {
      const discountPercent = item.discountType === "PERCENTAGE" ? "%" : "";
      const discountText = item.discount > 0 
        ? ` • Discount: Rs. ${item.discount.toLocaleString()}${discountPercent}`
        : "";
      const sizeText = item.size ? `Size: ${item.size} • ` : "";
      return `
        <div class="item">
          <div class="item-name">${item.product.name}</div>
          <div class="item-details">
            ${sizeText}
            ${item.quantity} × Rs. ${item.price.toLocaleString()}
            ${discountText}
          </div>
          <div style="text-align: right; margin-top: 3px;">
            Rs. ${item.itemSubtotal.toLocaleString()}
          </div>
        </div>
      `;
    }).join("");

    const printContent = `<!DOCTYPE html>
<html>
  <head>
    <title>Bill - ${saleNumber}</title>
    <style>
      @media print {
        @page { margin: 10mm; }
      }
      body {
        font-family: Arial, sans-serif;
        max-width: 80mm;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
      }
      .info {
        margin: 10px 0;
        font-size: 12px;
      }
      .items {
        margin: 15px 0;
      }
      .item {
        margin: 8px 0;
        padding: 5px 0;
        border-bottom: 1px dashed #ccc;
      }
      .item-name {
        font-weight: bold;
      }
      .item-details {
        font-size: 11px;
        color: #666;
        margin-left: 10px;
      }
      .totals {
        margin-top: 15px;
        border-top: 2px solid #000;
        padding-top: 10px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin: 5px 0;
      }
      .total-final {
        font-size: 18px;
        font-weight: bold;
        border-top: 1px solid #000;
        padding-top: 5px;
      }
      .footer {
        text-align: center;
        margin-top: 20px;
        font-size: 11px;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>INVOICE</h1>
      <div class="info">Bill No: ${saleNumber}</div>
      <div class="info">Date: ${date}</div>
      ${customerInfo}
      ${phoneInfo}
    </div>
    
    <div class="items">
      ${itemsHtml}
    </div>
    
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>Rs. ${subtotal.toLocaleString()}</span>
      </div>
      ${discountDisplay}
      <div class="total-row">
        <span>Tax:</span>
        <span>Rs. ${tax.toLocaleString()}</span>
      </div>
      <div class="total-row total-final">
        <span>TOTAL:</span>
        <span>Rs. ${total.toLocaleString()}</span>
      </div>
      <div class="total-row" style="margin-top: 10px;">
        <span>Payment:</span>
        <span>${paymentMethod}</span>
      </div>
    </div>
    
    ${notesDisplay}
    
    <div class="footer">
      <div>Thank you for your business!</div>
      <div style="margin-top: 5px;">Generated at ${date}</div>
    </div>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const billSummary = calculateBillTotal();

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
            {/* Barcode Scanner */}
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

            {/* Product Search and Filter */}
            <Card>
              <CardHeader>
                <CardTitle>Available Products</CardTitle>
                <CardDescription>Search and select products to add</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product List */}
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {loading && (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  )}
                  {!loading && products.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No products found</p>
                  )}
                  {!loading && products.length > 0 && (
                    products.map((product) => {
                      const totalQty = product.totalQuantity || 0;
                      const isLowStock = totalQty <= product.stockAlertLimit;
                      
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring text-left"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.productId} • Rs. {product.sellingPrice.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`text-sm font-medium ${isLowStock ? "text-red-600" : "text-green-600"}`}>
                                Stock: {totalQty}
                              </div>
                              {product.brand && (
                                <div className="text-xs text-muted-foreground">{product.brand}</div>
                              )}
                            </div>
                            <div className="flex items-center justify-center w-8 h-8 rounded-md border border-input bg-background hover:bg-accent">
                              <Plus className="h-4 w-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
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
                  <p className="text-center text-muted-foreground py-8">
                    No items added yet
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {billItems.map((item, index) => (
                      <div
                        key={`${item.productId}-${item.size || "free"}-${index}`}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity} × Rs. {item.price.toLocaleString()}
                            {item.size && ` • Size: ${item.size}`}
                            {item.discount > 0 && (
                              <span className="text-green-600">
                                {" "}• Discount: Rs. {item.discount.toLocaleString()}
                                {item.discountType === "PERCENTAGE" && "%"}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold mt-1">
                            Rs. {item.itemSubtotal.toLocaleString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bill Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="space-y-2">
                  <Input
                    placeholder="Customer Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <Input
                    placeholder="Customer Phone (Optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                {/* Bill Discount */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Bill Discount"
                      value={billDiscount || ""}
                      onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <Select
                      value={billDiscountType}
                      onValueChange={(value: "PERCENTAGE" | "AMOUNT") => setBillDiscountType(value)}
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
                </div>

                {/* Payment Method */}
                <Select
                  value={paymentMethod}
                  onValueChange={(value: "CASH" | "CARD" | "MOBILE" | "BANK_TRANSFER") =>
                    setPaymentMethod(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="MOBILE">Mobile Payment</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>

                {/* Notes */}
                <Input
                  placeholder="Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>Rs. {billSummary.subtotal.toLocaleString()}</span>
                  </div>
                  {billSummary.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>- Rs. {billSummary.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>Rs. {billSummary.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>Rs. {billSummary.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="lg"
                    variant="outline"
                    onClick={() => handleConfirmBill(false)}
                    disabled={billItems.length === 0}
                  >
                    Confirm Bill
                  </Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={() => handleConfirmBill(true)}
                    disabled={billItems.length === 0}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Confirm & Print
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
