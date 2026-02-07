"use client";

import { useEffect, useState } from "react";
import MainLayout from "../_components/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, TrendingUp, Package, BarChart3 } from "lucide-react";
import { reportsApi, type SalesReport, type InventoryReport, type ProductReport } from "@/lib/api/reports";
import { companyDetails } from "@/company/details";
import { toast } from "sonner";
import { productsApi } from "@/lib/api/products";

type ReportType = "sales" | "inventory" | "products";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [loading, setLoading] = useState(false);
  
  // Sales report state
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<"today" | "week" | "month" | "year" | "custom">("today");
  const [salesStartDate, setSalesStartDate] = useState("");
  const [salesEndDate, setSalesEndDate] = useState("");

  // Inventory report state
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [inventoryCategory, setInventoryCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  // Product report state
  const [productReport, setProductReport] = useState<ProductReport | null>(null);
  const [productStartDate, setProductStartDate] = useState("");
  const [productEndDate, setProductEndDate] = useState("");
  const [productCategory, setProductCategory] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-refresh sales report when filters change
  useEffect(() => {
    if (reportType === "sales") {
      fetchSalesReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, salesPeriod, salesStartDate, salesEndDate]);

  // Auto-refresh inventory report when filter changes
  useEffect(() => {
    if (reportType === "inventory") {
      fetchInventoryReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, inventoryCategory]);

  // Auto-refresh product report when filters change
  useEffect(() => {
    if (reportType === "products") {
      fetchProductReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, productStartDate, productEndDate, productCategory]);

  const fetchCategories = async () => {
    try {
      const result = await productsApi.getAll({ page: 1, limit: 1000 });
      const uniqueCategories = Array.from(
        new Set(result.products.map(p => p.category.name))
      );
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const params: any = { period: salesPeriod };
      if (salesPeriod === "custom") {
        if (salesStartDate) params.startDate = salesStartDate;
        if (salesEndDate) params.endDate = salesEndDate;
      }
      const report = await reportsApi.getSalesReport(params);
      setSalesReport(report);
    } catch (error) {
      console.error("Failed to fetch sales report:", error);
      toast.error("Failed to load sales report");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryReport = async () => {
    setLoading(true);
    try {
      const report = await reportsApi.getInventoryReport({
        category: inventoryCategory || undefined,
      });
      setInventoryReport(report);
    } catch (error) {
      console.error("Failed to fetch inventory report:", error);
      toast.error("Failed to load inventory report");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductReport = async () => {
    setLoading(true);
    try {
      const report = await reportsApi.getProductReport({
        startDate: productStartDate || undefined,
        endDate: productEndDate || undefined,
        category: productCategory || undefined,
      });
      setProductReport(report);
    } catch (error) {
      console.error("Failed to fetch product report:", error);
      toast.error("Failed to load product report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (type: ReportType) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the report");
      return;
    }

    let content = "";
    const date = new Date().toLocaleString();

    if (type === "sales" && salesReport) {
      content = generateSalesReportHTML(salesReport, date);
    } else if (type === "inventory" && inventoryReport) {
      content = generateInventoryReportHTML(inventoryReport, date);
    } else if (type === "products" && productReport) {
      content = generateProductReportHTML(productReport, date);
    } else {
      toast.error("No report data available to print");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and view comprehensive business reports
          </p>
        </div>

        {/* Report Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
            <CardDescription>Select the type of report you want to generate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant={reportType === "sales" ? "default" : "outline"}
                className="h-auto py-6 flex flex-col gap-2"
                onClick={() => setReportType("sales")}
              >
                <TrendingUp className="h-8 w-8" />
                <span className="font-semibold">Sales Report</span>
                <span className="text-xs text-muted-foreground">Revenue & Transactions</span>
              </Button>
              <Button
                variant={reportType === "inventory" ? "default" : "outline"}
                className="h-auto py-6 flex flex-col gap-2"
                onClick={() => setReportType("inventory")}
              >
                <Package className="h-8 w-8" />
                <span className="font-semibold">Inventory Report</span>
                <span className="text-xs text-muted-foreground">Stock & Valuation</span>
              </Button>
              <Button
                variant={reportType === "products" ? "default" : "outline"}
                className="h-auto py-6 flex flex-col gap-2"
                onClick={() => setReportType("products")}
              >
                <BarChart3 className="h-8 w-8" />
                <span className="font-semibold">Product Report</span>
                <span className="text-xs text-muted-foreground">Performance & Profit</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sales Report */}
        {reportType === "sales" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Sales Report</CardTitle>
                  <CardDescription>Revenue and transaction analytics</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchSalesReport}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint("sales")}
                    disabled={!salesReport}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <Select
                  value={salesPeriod}
                  onValueChange={(value: any) => {
                    setSalesPeriod(value);
                    if (value !== "custom") {
                      fetchSalesReport();
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {salesPeriod === "custom" && (
                  <>
                    <Input
                      type="date"
                      value={salesStartDate}
                      onChange={(e) => setSalesStartDate(e.target.value)}
                      className="w-[180px]"
                    />
                    <Input
                      type="date"
                      value={salesEndDate}
                      onChange={(e) => setSalesEndDate(e.target.value)}
                      className="w-[180px]"
                    />
                  </>
                )}
              </div>

              {/* Report Content */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading report...
                </div>
              ) : salesReport ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{salesReport.summary.totalSales}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(salesReport.summary.totalRevenue)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(salesReport.summary.averageSale)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Discount</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(salesReport.summary.totalDiscount)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Payment Methods</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(salesReport.paymentMethods).map(([method, amount]) => (
                        <Card key={method}>
                          <CardContent className="pt-4">
                            <div className="text-sm text-muted-foreground">{method}</div>
                            <div className="text-xl font-bold">{formatCurrency(amount)}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Top Selling Products</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Quantity Sold</TableHead>
                            <TableHead>Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesReport.topProducts.map((product, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>{product.quantity}</TableCell>
                              <TableCell>{formatCurrency(product.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Cashier Performance */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Cashier Performance</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cashier</TableHead>
                            <TableHead>Sales Count</TableHead>
                            <TableHead>Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesReport.cashierSales.map((cashier, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{cashier.name}</TableCell>
                              <TableCell>{cashier.count}</TableCell>
                              <TableCell>{formatCurrency(cashier.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available. Select filters and click Apply.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Inventory Report */}
        {reportType === "inventory" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Inventory Report</CardTitle>
                  <CardDescription>Stock levels and valuation</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchInventoryReport}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint("inventory")}
                    disabled={!inventoryReport}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <Select
                  value={inventoryCategory || "__ALL__"}
                  onValueChange={(value) => {
                    setInventoryCategory(value === "__ALL__" ? "" : value);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Report Content */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading report...
                </div>
              ) : inventoryReport ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{inventoryReport.summary.totalProducts}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{inventoryReport.summary.totalStockQuantity}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(inventoryReport.summary.totalStockValue)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{inventoryReport.summary.lowStockCount}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">{inventoryReport.summary.outOfStockCount}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Category Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Category Breakdown</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Products</TableHead>
                            <TableHead>Stock Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(inventoryReport.categoryBreakdown).map(([category, data]) => (
                            <TableRow key={category}>
                              <TableCell className="font-medium">{category}</TableCell>
                              <TableCell>{data.count}</TableCell>
                              <TableCell>{formatCurrency(data.stockValue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Inventory Items */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Inventory Items</h3>
                    <div className="rounded-md border max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Cost Price</TableHead>
                            <TableHead>Stock Value</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryReport.items.map((item) => (
                            <TableRow key={item.productId}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{item.sku}</TableCell>
                              <TableCell>{item.category}</TableCell>
                              <TableCell>{item.totalQuantity}</TableCell>
                              <TableCell>{formatCurrency(item.costPrice)}</TableCell>
                              <TableCell>{formatCurrency(item.stockValue)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    item.status === "out_of_stock"
                                      ? "destructive"
                                      : item.status === "low_stock"
                                        ? "default"
                                        : "secondary"
                                  }
                                >
                                  {item.status === "out_of_stock"
                                    ? "Out of Stock"
                                    : item.status === "low_stock"
                                      ? "Low Stock"
                                      : "In Stock"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product Report */}
        {reportType === "products" && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Product Performance Report</CardTitle>
                  <CardDescription>Sales performance and profitability analysis</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchProductReport}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint("products")}
                    disabled={!productReport}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <Input
                  type="date"
                  value={productStartDate}
                  onChange={(e) => setProductStartDate(e.target.value)}
                  placeholder="Start Date"
                  className="w-[180px]"
                />
                <Input
                  type="date"
                  value={productEndDate}
                  onChange={(e) => setProductEndDate(e.target.value)}
                  placeholder="End Date"
                  className="w-[180px]"
                />
                <Select
                  value={productCategory || "__ALL__"}
                  onValueChange={(value) => {
                    setProductCategory(value === "__ALL__" ? "" : value);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Report Content */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading report...
                </div>
              ) : productReport ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{productReport.summary.totalProducts}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(productReport.summary.totalRevenue)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(productReport.summary.totalCost)}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(productReport.summary.totalProfit)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sold</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{productReport.summary.totalSold}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Product Performance Table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Product Performance</h3>
                    <div className="rounded-md border max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Current Stock</TableHead>
                            <TableHead>Sold</TableHead>
                            <TableHead>Revenue</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Profit</TableHead>
                            <TableHead>Margin %</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productReport.products.map((product) => (
                            <TableRow key={product.productId}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{product.sku}</TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>{product.currentStock}</TableCell>
                              <TableCell>{product.totalSold}</TableCell>
                              <TableCell>{formatCurrency(product.totalRevenue)}</TableCell>
                              <TableCell>{formatCurrency(product.totalCost)}</TableCell>
                              <TableCell className={product.profit >= 0 ? "text-green-600" : "text-red-600"}>
                                {formatCurrency(product.profit)}
                              </TableCell>
                              <TableCell>{product.profitMargin.toFixed(1)}%</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    product.stockStatus === "out_of_stock"
                                      ? "destructive"
                                      : product.stockStatus === "low_stock"
                                        ? "default"
                                        : "secondary"
                                  }
                                >
                                  {product.stockStatus === "out_of_stock"
                                    ? "Out of Stock"
                                    : product.stockStatus === "low_stock"
                                      ? "Low Stock"
                                      : "In Stock"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available. Select date range and click Apply.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

// Helper functions for generating print HTML
function generateSalesReportHTML(report: SalesReport, date: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Sales Report - ${companyDetails.name}</title>
    <style>
      @media print { @page { margin: 10mm; } }
      body { font-family: Arial, sans-serif; padding: 20px; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .company-info { font-size: 12px; color: #666; margin-top: 5px; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
      .summary-card { border: 1px solid #ddd; padding: 10px; text-align: center; }
      .summary-card h3 { margin: 0 0 5px 0; font-size: 12px; color: #666; }
      .summary-card .value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f5f5f5; font-weight: bold; }
      .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Sales Report</h1>
      <div class="company-info">${companyDetails.name}</div>
      <div class="company-info">${companyDetails.address}, ${companyDetails.city}</div>
      <div class="company-info">Period: ${new Date(report.dateRange.start).toLocaleDateString()} - ${new Date(report.dateRange.end).toLocaleDateString()}</div>
      <div class="company-info">Generated: ${date}</div>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Total Sales</h3>
        <div class="value">${report.summary.totalSales}</div>
      </div>
      <div class="summary-card">
        <h3>Total Revenue</h3>
        <div class="value">Rs. ${report.summary.totalRevenue.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Average Sale</h3>
        <div class="value">Rs. ${report.summary.averageSale.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Total Discount</h3>
        <div class="value">Rs. ${report.summary.totalDiscount.toLocaleString()}</div>
      </div>
    </div>
    
    <h2>Top Selling Products</h2>
    <table>
      <thead>
        <tr><th>Product</th><th>Quantity</th><th>Revenue</th></tr>
      </thead>
      <tbody>
        ${report.topProducts.map(p => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>Rs. ${p.revenue.toLocaleString()}</td></tr>`).join("")}
      </tbody>
    </table>
    
    <div class="footer">Generated by ${companyDetails.name} POS System</div>
  </body>
</html>`;
}

function generateInventoryReportHTML(report: InventoryReport, date: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Inventory Report - ${companyDetails.name}</title>
    <style>
      @media print { @page { margin: 10mm; } }
      body { font-family: Arial, sans-serif; padding: 20px; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .company-info { font-size: 12px; color: #666; margin-top: 5px; }
      .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
      .summary-card { border: 1px solid #ddd; padding: 10px; text-align: center; }
      .summary-card h3 { margin: 0 0 5px 0; font-size: 12px; color: #666; }
      .summary-card .value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f5f5f5; font-weight: bold; }
      .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Inventory Report</h1>
      <div class="company-info">${companyDetails.name}</div>
      <div class="company-info">${companyDetails.address}, ${companyDetails.city}</div>
      <div class="company-info">Generated: ${date}</div>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Total Products</h3>
        <div class="value">${report.summary.totalProducts}</div>
      </div>
      <div class="summary-card">
        <h3>Total Stock</h3>
        <div class="value">${report.summary.totalStockQuantity}</div>
      </div>
      <div class="summary-card">
        <h3>Stock Value</h3>
        <div class="value">Rs. ${report.summary.totalStockValue.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Low Stock</h3>
        <div class="value">${report.summary.lowStockCount}</div>
      </div>
      <div class="summary-card">
        <h3>Out of Stock</h3>
        <div class="value">${report.summary.outOfStockCount}</div>
      </div>
    </div>
    
    <h2>Category Breakdown</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Products</th><th>Stock Value</th></tr>
      </thead>
      <tbody>
        ${Object.entries(report.categoryBreakdown).map(([cat, data]) => `<tr><td>${cat}</td><td>${data.count}</td><td>Rs. ${data.stockValue.toLocaleString()}</td></tr>`).join("")}
      </tbody>
    </table>
    
    <div class="footer">Generated by ${companyDetails.name} POS System</div>
  </body>
</html>`;
}

function generateProductReportHTML(report: ProductReport, date: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Product Performance Report - ${companyDetails.name}</title>
    <style>
      @media print { @page { margin: 10mm; } }
      body { font-family: Arial, sans-serif; padding: 20px; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .company-info { font-size: 12px; color: #666; margin-top: 5px; }
      .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
      .summary-card { border: 1px solid #ddd; padding: 10px; text-align: center; }
      .summary-card h3 { margin: 0 0 5px 0; font-size: 12px; color: #666; }
      .summary-card .value { font-size: 18px; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
      th { background-color: #f5f5f5; font-weight: bold; }
      .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Product Performance Report</h1>
      <div class="company-info">${companyDetails.name}</div>
      <div class="company-info">${companyDetails.address}, ${companyDetails.city}</div>
      <div class="company-info">Period: ${new Date(report.dateRange.start).toLocaleDateString()} - ${new Date(report.dateRange.end).toLocaleDateString()}</div>
      <div class="company-info">Generated: ${date}</div>
    </div>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Total Products</h3>
        <div class="value">${report.summary.totalProducts}</div>
      </div>
      <div class="summary-card">
        <h3>Total Revenue</h3>
        <div class="value">Rs. ${report.summary.totalRevenue.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Total Cost</h3>
        <div class="value">Rs. ${report.summary.totalCost.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Total Profit</h3>
        <div class="value">Rs. ${report.summary.totalProfit.toLocaleString()}</div>
      </div>
      <div class="summary-card">
        <h3>Total Sold</h3>
        <div class="value">${report.summary.totalSold}</div>
      </div>
    </div>
    
    <h2>Product Performance</h2>
    <table>
      <thead>
        <tr>
          <th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Sold</th>
          <th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin %</th>
        </tr>
      </thead>
      <tbody>
        ${report.products.slice(0, 50).map(p => `
          <tr>
            <td>${p.name}</td><td>${p.sku}</td><td>${p.category}</td><td>${p.currentStock}</td><td>${p.totalSold}</td>
            <td>Rs. ${p.totalRevenue.toLocaleString()}</td><td>Rs. ${p.totalCost.toLocaleString()}</td>
            <td>Rs. ${p.profit.toLocaleString()}</td><td>${p.profitMargin.toFixed(1)}%</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    
    <div class="footer">Generated by ${companyDetails.name} POS System</div>
  </body>
</html>`;
}
