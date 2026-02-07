"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "../_components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Edit2, Trash2 } from "lucide-react";
import { productsApi, type Product } from "@/lib/api/products";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = ["Kids", "Men", "Ladies"] as const;
const ALL_CATEGORIES = "__ALL__";

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(
    searchParams.get("category") || ALL_CATEGORIES
  );
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const searchQuery = searchParams.get("search") || "";
    const categoryFilter = searchParams.get("category") || ALL_CATEGORIES;
    setSearch(searchQuery);
    setCategory(categoryFilter);
    fetchProducts(page, searchQuery, categoryFilter);
  }, [searchParams]);

  const fetchProducts = async (
    page: number = 1,
    searchQuery: string = "",
    categoryFilter: string = ""
  ) => {
    setLoading(true);
    try {
      const normalizedCategory =
        categoryFilter === ALL_CATEGORIES ? "" : categoryFilter;

      const result = await productsApi.getAll({
        page,
        limit: 10,
        search: searchQuery || undefined,
        category: normalizedCategory || undefined,
      });

      setProducts(result.products);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    const params = new URLSearchParams();
    if (value) params.set("search", value);
    if (category !== ALL_CATEGORIES) params.set("category", category);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
    fetchProducts(1, value, category);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (value !== ALL_CATEGORIES) params.set("category", value);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
    fetchProducts(1, search, value);
  };

  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage, search, category);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setProductToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      await productsApi.delete(productToDelete.id);
      toast.success("Product deleted successfully");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      
      // If we're on the last page and it becomes empty after deletion, go to previous page
      const currentPage = pagination.page;
      const shouldGoToPreviousPage = products.length === 1 && currentPage > 1;
      const newPage = shouldGoToPreviousPage ? currentPage - 1 : currentPage;
      
      // Refresh the product list
      await fetchProducts(newPage, search, category);
    } catch (error) {
      console.error("Error deleting product:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete product";
      toast.error(errorMessage);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-2">
              Manage your product inventory
            </p>
          </div>
          <Button
            onClick={() => router.push("/products/create")}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by name, product ID, barcode, or brand..."
              value={search}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Product ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Price</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Stock</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <p className="text-muted-foreground">Loading...</p>
                    </td>
                  </tr>
                )}
                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <p className="text-muted-foreground">No products found</p>
                    </td>
                  </tr>
                )}
                {!loading && products.length > 0 && products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{product.name}</div>
                      {product.brand && (
                        <div className="text-xs text-muted-foreground">
                          {product.brand}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {product.productId}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>{product.category.name}</div>
                      {product.subCategory && (
                        <div className="text-xs text-muted-foreground">
                          {product.subCategory.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium">Rs. {product.sellingPrice.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        Cost: Rs. {product.costPrice.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(() => {
                        const qty = product.totalQuantity || 0;
                        const isLowStock = qty <= product.stockAlertLimit;
                        const className = isLowStock
                          ? "px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800"
                          : "px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800";
                        return (
                          <span className={className}>
                            {qty}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(() => {
                        const isFreeSize = product.freeSize;
                        const className = isFreeSize
                          ? "px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          : "px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800";
                        return (
                          <span className={className}>
                            {isFreeSize ? "Free Size" : "Sized"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Link href={`/products/${product.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/products/${product.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(product.id, product.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {products.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
            products
          </p>
          {pagination.pages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
              >
                Previous
              </Button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={pagination.page === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                  disabled={loading}
                  className="w-10 h-10 p-0"
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{productToDelete?.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setProductToDelete(null);
                }}
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
