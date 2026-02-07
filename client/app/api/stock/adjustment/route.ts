import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  productSizeId: z.string().optional(),
  size: z.string().optional(),
  type: z.enum(["ADD", "REDUCE"]),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  reason: z.enum([
    "NEW_STOCK_ARRIVAL",
    "DAMAGED_ITEM",
    "LOST_THEFT",
    "MANUAL_CORRECTION",
    "RETURN_FROM_CUSTOMER",
    "OTHER",
  ]),
  reasonNote: z.string().optional(),
});

// POST /api/stock/adjustment - Create stock adjustment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = adjustmentSchema.parse(body);

    // Get user from session
    const session = await auth();
    let adjustedBy: string;
    
    if (session?.user?.id) {
      adjustedBy = session.user.id;
    } else {
      const defaultUser = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      
      if (!defaultUser) {
        return NextResponse.json(
          { error: "No active user found. Please create a user first." },
          { status: 400 }
        );
      }
      
      adjustedBy = defaultUser.id;
    }

    // Perform adjustment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Access models from transaction client
      // Prisma client uses camelCase for model names
      const stockAdjustmentModel = (tx as any).stockAdjustment;
      if (!stockAdjustmentModel) {
        console.error("Available models in transaction client:", Object.keys(tx).filter(key => !key.startsWith('$')));
        throw new Error(
          "StockAdjustment model not found in Prisma client. " +
          "Please run 'npx prisma generate' in the client directory and restart your dev server."
        );
      }
      // Get product and product size
      const product = await tx.product.findUnique({
        where: { id: validated.productId },
        include: { productSizes: true },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      let productSize;
      let sizeName: string | null = null;

      if (product.freeSize) {
        productSize = product.productSizes.find(ps => ps.size === "FREE");
        sizeName = "FREE";
      } else {
        if (!validated.productSizeId && !validated.size) {
          throw new Error("Size is required for sized products");
        }
        
        if (validated.productSizeId) {
          productSize = product.productSizes.find(ps => ps.id === validated.productSizeId);
        } else if (validated.size) {
          productSize = product.productSizes.find(ps => ps.size === validated.size);
        }
        
        if (!productSize) {
          throw new Error("Product size not found");
        }
        sizeName = productSize.size;
      }

      if (!productSize) {
        throw new Error("Product size not found");
      }

      const beforeQty = productSize.quantity;
      let afterQty: number;

      // Calculate new quantity
      if (validated.type === "ADD") {
        afterQty = beforeQty + validated.quantity;
      } else {
        // REDUCE
        if (beforeQty < validated.quantity) {
          throw new Error(`Insufficient stock. Available: ${beforeQty}, Requested to reduce: ${validated.quantity}`);
        }
        afterQty = beforeQty - validated.quantity;
      }

      // Update product size quantity
      await tx.productSize.update({
        where: { id: productSize.id },
        data: { quantity: afterQty },
      });

      // Create adjustment record
      try {
        const adjustment = await stockAdjustmentModel.create({
          data: {
            productId: validated.productId,
            productSizeId: productSize.id,
            size: sizeName,
            type: validated.type,
            quantity: validated.quantity,
            reason: validated.reason,
            reasonNote: validated.reasonNote || null,
            beforeQty,
            afterQty,
            adjustedBy,
          },
          include: {
            product: {
              include: {
                category: { select: { name: true } },
              },
            },
            adjustedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return adjustment;
      } catch (createError: any) {
        console.error("Error creating stock adjustment record:", createError);
        console.error("Error details:", {
          code: createError?.code,
          meta: createError?.meta,
          message: createError?.message,
        });
        throw new Error(
          `Failed to create adjustment record: ${createError?.message || "Unknown error"}. ` +
          "Please ensure the database migration has been run: 'npx prisma migrate dev'"
        );
      }

    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating stock adjustment:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      const validationError = fromZodError(error as z.ZodError);
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }

    // Check for Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as any;
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid product or user reference. Please check your data." },
          { status: 400 }
        );
      }
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          { error: "Record not found. Please refresh and try again." },
          { status: 404 }
        );
      }
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "A record with this information already exists." },
          { status: 409 }
        );
      }
    }

    // Get the actual error message
    let errorMessage = "Failed to create stock adjustment";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check if it's a Prisma client generation issue
      if (errorMessage.includes("StockAdjustment model not found") || 
          errorMessage.includes("stockAdjustment") ||
          errorMessage.includes("Cannot read properties")) {
        errorMessage = "StockAdjustment model not found in Prisma client. Please run 'npx prisma generate' and restart your dev server.";
      }
      
      // Check if it's a migration issue
      if (errorMessage.includes("does not exist") || 
          errorMessage.includes("relation") ||
          errorMessage.includes("table")) {
        errorMessage = "Database table not found. Please run 'npx prisma migrate dev' to create the stock_adjustments table.";
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === "development" && error instanceof Error 
          ? { details: error.stack } 
          : {})
      },
      { status: 500 }
    );
  }
}
