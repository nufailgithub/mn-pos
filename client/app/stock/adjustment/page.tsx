"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MainLayout from "@/app/_components/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { productsApi, type Product } from "@/lib/api/products";
import { stockApi } from "@/lib/api/stock";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  productSizeId: z.string().optional(),
  size: z.string().optional(),
  type: z.enum(["ADD", "REDUCE"]),
  quantity: z.number().int().positive("Quantity must be positive"),
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

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

const REASON_OPTIONS = [
  { value: "NEW_STOCK_ARRIVAL", label: "New Stock Arrival" },
  { value: "DAMAGED_ITEM", label: "Damaged Item" },
  { value: "LOST_THEFT", label: "Lost / Theft" },
  { value: "MANUAL_CORRECTION", label: "Manual Correction" },
  { value: "RETURN_FROM_CUSTOMER", label: "Return from Customer" },
  { value: "OTHER", label: "Other" },
] as const;

function AdjustmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: "ADD",
      reason: "MANUAL_CORRECTION",
    },
  });

  const adjustmentType = watch("type");
  const productId = watch("productId");

  useEffect(() => {
    fetchProducts();
    
    // Pre-fill from URL params
    const productIdParam = searchParams.get("productId");
    const sizeParam = searchParams.get("size");
    const productSizeIdParam = searchParams.get("productSizeId");
    
    if (productIdParam) {
      setValue("productId", productIdParam);
      if (sizeParam) {
        setValue("size", sizeParam);
        setSelectedSize(sizeParam);
      }
      if (productSizeIdParam) {
        setValue("productSizeId", productSizeIdParam);
      }
    }
  }, [searchParams, setValue]);

  useEffect(() => {
    if (productId) {
      const product = products.find((p) => p.id === productId);
      setSelectedProduct(product || null);
      if (product && !product.freeSize && product.productSizes.length > 0) {
        const defaultSize = product.productSizes.find((ps) => ps.quantity > 0) || product.productSizes[0];
        if (defaultSize && !selectedSize) {
          setSelectedSize(defaultSize.size);
          setValue("size", defaultSize.size);
          // productSizes from API include id
          if ("id" in defaultSize) {
            setValue("productSizeId", defaultSize.id as string);
          }
        }
      }
    }
  }, [productId, products, selectedSize, setValue]);

  const fetchProducts = async () => {
    try {
      const result = await productsApi.getAll({
        page: 1,
        limit: 1000, // Get all products for dropdown
      });
      setProducts(result.products);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    }
  };

  const onSubmit = async (data: AdjustmentFormValues) => {
    try {
      setSubmitting(true);
      await stockApi.createAdjustment(data);
      toast.success("Stock adjustment created successfully! 🎉");
      router.push("/stock");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create adjustment";
      toast.error(errorMessage);
      console.error("Error creating adjustment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    setValue("size", size);
    if (selectedProduct) {
      const productSize = selectedProduct.productSizes.find((ps) => ps.size === size);
      if (productSize && "id" in productSize) {
        setValue("productSizeId", productSize.id as string);
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Stock Adjustment
          </h1>
          <p className="text-muted-foreground mt-2">
            Add or reduce stock with proper reason
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Adjustment Details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Product */}
              <div className="space-y-2">
                <label htmlFor="product-select" className="text-sm font-medium">
                  Product (SKU / Name) <span className="text-red-500">*</span>
                </label>
                <Select
                  value={productId || ""}
                  onValueChange={(value) => {
                    setValue("productId", value);
                    setSelectedSize("");
                    setValue("size", "");
                    setValue("productSizeId", "");
                  }}
                >
                  <SelectTrigger id="product-select">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.productId && (
                  <p className="text-sm text-destructive">
                    {errors.productId.message}
                  </p>
                )}
              </div>

              {/* Category (read-only) */}
              {selectedProduct && (
                <div className="space-y-2">
                  <label htmlFor="category-input" className="text-sm font-medium">Category</label>
                  <Input
                    id="category-input"
                    readOnly
                    value={selectedProduct.category?.name || ""}
                  />
                </div>
              )}

              {/* Size */}
              {selectedProduct && !selectedProduct.freeSize && (
                <div className="space-y-2">
                  <label htmlFor="size-select" className="text-sm font-medium">
                    Size <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedSize}
                    onValueChange={handleSizeChange}
                  >
                    <SelectTrigger id="size-select">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProduct.productSizes.map((ps) => (
                        <SelectItem key={ps.size} value={ps.size}>
                          {ps.size} ({ps.quantity} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.size && (
                    <p className="text-sm text-destructive">
                      {errors.size.message}
                    </p>
                  )}
                </div>
              )}

              {/* Action Type */}
              <div className="space-y-2">
                <label htmlFor="action-select" className="text-sm font-medium">
                  Stock Action <span className="text-red-500">*</span>
                </label>
                <Select
                  value={adjustmentType}
                  onValueChange={(value: "ADD" | "REDUCE") =>
                    setValue("type", value)
                  }
                >
                  <SelectTrigger id="action-select">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD">Add Stock</SelectItem>
                    <SelectItem value="REDUCE">Reduce Stock</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-destructive">
                    {errors.type.message}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label htmlFor="quantity-input" className="text-sm font-medium">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  id="quantity-input"
                  type="number"
                  min={1}
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <label htmlFor="reason-select" className="text-sm font-medium">
                  Reason <span className="text-red-500">*</span>
                </label>
                <Select
                  onValueChange={(value) => setValue("reason", value as AdjustmentFormValues["reason"])}
                  defaultValue="MANUAL_CORRECTION"
                >
                  <SelectTrigger id="reason-select">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reason && (
                  <p className="text-sm text-destructive">
                    {errors.reason.message}
                  </p>
                )}
              </div>

              {/* Reason Note */}
              <div className="space-y-2">
                <label htmlFor="reason-note-input" className="text-sm font-medium">
                  Additional Notes (Optional)
                </label>
                <Input
                  id="reason-note-input"
                  placeholder="Add any additional notes..."
                  {...register("reasonNote")}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Processing..." : "Confirm Adjustment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </MainLayout>
  );
}

export default function AdjustmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdjustmentContent />
    </Suspense>
  );
}
