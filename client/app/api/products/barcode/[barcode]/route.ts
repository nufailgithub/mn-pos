import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/products/barcode/[barcode] - Get product by barcode
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> | { barcode: string } }
) {
  try {
    const { barcode } = await Promise.resolve(params);

    const product = await prisma.product.findUnique({
      where: { barcode },
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

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate total quantity
    const totalQuantity = product.freeSize
      ? product.productSizes[0]?.quantity || 0
      : product.productSizes.reduce((sum, size) => sum + size.quantity, 0);

    return NextResponse.json({
      ...product,
      totalQuantity,
    });
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
