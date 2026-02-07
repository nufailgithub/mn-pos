import { api, ApiError } from "@/lib/api-client";
import { CreateProductInput } from "@/lib/validations/product";

export type Product = {
  id: string;
  name: string;
  productId: string;
  sku: string;
  barcode: string | null;
  category: { name: string };
  subCategory: { name: string } | null;
  costPrice: number;
  sellingPrice: number;
  brand: string | null;
  stockAlertLimit: number;
  freeSize: boolean;
  productSizes: Array<{ id: string; size: string; quantity: number }>;
  totalQuantity?: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductsResponse = {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ProductQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
};

export const productsApi = {
  /**
   * Get all products with pagination and filters
   */
  getAll: async (params?: ProductQueryParams): Promise<ProductsResponse> => {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);

    const queryString = searchParams.toString();
    const url = `/api/products${queryString ? `?${queryString}` : ""}`;
    
    return api.get<ProductsResponse>(url);
  },

  /**
   * Get a single product by ID
   */
  getById: async (id: string): Promise<Product> => {
    try {
      return await api.get<Product>(`/api/products/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || "Failed to fetch product");
      }
      throw error;
    }
  },

  /**
   * Get product by barcode
   */
  getByBarcode: async (barcode: string): Promise<Product> => {
    try {
      return await api.get<Product>(`/api/products/barcode/${encodeURIComponent(barcode)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || "Failed to fetch product");
      }
      throw error;
    }
  },

  /**
   * Create a new product
   */
  create: async (data: CreateProductInput): Promise<Product> => {
    try {
      return await api.post<Product>("/api/products", data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || "Failed to create product");
      }
      throw error;
    }
  },

  /**
   * Update a product by ID
   */
  update: async (id: string, data: Partial<CreateProductInput>): Promise<Product> => {
    try {
      return await api.put<Product>(`/api/products/${id}`, data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || "Failed to update product");
      }
      throw error;
    }
  },

  /**
   * Delete a product by ID
   */
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete<{ message: string }>(`/api/products/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const errorMessage = error.data && typeof error.data === 'object' && 'error' in error.data
          ? String(error.data.error)
          : error.message || "Failed to delete product";
        throw new Error(errorMessage);
      }
      throw error;
    }
  },
};
