import { api, ApiError } from "@/lib/api-client";

export type StockItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  productIdField: string;
  category: string;
  size: string;
  quantity: number;
  alertLimit: number;
  productSizeId: string;
};

export type StockListResponse = {
  items: StockItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalProducts: number;
    totalStockQty: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
};

export type StockAdjustmentInput = {
  productId: string;
  productSizeId?: string;
  size?: string;
  type: "ADD" | "REDUCE";
  quantity: number;
  reason:
    | "NEW_STOCK_ARRIVAL"
    | "DAMAGED_ITEM"
    | "LOST_THEFT"
    | "MANUAL_CORRECTION"
    | "RETURN_FROM_CUSTOMER"
    | "OTHER";
  reasonNote?: string;
};

export type StockAdjustment = {
  id: string;
  productId: string;
  productSizeId: string | null;
  size: string | null;
  type: "ADD" | "REDUCE";
  quantity: number;
  reason: string;
  reasonNote: string | null;
  beforeQty: number;
  afterQty: number;
  adjustedBy: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    productId: string;
    category: { name: string };
  };
  adjustedByUser: {
    id: string;
    name: string;
    email: string;
  };
};

export type StockHistoryResponse = {
  adjustments: StockAdjustment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export const stockApi = {
  /**
   * Get stock list with filters
   */
  getList: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    size?: string;
    status?: "in" | "low" | "out";
  }): Promise<StockListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.size) searchParams.set("size", params.size);
    if (params?.status) searchParams.set("status", params.status);

    const queryString = searchParams.toString();
    const url = `/api/stock${queryString ? `?${queryString}` : ""}`;

    return api.get<StockListResponse>(url);
  },

  /**
   * Create stock adjustment
   */
  createAdjustment: async (data: StockAdjustmentInput): Promise<StockAdjustment> => {
    try {
      return await api.post<StockAdjustment>("/api/stock/adjustment", data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message || "Failed to create stock adjustment");
      }
      throw error;
    }
  },

  /**
   * Get stock adjustment history
   */
  getHistory: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    actionType?: "ADD" | "REDUCE";
    reason?: string;
    date?: string;
  }): Promise<StockHistoryResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.search) searchParams.set("search", params.search);
    if (params?.actionType) searchParams.set("actionType", params.actionType);
    if (params?.reason) searchParams.set("reason", params.reason);
    if (params?.date) searchParams.set("date", params.date);

    const queryString = searchParams.toString();
    const url = `/api/stock/history${queryString ? `?${queryString}` : ""}`;

    return api.get<StockHistoryResponse>(url);
  },

  /**
   * Get low stock items
   */
  getLowStock: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<StockListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const queryString = searchParams.toString();
    const url = `/api/stock/low-stock${queryString ? `?${queryString}` : ""}`;

    return api.get<StockListResponse>(url);
  },
};
