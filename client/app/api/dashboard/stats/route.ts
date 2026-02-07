import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

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

    // Recent sales
    const recentSales = await prisma.sale.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        cashier: {
          select: {
            name: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      todaySales: {
        total: todaySales._sum.total || 0,
        count: todaySales._count,
      },
      totalProducts,
      lowStockProducts,
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
