import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calcInvoiceTotal(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum: number, item: unknown) => {
    if (typeof item !== "object" || item === null) return sum;
    const { quantity = 0, unitPrice = 0 } = item as { quantity?: number; unitPrice?: number };
    return sum + (Number(quantity) || 0) * (Number(unitPrice) || 0);
  }, 0);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Start of the month 5 months ago (6 months total including current)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch(() => fallback);

    const [
      clientsCount,
      projectsPlanned,
      projectsInProgress,
      projectsCompleted,
      tasksInProgress,
      overdueProjects,
      weekDeadlines,
      activeTasks,
      paidInvoices,
      invoiceDraft,
      invoiceSent,
      invoicePaid,
      invoiceOverdue,
    ] = await Promise.all([
      safe(prisma.client.count({ where: { userId } }), 0),
      safe(prisma.project.count({ where: { status: "PLANNED", client: { userId } } }), 0),
      safe(prisma.project.count({ where: { status: "IN_PROGRESS", client: { userId } } }), 0),
      safe(prisma.project.count({ where: { status: "COMPLETED", client: { userId } } }), 0),
      safe(prisma.task.count({ where: { status: "IN_PROGRESS", project: { client: { userId } } } }), 0),
      safe(
        prisma.project.findMany({
          where: {
            client: { userId },
            deadline: { lt: now },
            status: { not: "COMPLETED" },
          },
          select: { id: true, name: true, deadline: true, status: true, client: { select: { id: true, name: true } } },
          orderBy: { deadline: "asc" },
        }),
        []
      ),
      safe(
        prisma.project.findMany({
          where: {
            client: { userId },
            deadline: { gte: now, lte: weekEnd },
            status: { not: "COMPLETED" },
          },
          select: { id: true, name: true, deadline: true, status: true, client: { select: { id: true, name: true } } },
          orderBy: { deadline: "asc" },
        }),
        []
      ),
      safe(
        prisma.task.findMany({
          where: {
            status: { in: ["TODO", "IN_PROGRESS"] },
            project: { client: { userId } },
          },
          select: {
            id: true,
            title: true,
            status: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          take: 10,
        }),
        []
      ),
      safe(
        prisma.invoice.findMany({
          where: { userId, status: "PAID", issueDate: { gte: sixMonthsAgo } },
          select: { issueDate: true, items: true },
        }),
        []
      ),
      safe(prisma.invoice.count({ where: { userId, status: "DRAFT" } }), 0),
      safe(prisma.invoice.count({ where: { userId, status: "SENT" } }), 0),
      safe(prisma.invoice.count({ where: { userId, status: "PAID" } }), 0),
      safe(prisma.invoice.count({ where: { userId, status: "OVERDUE" } }), 0),
    ]);

    // Build revenue by month (last 6 months)
    const monthlyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      monthlyMap[key] = 0;
    }
    for (const inv of paidInvoices) {
      const d = new Date(inv.issueDate);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      if (key in monthlyMap) {
        monthlyMap[key] += calcInvoiceTotal(inv.items);
      }
    }
    const revenueByMonth = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue }));
    const totalRevenue = revenueByMonth.reduce((s, d) => s + d.revenue, 0);

    return NextResponse.json({
      clientsCount,
      projects: {
        planned: projectsPlanned,
        inProgress: projectsInProgress,
        completed: projectsCompleted,
      },
      tasksInProgress,
      overdueProjects,
      weekDeadlines,
      activeTasks,
      revenueByMonth,
      totalRevenue,
      invoices: {
        draft: invoiceDraft,
        sent: invoiceSent,
        paid: invoicePaid,
        overdue: invoiceOverdue,
      },
    });
  } catch (err) {
    console.error("GET /api/stats error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
