import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  size: z.string().optional(), // Size for sized products, null/undefined for free size
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  price: z.coerce.number().positive("Price must be positive"),
  discount: z.coerce.number().min(0).default(0),
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).optional(), // Discount type for this item
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  payments: z.array(z.object({
    amount: z.number().positive(),
    method: z.enum(["CASH", "CARD", "MOBILE", "BANK_TRANSFER", "CREDIT"]),
    reference: z.string().optional()
  })).default([]),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  discount: z.coerce.number().min(0).default(0), // Overall bill discount
  discountType: z.enum(["PERCENTAGE", "AMOUNT"]).optional(), // Overall bill discount type
  notes: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
