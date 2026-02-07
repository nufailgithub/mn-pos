import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { SaleStatus } from "@prisma/client";

// GET /api/reports/billing - Cash, Bank, Credit sales, Customer balances (due & advance)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period") || "month";
    const now = new Date();

    let dateRange: { start: Date; end: Date };
    switch (period) {
      case "today":
        dateRange = { start: startOfDay(now), end: endOfDay(now) };
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        dateRange = { start: startOfDay(weekStart), end: endOfDay(now) };
        break;
      case "year":
        dateRange = { start: startOfYear(now), end: endOfYear(now) };
        break;
      default:
        dateRange = {
          start: startDate ? new Date(startDate) : startOfMonth(now),
          end: endDate ? new Date(endDate) : endOfMonth(now),
        };
    }

    const where = {
      createdAt: { gte: dateRange.start, lte: dateRange.end },
      status: SaleStatus.COMPLETED,
    };

    const sales = await prisma.sale.findMany({
      where,
      include: { payments: true, customer: true },
    });

    let cashPayments = 0;
    let bankPayments = 0;
    let creditSales = 0;
    sales.forEach((sale) => {
      sale.payments.forEach((p) => {
        if (p.method === "CASH") cashPayments += p.amount;
        else if (p.method === "BANK_TRANSFER" || p.method === "CARD" || p.method === "MOBILE") bankPayments += p.amount;
        else if (p.method === "CREDIT") creditSales += p.amount;
      });
      if (sale.balanceAmount > 0) creditSales += sale.balanceAmount;
    });

    const customers = await prisma.customer.findMany({
      where: {
        OR: [{ totalDebt: { gt: 0 } }, { totalAdvance: { gt: 0 } }],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        totalDebt: true,
        totalAdvance: true,
      },
    });

    const totalDue = customers.reduce((s, c) => s + (c.totalDebt ?? 0), 0);
    const totalAdvance = customers.reduce((s, c) => s + (c.totalAdvance ?? 0), 0);

    return NextResponse.json({
      dateRange: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() },
      paymentSummary: {
        cashPayments,
        bankPayments,
        creditSales,
      },
      customerBalances: {
        totalDue,
        totalAdvance,
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          due: c.totalDebt ?? 0,
          advance: c.totalAdvance ?? 0,
        })),
      },
    });
  } catch (error) {
    console.error("Error generating billing report:", error);
    return NextResponse.json(
      { error: "Failed to generate billing report" },
      { status: 500 }
    );
  }
}
