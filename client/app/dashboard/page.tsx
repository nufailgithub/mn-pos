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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Receipt,
  Wallet,
  ShoppingCart,
} from "lucide-react";

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank / UPI",
  CARD: "Card",
  MOBILE: "Mobile",
  CREDIT: "Credit",
  LOAN: "Loan",
};

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

type DashboardStats = {
  todaySales: { total: number; count: number };
  yesterdaySales: { total: number; count: number };
  totalProducts: number;
  lowStockProducts: number;
  revenueByDay: Array<{ date: string; fullDate: string; revenue: number; count: number }>;
  paymentMethodChart: Array<{ name: string; value: number }>;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    total: number;
    createdAt: string;
    cashier: { name: string };
    saleItems: Array<{ product: { name: string }; quantity: number }>;
    payments: Array<{ method: string; amount: number }>;
  }>;
};

function formatPaymentMethods(payments: Array<{ method: string; amount: number }> | undefined): string {
  if (!payments?.length) return "—";
  const byMethod: Record<string, number> = {};
  payments.forEach((p) => {
    const label = PAYMENT_LABEL[p.method] ?? p.method;
    byMethod[label] = (byMethod[label] ?? 0) + p.amount;
  });
  return Object.entries(byMethod)
    .map(([name, amt]) => `${name} (Rs.${Math.round(amt).toLocaleString()})`)
    .join(", ");
}

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
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-muted-foreground">
            <div className="animate-pulse text-lg">Loading dashboard...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!stats) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </MainLayout>
    );
  }

  const todayTotal = stats.todaySales.total;
  const yesterdayTotal = stats.yesterdaySales.total;
  const revenueChange = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : (todayTotal > 0 ? 100 : 0);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Business overview and sales flow at a glance
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today&apos;s Revenue
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.todaySales.total)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.todaySales.count} orders
              </p>
              {yesterdayTotal > 0 && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {revenueChange >= 0 && <TrendingUp className="h-3 w-3" />}
                  {revenueChange < 0 && <TrendingDown className="h-3 w-3" />}
                  {revenueChange >= 0 ? "+" : ""}{revenueChange.toFixed(1)}% vs yesterday
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders Today
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySales.count}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mt-1">In inventory</p>
            </CardContent>
          </Card>

          <Card className={stats.lowStockProducts > 0 ? "border-l-4 border-l-destructive" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Low Stock
              </CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats.lowStockProducts > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.lowStockProducts > 0 ? "text-destructive" : ""}`}>
                {stats.lowStockProducts}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.lowStockProducts > 0 ? "Action needed" : "All good"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Revenue trend
              </CardTitle>
              <CardDescription>Last 7 days — business flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.revenueByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => (v >= 1000 ? `Rs.${(v / 1000).toFixed(0)}k` : `Rs.${v}`)}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ""}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#revenueGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Payment methods
              </CardTitle>
              <CardDescription>Last 7 days — how customers pay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                {stats.paymentMethodChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.paymentMethodChart}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.paymentMethodChart.map((entry, index) => (
                          <Cell key={`${entry.name}-${entry.value}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "Amount"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No payment data in the last 7 days
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
            <CardDescription>Latest completed transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No recent sales</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale #</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono font-medium">{sale.saleNumber}</TableCell>
                        <TableCell>{sale.cashier.name}</TableCell>
                        <TableCell>{sale.saleItems?.length ?? 0} item(s)</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground max-w-[220px] inline-block truncate" title={formatPaymentMethods(sale.payments)}>
                            {formatPaymentMethods(sale.payments)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
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
      </div>
    </MainLayout>
  );
}
