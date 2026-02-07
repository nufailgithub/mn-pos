import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/stock - Get stock list with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const size = searchParams.get("size") || "";
    const status = searchParams.get("status") || ""; // "in", "low", "out"
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { productId: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { name: category };
    }

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
      orderBy: { createdAt: "desc" },
    });

    // Transform to stock items (one row per size)
    let stockItems: any[] = [];
    
    products.forEach(product => {
      if (product.freeSize) {
        const freeSize = product.productSizes.find(ps => ps.size === "FREE");
        if (freeSize) {
          stockItems.push({
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
          });
        }
      } else {
        product.productSizes.forEach(ps => {
          stockItems.push({
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
          });
        });
      }
    });

    // Apply size filter
    if (size) {
      stockItems = stockItems.filter(item => item.size === size);
    }

    // Apply status filter
    if (status === "out") {
      stockItems = stockItems.filter(item => item.quantity === 0);
    } else if (status === "low") {
      stockItems = stockItems.filter(item => item.quantity > 0 && item.quantity <= item.alertLimit);
    } else if (status === "in") {
      stockItems = stockItems.filter(item => item.quantity > item.alertLimit);
    }

    const total = stockItems.length;
    const paginatedItems = stockItems.slice(skip, skip + limit);

    // Calculate summary stats
    const totalProducts = new Set(stockItems.map(item => item.productId)).size;
    const totalStockQty = stockItems.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = stockItems.filter(item => item.quantity > 0 && item.quantity <= item.alertLimit).length;
    const outOfStockCount = stockItems.filter(item => item.quantity === 0).length;

    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalProducts,
        totalStockQty,
        lowStockCount,
        outOfStockCount,
      },
    });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock" },
      { status: 500 }
    );
  }
}
