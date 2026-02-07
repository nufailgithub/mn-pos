import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

// GET /api/reports/sales - Get sales report with summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period") || "custom"; // today, week, month, year, custom

    let dateRange: { start: Date; end: Date };
    const now = new Date();

    // Set date range based on period
    switch (period) {
      case "today":
        dateRange = {
          start: startOfDay(now),
          end: endOfDay(now),
        };
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        dateRange = {
          start: startOfDay(weekStart),
          end: endOfDay(now),
        };
        break;
      case "month":
        dateRange = {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
        break;
      case "year":
        dateRange = {
          start: startOfYear(now),
          end: endOfYear(now),
        };
        break;
      default:
        // custom
        dateRange = {
          start: startDate ? new Date(startDate) : startOfDay(now),
          end: endDate ? new Date(endDate) : endOfDay(now),
        };
    }

    const where = {
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      status: "COMPLETED",
    };

    // Get sales with details
    const sales = await prisma.sale.findMany({
      where,
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        saleItems: {
          include: {
            product: {
              include: {
                category: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate summary statistics
    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.total, 0),
      totalSubtotal: sales.reduce((sum, sale) => sum + sale.subtotal, 0),
      totalTax: sales.reduce((sum, sale) => sum + sale.tax, 0),
      totalDiscount: sales.reduce((sum, sale) => sum + sale.discount, 0),
      averageSale: sales.length > 0 
        ? sales.reduce((sum, sale) => sum + sale.total, 0) / sales.length 
        : 0,
    };

    // Payment method breakdown
    const paymentMethods = sales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    // Top products by quantity sold
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach(sale => {
      sale.saleItems.forEach(item => {
        const key = item.product.id;
        if (!productSales[key]) {
          productSales[key] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.subtotal;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Sales by cashier
    const cashierSales: Record<string, { name: string; count: number; revenue: number }> = {};
    sales.forEach(sale => {
      const key = sale.cashier.id;
      if (!cashierSales[key]) {
        cashierSales[key] = {
          name: sale.cashier.name,
          count: 0,
          revenue: 0,
        };
      }
      cashierSales[key].count += 1;
      cashierSales[key].revenue += sale.total;
    });

    return NextResponse.json({
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      summary,
      paymentMethods,
      topProducts,
      cashierSales: Object.values(cashierSales),
      sales,
    });
  } catch (error) {
    console.error("Error generating sales report:", error);
    return NextResponse.json(
      { error: "Failed to generate sales report" },
      { status: 500 }
    );
  }
}
