import { api, ApiError } from "@/lib/api-client";
import { CreateSaleInput } from "@/lib/validations/sale";

export type SaleItem = {
  id: string;
  productId: string;
  size: string | null;
  quantity: number;
  price: number;
  discount: number;
  discountType: string | null;
  subtotal: number;
  product: {
    id: string;
    name: string;
    sku: string;
    category?: { name: string };
    subCategory?: { name: string } | null;
  };
};

export type Sale = {
  id: string;
  saleNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  cashierId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  saleItems: SaleItem[];
  cashier: {
    id: string;
    name: string;
    email: string;
  };
};

export const salesApi = {
  /**
   * Get all sales with filters
   */
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ sales: Sale[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const queryString = searchParams.toString();
    const url = `/api/sales${queryString ? `?${queryString}` : ""}`;

    return api.get<{ sales: Sale[]; pagination: any }>(url);
  },

  /**
   * Create a new sale/bill
   */
  create: async (data: CreateSaleInput): Promise<Sale> => {
    try {
      return await api.post<Sale>("/api/sales", data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || "Failed to create sale");
      }
      throw error;
    }
  },
};
