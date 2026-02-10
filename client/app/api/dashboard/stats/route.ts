import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank / UPI",
  CARD: "Card",
  MOBILE: "Mobile",
  CREDIT: "Credit",
  LOAN: "Loan",
};

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Today's sales
    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: "COMPLETED",
      },
      _sum: {
        total: true,
      },
      _count: true,
    });

    // Yesterday for comparison
    const yesterdayStart = startOfDay(subDays(today, 1));
    const yesterdayEnd = endOfDay(subDays(today, 1));
    const yesterdaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        status: "COMPLETED",
      },
      _sum: { total: true },
      _count: true,
    });

    // Total products
    const totalProducts = await prisma.product.count();

    // Low stock products - count unique products (not individual size items)
    // A product is considered low stock if ANY of its sizes has quantity <= stockAlertLimit
    const allProducts = await prisma.product.findMany({
      include: {
        productSizes: true,
      },
    });

    // Count unique products with low stock (not individual size items)
    const lowStockProductIds = new Set<string>();
    
    allProducts.forEach(product => {
      if (product.freeSize) {
        const freeSizeQty = product.productSizes.find(ps => ps.size === "FREE")?.quantity || 0;
        if (freeSizeQty <= product.stockAlertLimit) {
          lowStockProductIds.add(product.id);
        }
      } else {
        // For sized products, check if any size is low stock
        const hasLowStock = product.productSizes.some(ps => ps.quantity <= product.stockAlertLimit);
        if (hasLowStock) {
          lowStockProductIds.add(product.id);
        }
      }
    });

    const lowStockProducts = lowStockProductIds.size;

    // Revenue by day (last 7 days) for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    const revenueByDay = await Promise.all(
      last7Days.map(async (day) => {
        const start = startOfDay(day);
        const end = endOfDay(day);
        const agg = await prisma.sale.aggregate({
          where: {
            createdAt: { gte: start, lte: end },
            status: "COMPLETED",
          },
          _sum: { total: true },
          _count: true,
        });
        return {
          date: format(day, "MMM d"),
          fullDate: format(day, "yyyy-MM-dd"),
          revenue: agg._sum.total ?? 0,
          count: agg._count,
        };
      })
    );

    // Payment method breakdown (last 7 days) for chart
    const sevenDaysAgo = startOfDay(subDays(today, 6));
    const salesWithPayments = await prisma.sale.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: "COMPLETED",
      },
      include: { payments: true },
    });
    const paymentMethodBreakdown: Record<string, number> = {};
    salesWithPayments.forEach((sale) => {
      sale.payments.forEach((p) => {
        const label = PAYMENT_METHOD_LABEL[p.method] ?? p.method;
        paymentMethodBreakdown[label] = (paymentMethodBreakdown[label] ?? 0) + p.amount;
      });
    });
    const paymentMethodChart = Object.entries(paymentMethodBreakdown).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));

    // Recent sales with payments
    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: { status: "COMPLETED" },
      include: {
        cashier: { select: { name: true } },
        saleItems: {
          include: { product: { select: { name: true } } },
        },
        payments: true,
      },
    });

    return NextResponse.json({
      todaySales: {
        total: todaySales._sum.total ?? 0,
        count: todaySales._count,
      },
      yesterdaySales: {
        total: yesterdaySales._sum.total ?? 0,
        count: yesterdaySales._count,
      },
      totalProducts,
      lowStockProducts,
      revenueByDay,
      paymentMethodChart,
      recentSales,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
