import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, format } from "date-fns";

// GET /api/reports/employees - Monthly salary, paid vs pending per employee
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM
    const now = new Date();
    const forMonth = month ? new Date(month + "-01") : now;
    const monthStart = startOfMonth(forMonth);

    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: {
        salaryPayments: {
          where: {
            forMonth: monthStart,
          },
        },
        advances: true,
      },
    });

    const rows = employees.map((emp) => {
      const monthlySalary = emp.basicSalary;
      const paidThisMonth = emp.salaryPayments.reduce((s, p) => s + p.amount, 0);
      const totalAdvances = emp.advances.reduce((s, a) => s + a.amount, 0);
      const remainingBeforeAdvance = Math.max(0, monthlySalary - paidThisMonth);
      const pending = Math.max(0, remainingBeforeAdvance - totalAdvances);
      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        monthlySalary,
        paid: paidThisMonth,
        pending,
        totalAdvances,
        salaryPayments: emp.salaryPayments,
      };
    });

    const summary = {
      totalSalary: rows.reduce((s, r) => s + r.monthlySalary, 0),
      totalPaid: rows.reduce((s, r) => s + r.paid, 0),
      totalPending: rows.reduce((s, r) => s + r.pending, 0),
    };

    return NextResponse.json({
      month: format(monthStart, "yyyy-MM"),
      monthLabel: format(monthStart, "MMM yyyy"),
      summary,
      employees: rows,
    });
  } catch (error) {
    console.error("Error generating employee report:", error);
    return NextResponse.json(
      { error: "Failed to generate employee report" },
      { status: 500 }
    );
  }
}
