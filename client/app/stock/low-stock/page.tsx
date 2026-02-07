"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/app/_components/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stockApi, type StockItem } from "@/lib/api/stock";
import { toast } from "sonner";
import Link from "next/link";

function getStatus(quantity: number, alertLimit: number) {
  if (quantity === 0) return { label: "Out of Stock", color: "destructive" };
  if (quantity <= alertLimit)
    return { label: "Low Stock", color: "default" };
  return { label: "In Stock", color: "secondary" };
}

export default function LowStockPage() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    fetchLowStock();
  }, [page]);

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const result = await stockApi.getLowStock({
        page,
        limit: 50,
      });

      setStockItems(result.items);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to fetch low stock:", error);
      toast.error("Failed to load low stock items");
    } finally {
      setLoading(false);
    }
  };

  const outOfStockCount = stockItems.filter((item) => item.quantity === 0).length;
  const lowStockCount = stockItems.filter(
    (item) => item.quantity > 0 && item.quantity <= item.alertLimit
  ).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Low Stock</h1>
          <p className="text-muted-foreground mt-2">
            Products that need restocking attention
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Out of Stock</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">
              {outOfStockCount}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-yellow-600">
              {lowStockCount}
            </CardContent>
          </Card>
        </div>

        {/* Stock Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading low stock items...
              </div>
            ) : stockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No low stock items found. Great job! 🎉
              </div>
            ) : (
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
                          <td className="p-3 font-medium">{item.quantity}</td>
                          <td className="p-3">{item.alertLimit}</td>
                          <td className="p-3">
                            <Badge variant={status.color === "destructive" ? "destructive" : status.color === "secondary" ? "secondary" : "default"}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Link
                              href={`/stock/adjustment?productId=${item.productId}&size=${item.size}&productSizeId=${item.productSizeId}`}
                            >
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
