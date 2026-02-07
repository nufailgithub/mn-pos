import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/stock/low-stock - Get products with low stock
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const products = await prisma.product.findMany({
      include: {
        category: {
          select: { name: true },
        },
        subCategory: {
          select: { name: true },
        },
        productSizes: true,
      },
    });

    // Filter products with low stock
    const lowStockItems: any[] = [];
    
    products.forEach(product => {
      if (product.freeSize) {
        const freeSize = product.productSizes.find(ps => ps.size === "FREE");
        if (freeSize && freeSize.quantity <= product.stockAlertLimit) {
          lowStockItems.push({
            id: `${product.id}-FREE`,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            productIdField: product.productId,
            category: product.category.name,
            size: "FREE",
            quantity: freeSize.quantity,
            alertLimit: product.stockAlertLimit,
            productSizeId: freeSize.id,
            status: freeSize.quantity === 0 ? "out" : "low",
          });
        }
      } else {
        product.productSizes.forEach(ps => {
          if (ps.quantity <= product.stockAlertLimit) {
            lowStockItems.push({
              id: `${product.id}-${ps.size}`,
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              productIdField: product.productId,
              category: product.category.name,
              size: ps.size,
              quantity: ps.quantity,
              alertLimit: product.stockAlertLimit,
              productSizeId: ps.id,
              status: ps.quantity === 0 ? "out" : "low",
            });
          }
        });
      }
    });

    // Sort by quantity (lowest first)
    lowStockItems.sort((a, b) => a.quantity - b.quantity);

    const total = lowStockItems.length;
    const paginatedItems = lowStockItems.slice(skip, skip + limit);

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching low stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch low stock items" },
      { status: 500 }
    );
  }
}
