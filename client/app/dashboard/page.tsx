"use client";

import { useEffect, useState } from "react";
import MainLayout from "../_components/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type DashboardStats = {
  todaySales: {
    total: number;
    count: number;
  };
  totalProducts: number;
  lowStockProducts: number;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    cashier: {
      name: string;
    };
    saleItems: Array<{
      product: {
        name: string;
      };
      quantity: number;
    }>;
  }>;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your POS system overview
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading dashboard statistics...
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Today's Sales"
                value={formatCurrency(stats.todaySales.total)}
                change={`${stats.todaySales.count} orders`}
              />
              <StatCard
                title="Total Orders"
                value={stats.todaySales.count.toString()}
                change="Today"
              />
              <StatCard
                title="Total Products"
                value={stats.totalProducts.toString()}
                change="In inventory"
              />
              <StatCard
                title="Low Stock"
                value={stats.lowStockProducts.toString()}
                change="Action needed"
                alert={stats.lowStockProducts > 0}
              />
            </div>

            {/* Recent Sales */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent sales
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sale Number</TableHead>
                          <TableHead>Cashier</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.recentSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                              {sale.saleNumber}
                            </TableCell>
                            <TableCell>{sale.cashier.name}</TableCell>
                            <TableCell>
                              {sale.saleItems.length} item(s)
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(sale.total)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{sale.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(sale.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function StatCard({
  title,
  value,
  change,
  alert,
}: Readonly<{
  title: string;
  value: string;
  change: string;
  alert?: boolean;
}>) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p
          className={`text-sm mt-2 ${
            alert ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {change}
        </p>
      </CardContent>
    </Card>
  );
}
