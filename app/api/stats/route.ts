import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const safe = async (p: Promise<number>) => p.catch(() => 0);

    const [
      clientsCount,
      projectsPlanned,
      projectsInProgress,
      projectsCompleted,
      tasksInProgress,
    ] = await Promise.all([
      safe(prisma.client.count({ where: { userId } })),
      safe(prisma.project.count({ where: { status: "PLANNED", client: { userId } } })),
      safe(prisma.project.count({ where: { status: "IN_PROGRESS", client: { userId } } })),
      safe(prisma.project.count({ where: { status: "COMPLETED", client: { userId } } })),
      safe(prisma.task.count({ where: { status: "IN_PROGRESS", project: { client: { userId } } } })),
    ]);

    return NextResponse.json({
      clientsCount,
      projects: {
        planned: projectsPlanned,
        inProgress: projectsInProgress,
        completed: projectsCompleted,
      },
      tasksInProgress,
    });
  } catch (err) {
    console.error("GET /api/stats error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
