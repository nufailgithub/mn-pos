import { api, ApiError } from "@/lib/api-client";

export type SalesReport = {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalSubtotal: number;
    totalTax: number;
    totalDiscount: number;
    averageSale: number;
  };
  paymentMethods: Record<string, number>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  cashierSales: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  sales: any[];
};

export type InventoryReport = {
  summary: {
    totalProducts: number;
    totalStockQuantity: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  categoryBreakdown: Record<string, { count: number; stockValue: number }>;
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    totalQuantity: number;
    stockValue: number;
    status: string;
  }>;
};

export type ProductReport = {
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalProducts: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalSold: number;
  };
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    currentStock: number;
    totalSold: number;
    totalRevenue: number;
    totalCost: number;
    profit: number;
    profitMargin: number;
    stockStatus: string;
  }>;
};

export const reportsApi = {
  /**
   * Get sales report
   */
  getSalesReport: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: "today" | "week" | "month" | "year" | "custom";
  }): Promise<SalesReport> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.period) searchParams.set("period", params.period);

    const queryString = searchParams.toString();
    const url = `/api/reports/sales${queryString ? `?${queryString}` : ""}`;

    return api.get<SalesReport>(url);
  },

  /**
   * Get inventory report
   */
  getInventoryReport: async (params?: {
    category?: string;
  }): Promise<InventoryReport> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);

    const queryString = searchParams.toString();
    const url = `/api/reports/inventory${queryString ? `?${queryString}` : ""}`;

    return api.get<InventoryReport>(url);
  },

  /**
   * Get product performance report
   */
  getProductReport: async (params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }): Promise<ProductReport> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.category) searchParams.set("category", params.category);

    const queryString = searchParams.toString();
    const url = `/api/reports/products${queryString ? `?${queryString}` : ""}`;

    return api.get<ProductReport>(url);
  },
};
