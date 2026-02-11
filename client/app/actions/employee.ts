"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { Employee, SalaryAdvance, SalaryPayment, EmployeeStatus } from "@prisma/client";
import { startOfMonth } from "date-fns";

export type EmployeeWithAdvances = Employee & {
  advances: SalaryAdvance[];
  salaryPayments?: SalaryPayment[];
  _count?: { advances: number; salaryPayments: number };
};

// Generate next employee ID (EMP-001, EMP-002, ...)
async function generateEmployeeId(): Promise<string> {
  const list = await prisma.employee.findMany({
    select: { employeeId: true },
    orderBy: { createdAt: "desc" },
  });
  let maxNum = 0;
  for (const e of list) {
    const m = /^EMP-(\d+)$/i.exec(e.employeeId);
    if (m) maxNum = Math.max(maxNum, Number.parseInt(m[1], 10));
  }
  return `EMP-${String(maxNum + 1).padStart(3, "0")}`;
}

// Create a new employee (employeeId is auto-generated; do not pass)
export async function createEmployee(data: {
  name: string;
  phone?: string;
  basicSalary: number;
}) {
  try {
    const employeeId = await generateEmployeeId();
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        name: data.name,
        phone: data.phone,
        basicSalary: data.basicSalary,
        status: "ACTIVE",
      },
    });
    revalidatePath("/dashboard/employees");
    return { success: true, data: employee };
  } catch (error) {
    console.error("Error creating employee:", error);
    return { success: false, error: "Failed to create employee" };
  }
}

// Update employee details
export async function updateEmployee(id: string, data: {
  name?: string;
  phone?: string;
  basicSalary?: number;
  status?: EmployeeStatus;
}) {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data,
    });
    
    revalidatePath("/dashboard/employees");
    return { success: true, data: employee };
  } catch (error) {
    console.error("Error updating employee:", error);
    return { success: false, error: "Failed to update employee" };
  }
}

// Get all employees with advances and salary payments (for monthly history)
export async function getEmployees(activeOnly: boolean = false) {
  try {
    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.status = "ACTIVE";
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        advances: { orderBy: { date: "desc" }, take: 10 },
        salaryPayments: { orderBy: { forMonth: "desc" }, take: 24 },
        _count: { select: { advances: true, salaryPayments: true } },
      },
    });

    return { success: true, data: employees };
  } catch (error) {
    console.error("Error fetching employees:", error);
    return { success: false, error: "Failed to fetch employees" };
  }
}

// Add Salary Advance
export async function addSalaryAdvance(employeeId: string, amount: number, note?: string) {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }
    await prisma.salaryAdvance.create({
      data: { employeeId, amount, note, date: new Date() },
    });
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    console.error("Error adding salary advance:", error);
    return { success: false, error: "Failed to add salary advance" };
  }
}

// Record salary payment (partial or full) for a given month
export async function recordSalaryPayment(
  employeeId: string,
  amount: number,
  forMonth: Date,
  note?: string
) {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }
    const monthStart = startOfMonth(new Date(forMonth));
    await prisma.salaryPayment.create({
      data: { employeeId, amount, forMonth: monthStart, note },
    });
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    console.error("Error recording salary payment:", error);
    return { success: false, error: "Failed to record salary payment" };
  }
}

export async function toggleEmployeeStatus(id: string, newStatus: EmployeeStatus) {
  return updateEmployee(id, { status: newStatus });
}

// Deactivate (soft delete) employee — keeps record for history
export async function deleteEmployee(id: string) {
  try {
    await prisma.employee.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { success: false, error: "Failed to remove employee" };
  }
}
