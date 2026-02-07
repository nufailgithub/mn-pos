"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma, Customer, CustomerTransaction, Sale } from "@prisma/client";

export type CustomerStatus = "ACTIVE" | "INACTIVE"; // Logic-level status

export type CustomerWithTransactions = Customer & {
  transactions?: CustomerTransaction[];
  sales?: Sale[];
  _count?: { sales: number };
};

// Create a new customer
export async function createCustomer(data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}) {
  try {
    const existing = await prisma.customer.findUnique({
      where: { phone: data.phone },
    });

    if (existing) {
      return { success: false, error: "Customer with this phone already exists" };
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        totalDebt: 0,
      },
    });

    revalidatePath("/dashboard/customers");
    return { success: true, data: customer };
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

// Get all customers (optionally filter by debt)
export async function getCustomers(hasDebtOnly: boolean = false) {
  try {
    const where: any = {};
    if (hasDebtOnly) {
      where.totalDebt = { gt: 0 };
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { sales: true },
        },
        transactions: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return { success: true, data: customers };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

// Get customer details including transaction history
export async function getCustomerById(id: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: 20,
        },
        sales: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    return { success: true, data: customer };
  } catch (error) {
    console.error("Error fetching customer:", error);
    return { success: false, error: "Failed to fetch customer" };
  }
}

// Add a payment to reduce debt (Repayment)
export async function addCustomerPayment(
  customerId: string,
  amount: number,
  description?: string
) {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    if (customer.totalDebt < amount) {
        // Optional: Allow overpayment? For now, restrict.
        // Or specific logic. Let's strictly block paying more than debt for simplicity or warn.
        // Logic: just update.
    }

    // Transaction to update debt and log transaction
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: {
          totalDebt: { decrement: amount },
        },
      }),
      prisma.customerTransaction.create({
        data: {
          customerId: customerId,
          type: "DEBT_DEC",
          amount: amount,
          description: description || "Debt Repayment",
          date: new Date(),
        },
      }),
    ]);

    revalidatePath("/dashboard/loans");
    revalidatePath(`/dashboard/customers/${customerId}`);
    
    return { success: true };
  } catch (error) {
    console.error("Error adding customer payment:", error);
    return { success: false, error: "Failed to process payment" };
  }
}
