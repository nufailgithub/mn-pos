"use client";

import MainLayout from "@/app/_components/MainLayout";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createProductSchema, type CreateProductInput } from "@/lib/validations/product";
import { productsApi, type Product } from "@/lib/api/products";
import { BarcodeDisplay } from "@/components/barcode/BarcodeDisplay";

/* -------------------- constants -------------------- */

const CATEGORIES = ["Kids", "Men", "Ladies"] as const;

const SUB_CATEGORIES: Record<string, string[]> = {
  Kids: ["Shirt", "T-Shirt", "Pant", "Jeans", "Dress", "Others"],
  Men: ["Shirt", "T-Shirt", "Pant", "Jeans", "Kurta", "Innerwear", "Others"],
  Ladies: ["Dress", "Kurti", "Saree", "Blouse", "Top", "Skirt", "Others"],
};

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/* -------------------- types -------------------- */

type ProductFormValues = CreateProductInput;

/* -------------------- helpers -------------------- */

// Move focus to next field on Enter
const focusNext = (
  e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>
) => {
  if (e.key !== "Enter") return;

  e.preventDefault();

  const form = e.currentTarget.form;
  if (!form) return;

  const elements = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
      "input, select, button"
    )
  );

  const index = elements.indexOf(e.currentTarget);
  elements[index + 1]?.focus();
};

/* -------------------- component -------------------- */

export default function CreateProductPage() {
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(createProductSchema) as any,
    defaultValues: {
      name: "",
      productId: "",
      category: "",
      subCategory: "",
      costPrice: 0,
      sellingPrice: 0,
      brand: "",
      stockAlertLimit: 10,
      freeSize: false,
      sizes: SIZES.map((s) => ({ size: s, quantity: 0 })),
      barcode: "",
    },
  });

  const category = form.watch("category");
  const freeSize = form.watch("freeSize");

  /* -------------------- auto generate IDs -------------------- */

  useEffect(() => {
    form.setValue("productId", `SKU-${Date.now()}`);
    form.setValue("barcode", `BAR-${Date.now()}`);
  }, [form]);

  /* -------------------- reset sub category -------------------- */

  useEffect(() => {
    form.setValue("subCategory", "");
  }, [category, form]);

  /* -------------------- handle freeSize change -------------------- */

  useEffect(() => {
    if (freeSize) {
      // When freeSize is enabled, ensure we have at least one size entry
      if (!form.getValues("sizes")?.[0]) {
        form.setValue("sizes", [{ size: "FREE", quantity: 0 }]);
      }
    } else {
      // When freeSize is disabled, reset to all sizes
      form.setValue("sizes", SIZES.map((s) => ({ size: s, quantity: 0 })));
    }
  }, [freeSize, form]);

  /* -------------------- submit -------------------- */

  const onSubmit = async (values: ProductFormValues) => {
    try {
      // Prepare sizes data based on freeSize
      const sizesData = values.freeSize
        ? [{ size: "FREE", quantity: values.sizes?.[0]?.quantity || 0 }]
        : values.sizes?.filter((size) => size.quantity > 0) || [];

      // Ensure at least one size has quantity when not freeSize
      if (!values.freeSize && sizesData.length === 0) {
        toast.error("Please add quantity for at least one size");
        return;
      }

      const payload: CreateProductInput = {
        ...values,
        sizes: sizesData,
        subCategory: values.subCategory || undefined,
        brand: values.brand || undefined,
        barcode: values.barcode || undefined,
      };

      const newProduct = await productsApi.create(payload);

      toast.success("Product created successfully 🎉");
      
      // Store created product and show barcode dialog
      setCreatedProduct(newProduct);
      setBarcodeDialogOpen(true);
      
      form.reset();
      
      // Reset to default values after successful submission
      form.setValue("productId", `SKU-${Date.now()}`);
      form.setValue("barcode", `BAR-${Date.now()}`);
      form.setValue("stockAlertLimit", 10);
      form.setValue("sizes", SIZES.map((s) => ({ size: s, quantity: 0 })));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to create product";
      toast.error(errorMessage);
      console.error("Error creating product:", error);
    }
  };
  
  /* -------------------- UI -------------------- */

  return (
    <MainLayout>
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          className={buttonVariants({
            variant: "outline",
            size: "icon",
          })}
          href="/products"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-bold">Create Product</h1>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Provide basic information about the product
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Product Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} onKeyDown={focusNext} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product ID */}
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product ID</FormLabel>
                      <FormControl>
                        <Input readOnly {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Sub Category */}
                {category && (
                  <FormField
                    control={form.control}
                    name="subCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Category</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sub category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUB_CATEGORIES[category]?.map((sub) => (
                              <SelectItem key={sub} value={sub}>
                                {sub}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  {["costPrice", "sellingPrice"].map((fieldName) => (
                    <FormField
                      key={fieldName}
                      control={form.control}
                      name={fieldName as "costPrice" | "sellingPrice"}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {fieldName === "costPrice"
                              ? "Cost Price"
                              : "Selling Price"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value === 0 ? "" : field.value}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value)
                                )
                              }
                              onKeyDown={focusNext}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* Free Size */}
                <FormField
                  control={form.control}
                  name="freeSize"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <FormLabel>Free Size</FormLabel>
                    </FormItem>
                  )}
                />

                {/* Free Size Quantity */}
                {freeSize && (
                  <FormField
                    control={form.control}
                    name="sizes.0.quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value === 0 ? "" : field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value)
                              )
                            }
                            onKeyDown={focusNext}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Size Quantities */}
                {!freeSize && (
                  <div className="grid grid-cols-4 gap-4">
                    {SIZES.map((size, index) => (
                      <FormField
                        key={size}
                        control={form.control}
                        name={`sizes.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{size}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value === 0 ? "" : field.value}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === ""
                                      ? 0
                                      : Number(e.target.value)
                                  )
                                }
                                onKeyDown={focusNext}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Stock Alert */}
                <FormField
                  control={form.control}
                  name="stockAlertLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Alert Limit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? 0
                                : Number(e.target.value)
                            )
                          }
                          onKeyDown={focusNext}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Brand */}
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} onKeyDown={focusNext} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Barcode */}
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode Number</FormLabel>
                      <FormControl>
                        <Input readOnly {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit">Save Product</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Barcode Display Dialog */}
        {createdProduct && createdProduct.barcode && (
          <BarcodeDisplay
            barcode={createdProduct.barcode}
            productName={createdProduct.name}
            price={createdProduct.sellingPrice}
            open={barcodeDialogOpen}
            onOpenChange={setBarcodeDialogOpen}
            defaultQuantity={(createdProduct as { totalQuantity?: number }).totalQuantity && (createdProduct as { totalQuantity?: number }).totalQuantity! > 0 ? (createdProduct as { totalQuantity?: number }).totalQuantity! : 1}
          />
        )}
      </div>
    </MainLayout>
  );
}