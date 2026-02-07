"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Using explicit types because imports from @prisma/client might be tricky with generation issues
// But let's try importing them if generation succeeded.
import { Employee, SalaryAdvance, EmployeeStatus, Prisma } from "@prisma/client";

export type EmployeeWithAdvances = Employee & {
  advances: SalaryAdvance[];
  _count?: { advances: number };
};

// Create a new employee
export async function createEmployee(data: {
  employeeId: string;
  name: string;
  phone?: string;
  basicSalary: number;
}) {
  try {
    const existing = await prisma.employee.findUnique({
      where: { employeeId: data.employeeId },
    });

    if (existing) {
      return { success: false, error: "Employee ID already exists" };
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId: data.employeeId,
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

// Get all employees
export async function getEmployees(activeOnly: boolean = false) {
  try {
    const where: any = {};
    if (activeOnly) {
      where.status = "ACTIVE";
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        advances: {
            orderBy: { date: "desc" },
            take: 5 // Get recent advances
        },
        _count: {
          select: { advances: true },
        },
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

    const advance = await prisma.salaryAdvance.create({
      data: {
        employeeId,
        amount,
        note,
        date: new Date(),
      },
    });

    revalidatePath("/dashboard/employees");
    return { success: true, data: advance };
  } catch (error) {
    console.error("Error adding salary advance:", error);
    return { success: false, error: "Failed to add salary advance" };
  }
}

// Delete/Archive Employee (Soft delete by setting status to INACTIVE usually preferred, but here simple status toggle)
export async function toggleEmployeeStatus(id: string, newStatus: EmployeeStatus) {
    return updateEmployee(id, { status: newStatus });
}
