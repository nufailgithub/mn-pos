import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

// GET /api/reports/products - Get product performance report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category") || "";

    const dateRange = {
      start: startDate ? new Date(startDate) : startOfDay(new Date()),
      end: endDate ? new Date(endDate) : endOfDay(new Date()),
    };

    // Get all products
    const where: any = {};
    if (category) {
      where.category = { name: category };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
        productSizes: true,
        saleItems: {
          where: {
            sale: {
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
              status: "COMPLETED",
            },
          },
          include: {
            sale: {
              select: {
                createdAt: true,
                total: true,
              },
            },
          },
        },
      },
    });

    // Calculate product performance
    const productPerformance = products.map(product => {
      const totalQty = product.freeSize
        ? product.productSizes[0]?.quantity || 0
        : product.productSizes.reduce((sum, ps) => sum + ps.quantity, 0);

      // Sales data
      const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = product.saleItems.reduce((sum, item) => sum + item.subtotal, 0);
      const totalCost = totalSold * product.costPrice;
      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        currentStock: totalQty,
        totalSold,
        totalRevenue,
        totalCost,
        profit,
        profitMargin,
        stockStatus: totalQty === 0 ? "out_of_stock" : totalQty <= product.stockAlertLimit ? "low_stock" : "in_stock",
      };
    });

    // Sort by revenue (top sellers first)
    productPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Summary
    const summary = {
      totalProducts: products.length,
      totalRevenue: productPerformance.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalCost: productPerformance.reduce((sum, p) => sum + p.totalCost, 0),
      totalProfit: productPerformance.reduce((sum, p) => sum + p.profit, 0),
      totalSold: productPerformance.reduce((sum, p) => sum + p.totalSold, 0),
    };

    return NextResponse.json({
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      summary,
      products: productPerformance,
    });
  } catch (error) {
    console.error("Error generating product report:", error);
    return NextResponse.json(
      { error: "Failed to generate product report" },
      { status: 500 }
    );
  }
}
