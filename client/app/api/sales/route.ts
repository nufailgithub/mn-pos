import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSaleSchema } from "@/lib/validations/sale";
import { fromZodError } from "zod-validation-error";
import { auth } from "@/auth";
import { z } from "zod";

// GET /api/sales - Get all sales
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (status) {
      where.status = status;
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
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
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

// POST /api/sales - Create new sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createSaleSchema.parse(body);

    // Get user ID from session
    const session = await auth();
    let cashierId: string;
    
    if (session?.user?.id) {
      cashierId = session.user.id;
    } else {
      // Fallback: Get first active user or create a default
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
      
      cashierId = defaultUser.id;
    }

    // Calculate item-level discounts and subtotals
    let subtotal = 0;
    const saleItemsData = validated.items.map((item) => {
      const itemSubtotal = item.price * item.quantity;
      let itemDiscount = 0;

      // Calculate item-level discount
      if (item.discount && item.discountType) {
        if (item.discountType === "PERCENTAGE") {
          itemDiscount = (itemSubtotal * item.discount) / 100;
        } else {
          itemDiscount = item.discount;
        }
      }

      const finalSubtotal = itemSubtotal - itemDiscount;
      subtotal += finalSubtotal;

      return {
        productId: item.productId,
        size: item.size || null,
        quantity: item.quantity,
        price: item.price,
        discount: itemDiscount,
        discountType: item.discountType || null,
        subtotal: finalSubtotal,
      };
    });

    // Calculate overall bill discount
    let billDiscount = 0;
    if (validated.discount > 0) {
      if (validated.discountType === "PERCENTAGE") {
        billDiscount = (subtotal * validated.discount) / 100;
      } else {
        // Default to amount if no type specified or type is AMOUNT
        billDiscount = validated.discount;
      }
    }

    const tax = subtotal * 0.0; // Configure tax rate
    const total = subtotal + tax - billDiscount;

    // Generate sale number
    const saleNumber = `SALE-${Date.now()}`;

    // Create sale with items in transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Access sale model from transaction client
      // If this fails, the Prisma client needs to be regenerated
      const saleModel = (tx as any).sale;
      if (!saleModel) {
        console.error("Prisma transaction client missing 'sale' model. Available models:", Object.keys(tx));
        throw new Error(
          "Sale model not found in Prisma client. " +
          "Please run 'npx prisma generate' in the client directory and restart your dev server."
        );
      }
      
      // Create sale
      const newSale = await saleModel.create({
        data: {
          saleNumber,
          subtotal,
          tax,
          discount: billDiscount,
          total,
          paymentMethod: validated.paymentMethod,
          cashierId,
          customerName: validated.customerName,
          customerPhone: validated.customerPhone,
          notes: validated.notes,
          saleItems: {
            create: saleItemsData,
          },
        },
        include: {
          saleItems: {
            include: {
              product: {
                include: {
                  category: { select: { name: true } },
                  subCategory: { select: { name: true } },
                },
              },
            },
          },
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update product stock based on size
      for (const item of validated.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { productSizes: true },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.freeSize) {
          // For free size, update the first size entry
          const freeSize = product.productSizes.find((ps) => ps.size === "FREE");
          if (freeSize) {
            if (freeSize.quantity < item.quantity) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${freeSize.quantity}, Requested: ${item.quantity}`);
            }
            await tx.productSize.update({
              where: { id: freeSize.id },
              data: { quantity: { decrement: item.quantity } },
            });
          }
        } else {
          // For sized products, update the specific size
          if (!item.size) {
            throw new Error(`Size is required for product ${product.name}`);
          }
          const productSize = product.productSizes.find((ps) => ps.size === item.size);
          if (!productSize) {
            throw new Error(`Size ${item.size} not found for product ${product.name}`);
          }
          if (productSize.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name} (${item.size}). Available: ${productSize.quantity}, Requested: ${item.quantity}`);
          }
          await tx.productSize.update({
            where: { id: productSize.id },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating sale:", error);

    if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
      const validationError = fromZodError(error as z.ZodError);
      return NextResponse.json(
        { error: validationError.message },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to create sale";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
