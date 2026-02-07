import { z } from "zod";

export const productSizeSchema = z.object({
  size: z.string(),
  quantity: z.number().int().min(0).default(0),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  productId: z.string().min(1, "Product ID is required"),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().optional(),
  costPrice: z.number().min(0, "Cost price cannot be negative"),
  sellingPrice: z.number().min(0, "Selling price cannot be negative"),
  brand: z.string().optional(),
  stockAlertLimit: z.number().int().min(0).default(10),
  freeSize: z.boolean().default(false),
  sizes: z.array(productSizeSchema).optional(),
  barcode: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  name: z.string().min(1, "Product name is required").optional(),
  category: z.string().min(1, "Category is required").optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;