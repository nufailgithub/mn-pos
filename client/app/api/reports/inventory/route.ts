import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/reports/inventory - Get inventory report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";

    const where: any = {};
    if (category) {
      where.category = { name: category };
    }

    // Get all products with sizes
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
        subCategory: {
          select: { name: true },
        },
        productSizes: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Calculate inventory summary
    let totalProducts = 0;
    let totalStockValue = 0;
    let totalStockQuantity = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const inventoryItems: Array<{
      productId: string;
      name: string;
      sku: string;
      category: string;
      costPrice: number;
      sellingPrice: number;
      totalQuantity: number;
      stockValue: number;
      status: string;
    }> = [];

    products.forEach(product => {
      const totalQty = product.freeSize
        ? product.productSizes[0]?.quantity || 0
        : product.productSizes.reduce((sum, ps) => sum + ps.quantity, 0);

      const stockValue = totalQty * product.costPrice;
      totalStockValue += stockValue;
      totalStockQuantity += totalQty;

      let status = "in_stock";
      if (totalQty === 0) {
        status = "out_of_stock";
        outOfStockCount++;
      } else if (totalQty <= product.stockAlertLimit) {
        status = "low_stock";
        lowStockCount++;
      }

      inventoryItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        totalQuantity: totalQty,
        stockValue,
        status,
      });

      totalProducts++;
    });

    // Category breakdown
    const categoryBreakdown: Record<string, { count: number; stockValue: number }> = {};
    inventoryItems.forEach(item => {
      if (!categoryBreakdown[item.category]) {
        categoryBreakdown[item.category] = { count: 0, stockValue: 0 };
      }
      categoryBreakdown[item.category].count++;
      categoryBreakdown[item.category].stockValue += item.stockValue;
    });

    return NextResponse.json({
      summary: {
        totalProducts,
        totalStockQuantity,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
      },
      categoryBreakdown,
      items: inventoryItems,
    });
  } catch (error) {
    console.error("Error generating inventory report:", error);
    return NextResponse.json(
      { error: "Failed to generate inventory report" },
      { status: 500 }
    );
  }
}
