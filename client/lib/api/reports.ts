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

export type BillingReport = {
  dateRange: { start: string; end: string };
  paymentSummary: { cashPayments: number; bankPayments: number; creditSales: number };
  customerBalances: {
    totalDue: number;
    totalAdvance: number;
    customers: Array<{ id: string; name: string; phone: string; due: number; advance: number }>;
  };
};

export type EmployeeReport = {
  month: string;
  monthLabel: string;
  summary: { totalSalary: number; totalPaid: number; totalPending: number };
  employees: Array<{
    id: string;
    employeeId: string;
    name: string;
    monthlySalary: number;
    paid: number;
    pending: number;
    salaryPayments: unknown[];
  }>;
};

export const reportsApi = {
  getBillingReport: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: "today" | "week" | "month" | "year" | "custom";
  }): Promise<BillingReport> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.period) searchParams.set("period", params.period);
    const q = searchParams.toString();
    return api.get<BillingReport>(`/api/reports/billing${q ? `?${q}` : ""}`);
  },

  getEmployeeReport: async (params?: { month?: string }): Promise<EmployeeReport> => {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.set("month", params.month);
    const q = searchParams.toString();
    return api.get<EmployeeReport>(`/api/reports/employees${q ? `?${q}` : ""}`);
  },

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
