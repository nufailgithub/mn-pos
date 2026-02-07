"use client";

import { useEffect, useState } from "react";
import MainLayout from "@/app/_components/MainLayout";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stockApi, type StockAdjustment } from "@/lib/api/stock";
import { toast } from "sonner";
import { Search } from "lucide-react";

const REASON_OPTIONS = [
  { value: "NEW_STOCK_ARRIVAL", label: "New Stock Arrival" },
  { value: "DAMAGED_ITEM", label: "Damaged Item" },
  { value: "LOST_THEFT", label: "Lost / Theft" },
  { value: "MANUAL_CORRECTION", label: "Manual Correction" },
  { value: "RETURN_FROM_CUSTOMER", label: "Return from Customer" },
  { value: "OTHER", label: "Other" },
] as const;

export default function StockHistoryPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, actionType, reason, date, page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const result = await stockApi.getHistory({
        page,
        limit: 50,
        search: search || undefined,
        actionType: actionType as "ADD" | "REDUCE" | undefined,
        reason: reason || undefined,
        date: date || undefined,
      });

      setAdjustments(result.adjustments);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to fetch stock history:", error);
      toast.error("Failed to load stock history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getReasonLabel = (reason: string) => {
    return REASON_OPTIONS.find((opt) => opt.value === reason)?.label || reason;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Stock History
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete audit log of all stock movements
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit Log</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search Product / SKU"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={actionType || "__ALL__"}
                onValueChange={(value) => {
                  setActionType(value === "__ALL__" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All Actions</SelectItem>
                  <SelectItem value="ADD">Add Stock</SelectItem>
                  <SelectItem value="REDUCE">Reduce Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={reason || "__ALL__"}
                onValueChange={(value) => {
                  setReason(value === "__ALL__" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ALL__">All Reasons</SelectItem>
                  {REASON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Table */}
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading history...
              </div>
            )}
            {!loading && adjustments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No stock adjustments found
              </div>
            )}
            {!loading && adjustments.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Before</TableHead>
                      <TableHead>After</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {adjustments.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.createdAt)}</TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {row.product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.product.sku}
                          </div>
                        </TableCell>
                        <TableCell>{row.size || "FREE"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={row.type === "ADD" ? "default" : "destructive"}
                          >
                            {row.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            row.type === "ADD"
                              ? "text-green-600 font-medium"
                              : "text-red-600 font-medium"
                          }
                        >
                          {row.type === "ADD" ? `+${row.quantity}` : `-${row.quantity}`}
                        </TableCell>
                        <TableCell>{row.beforeQty}</TableCell>
                        <TableCell className="font-medium">
                          {row.afterQty}
                        </TableCell>
                        <TableCell>
                          <div>{getReasonLabel(row.reason)}</div>
                          {row.reasonNote && (
                            <div className="text-xs text-muted-foreground">
                              {row.reasonNote}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{row.adjustedByUser.name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Showing {adjustments.length} of {pagination.total} records
                </div>
                <div className="flex gap-2">
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
                    onClick={() =>
                      setPage((p) => Math.min(pagination.pages, p + 1))
                    }
                    disabled={page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
