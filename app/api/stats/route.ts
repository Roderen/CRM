import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

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
    ]);

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
    });
  } catch (err) {
    console.error("GET /api/stats error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
