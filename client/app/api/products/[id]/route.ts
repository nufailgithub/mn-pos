import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateProductSchema } from "@/lib/validations/product";
import { fromZodError } from "zod-validation-error";

// GET /api/products/[id] - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    const product = await prisma.product.findUnique({
      where: { id },
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
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: productId } = await Promise.resolve(params);
    const body = await request.json();
    const validated = updateProductSchema.parse(body);

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create category if provided
      let categoryId: string | undefined;
      if (validated.category) {
        let category = await tx.category.findUnique({
          where: { name: validated.category },
        });

        if (!category) {
          category = await tx.category.create({
            data: { name: validated.category },
          });
        }
        categoryId = category.id;
      }

      // Find or create subcategory if provided
      let subCategoryId: string | null | undefined;
      if (validated.subCategory && categoryId) {
        let subCategory = await tx.subCategory.findFirst({
          where: {
            name: validated.subCategory,
            categoryId,
          },
        });

        if (!subCategory) {
          subCategory = await tx.subCategory.create({
            data: {
              name: validated.subCategory,
              categoryId,
            },
          });
        }
        subCategoryId = subCategory.id;
      } else if (validated.subCategory === null) {
        subCategoryId = null;
      }

      // Generate new barcode if provided, otherwise keep existing
      // If barcode is explicitly provided, use it; otherwise generate a new one
      const newBarcode = validated.barcode || `BAR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Prepare update data
      const updateData: any = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.productId !== undefined) updateData.productId = validated.productId;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (subCategoryId !== undefined) updateData.subCategoryId = subCategoryId;
      if (validated.costPrice !== undefined) updateData.costPrice = validated.costPrice;
      if (validated.sellingPrice !== undefined) updateData.sellingPrice = validated.sellingPrice;
      if (validated.brand !== undefined) updateData.brand = validated.brand;
      if (validated.stockAlertLimit !== undefined) updateData.stockAlertLimit = validated.stockAlertLimit;
      if (validated.freeSize !== undefined) updateData.freeSize = validated.freeSize;
      updateData.barcode = newBarcode; // Always update barcode (new one generated)

      // Update product
      const product = await tx.product.update({
        where: { id: productId },
        data: updateData,
      });

      // Update product sizes if provided
      if (validated.sizes !== undefined) {
        // Delete existing sizes
        await tx.productSize.deleteMany({
          where: { productId: product.id },
        });

        // Create new sizes
        if (validated.freeSize && validated.sizes[0]) {
          await tx.productSize.create({
            data: {
              productId: product.id,
              size: "FREE",
              quantity: validated.sizes[0].quantity,
            },
          });
        } else if (validated.sizes.length > 0) {
          await tx.productSize.createMany({
            data: validated.sizes
              .filter((size) => size.quantity > 0)
              .map((size) => ({
                productId: product.id,
                size: size.size,
                quantity: size.quantity,
              })),
          });
        }
      }

      // Return product with relations
      return await tx.product.findUnique({
        where: { id: product.id },
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
    });

    if (!result) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate total quantity
    const totalQuantity = result.freeSize
      ? result.productSizes[0]?.quantity || 0
      : result.productSizes.reduce((sum, size) => sum + size.quantity, 0);

    return NextResponse.json({
      ...result,
      totalQuantity,
    });
  } catch (error: any) {
    console.error("Error updating product:", error);

    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await Promise.resolve(params);
    
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        saleItems: {
          take: 1,
        },
        stockAdjustments: {
          take: 1,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if product has been used in sales
    if (product.saleItems.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete product that has been sold. Product is referenced in sales records." },
        { status: 400 }
      );
    }

    // Delete in transaction to handle all related records
    await prisma.$transaction(async (tx) => {
      // Delete stock adjustments first (if any)
      await tx.stockAdjustment.deleteMany({
        where: { productId: id },
      });

      // Delete product sizes (cascade should handle this, but being explicit)
      await tx.productSize.deleteMany({
        where: { productId: id },
      });

      // Finally delete the product
      await tx.product.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting product:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete product. It is referenced in other records." },
        { status: 400 }
      );
    }

    const errorMessage = error.message || "Failed to delete product";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
