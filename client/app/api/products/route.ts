import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validations/product";
import { fromZodError } from "zod-validation-error";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { productId: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = { name: category };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
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
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate total quantity for each product
    const productsWithTotalQuantity = products.map(product => {
      const totalQuantity = product.freeSize 
        ? product.productSizes[0]?.quantity || 0
        : product.productSizes.reduce((sum, size) => sum + size.quantity, 0);
      
      return {
        ...product,
        totalQuantity,
      };
    });

    return NextResponse.json({
      products: productsWithTotalQuantity,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createProductSchema.parse(body);

    // Generate SKU
    const sku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create category
      let category = await tx.category.findUnique({
        where: { name: validated.category },
      });

      if (!category) {
        category = await tx.category.create({
          data: { name: validated.category },
        });
      }

      // Find or create subcategory if provided
      let subCategory = null;
      if (validated.subCategory) {
        subCategory = await tx.subCategory.findFirst({
          where: {
            name: validated.subCategory,
            categoryId: category.id,
          },
        });

        if (!subCategory) {
          subCategory = await tx.subCategory.create({
            data: {
              name: validated.subCategory,
              categoryId: category.id,
            },
          });
        }
      }

      // Generate barcode if not provided
      const barcode = validated.barcode || `BAR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      // Create product
      const product = await tx.product.create({
        data: {
          name: validated.name,
          productId: validated.productId,
          sku,
          barcode,
          categoryId: category.id,
          subCategoryId: subCategory?.id,
          costPrice: validated.costPrice,
          sellingPrice: validated.sellingPrice,
          brand: validated.brand,
          stockAlertLimit: validated.stockAlertLimit,
          freeSize: validated.freeSize,
        },
      });

      // Create product sizes
      if (validated.freeSize && validated.sizes?.[0]) {
        // For free size, create a single size entry
        await tx.productSize.create({
          data: {
            productId: product.id,
            size: "FREE",
            quantity: validated.sizes[0].quantity,
          },
        });
      } else if (validated.sizes && validated.sizes.length > 0) {
        // Create multiple size entries
        await tx.productSize.createMany({
          data: validated.sizes
            .filter(size => size.quantity > 0)
            .map(size => ({
              productId: product.id,
              size: size.size,
              quantity: size.quantity,
            })),
        });
      }

      // Return product with relations
      return await tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          subCategory: true,
          productSizes: true,
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating product:", error);

    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Product with this Product ID or barcode already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}