"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/app/_components/MainLayout";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react";
import { productsApi, type Product } from "@/lib/api/products";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ViewProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getById(productId);
      setProduct(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load product";
      toast.error(errorMessage);
      setTimeout(() => {
        router.push("/products");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!product) return;

    try {
      await productsApi.delete(productId);
      toast.success("Product deleted successfully");
      setDeleteDialogOpen(false);
      router.push("/products");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete product";
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Product not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
            <div>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <p className="text-muted-foreground">{product.productId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/products/${productId}/edit`}>
              <Button variant="outline" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Edit Product
              </Button>
            </Link>
            <Button variant="destructive" className="gap-2" onClick={handleDeleteClick}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Product details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                <p className="text-lg font-semibold">{product.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Product ID</label>
                <p className="text-lg">{product.productId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SKU</label>
                <p className="text-lg">{product.sku}</p>
              </div>
              {product.barcode && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                  <p className="text-lg">{product.barcode}</p>
                </div>
              )}
              {product.brand && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <p className="text-lg">{product.brand}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Category & Pricing</CardTitle>
              <CardDescription>Product classification and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-lg font-semibold">{product.category.name}</p>
              </div>
              {product.subCategory && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sub Category</label>
                  <p className="text-lg">{product.subCategory.name}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                  <p className="text-lg font-semibold">Rs. {product.costPrice.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Selling Price</label>
                  <p className="text-lg font-semibold text-green-600">Rs. {product.sellingPrice.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Profit Margin</label>
                <p className="text-lg font-semibold text-green-600">
                  Rs. {(product.sellingPrice - product.costPrice).toLocaleString()} (
                  {Math.round(((product.sellingPrice - product.costPrice) / product.costPrice) * 100)}%)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stock Information */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
              <CardDescription>Inventory and stock details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Size Type</label>
                <p className="text-lg">
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      product.freeSize
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {product.freeSize ? "Free Size" : "Sized"}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Stock</label>
                <p
                  className={`text-2xl font-bold ${
                    (product.totalQuantity || 0) <= product.stockAlertLimit
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {product.totalQuantity || 0}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Stock Alert Limit</label>
                <p className="text-lg">{product.stockAlertLimit}</p>
              </div>
              {product.productSizes && product.productSizes.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Size Breakdown
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {product.productSizes.map((size) => (
                      <div
                        key={size.size}
                        className="p-2 bg-muted rounded text-center"
                      >
                        <div className="text-xs text-muted-foreground">{size.size}</div>
                        <div className="text-sm font-semibold">{size.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Timestamps and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-lg">
                  {new Date(product.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-lg">
                  {new Date(product.updatedAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{product?.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
