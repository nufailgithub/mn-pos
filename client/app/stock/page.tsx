"use client";

import { useEffect, useState } from "react";
import MainLayout from "../_components/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stockApi, type StockItem } from "@/lib/api/stock";
import { toast } from "sonner";
import { Search } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["Kids", "Men", "Ladies"] as const;
const ALL_CATEGORIES = "__ALL__";
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];

function getStatus(quantity: number, alertLimit: number) {
  if (quantity === 0) return { label: "Out of Stock", color: "destructive" };
  if (quantity <= alertLimit)
    return { label: "Low Stock", color: "default" };
  return { label: "In Stock", color: "secondary" };
}

export default function StockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [size, setSize] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalStockQty: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, size, status, page]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const categoryFilter = category === ALL_CATEGORIES ? undefined : category;
      const statusFilter = status || undefined;
      const sizeFilter = size || undefined;

      const result = await stockApi.getList({
        page,
        limit: 50,
        search: search || undefined,
        category: categoryFilter,
        size: sizeFilter,
        status: statusFilter as "in" | "low" | "out" | undefined,
      });

      setStockItems(result.items);
      setSummary(result.summary);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to fetch stock:", error);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage product stock size-wise
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Products</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summary.totalProducts}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Stock Qty</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summary.totalStockQty}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-yellow-600">
              {summary.lowStockCount}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Out of Stock</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">
              {summary.outOfStockCount}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by product / SKU"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
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

            <Select
              value={size || "__ALL__"}
              onValueChange={(value) => {
                setSize(value === "__ALL__" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Sizes</SelectItem>
                {SIZES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status || "__ALL__"}
              onValueChange={(value) => {
                setStatus(value === "__ALL__" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All Status</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Stock Table */}
        <Card>
          <CardContent className="p-0">
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading stock data...
              </div>
            )}
            {!loading && stockItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No stock items found
              </div>
            )}
            {!loading && stockItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-left">Size</th>
                      <th className="p-3 text-left">Available Qty</th>
                      <th className="p-3 text-left">Alert Limit</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stockItems.map((item) => {
                      const status = getStatus(
                        item.quantity,
                        item.alertLimit
                      );

                      // Determine badge variant
                      let badgeVariant: "default" | "secondary" | "destructive" = "default";
                      if (status.color === "destructive") {
                        badgeVariant = "destructive";
                      } else if (status.color === "secondary") {
                        badgeVariant = "secondary";
                      }

                      return (
                        <tr key={item.id} className="border-b">
                          <td className="p-3">
                            <div className="font-medium">
                              {item.productName}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {item.sku}
                            </div>
                          </td>
                          <td className="p-3">{item.category}</td>
                          <td className="p-3">{item.size}</td>
                          <td className="p-3">{item.quantity}</td>
                          <td className="p-3">{item.alertLimit}</td>
                          <td className="p-3">
                            <Badge variant={badgeVariant}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Link href={`/stock/adjustment?productId=${item.productId}&size=${item.size}&productSizeId=${item.productSizeId}`}>
                              <Button size="sm" variant="outline">
                                Adjust
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
