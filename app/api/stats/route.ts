import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    clientsCount,
    projectsPlanned,
    projectsInProgress,
    projectsCompleted,
    tasksInProgress,
  ] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.project.count({ where: { status: "PLANNED", client: { userId } } }),
    prisma.project.count({ where: { status: "IN_PROGRESS", client: { userId } } }),
    prisma.project.count({ where: { status: "COMPLETED", client: { userId } } }),
    prisma.task.count({ where: { status: "IN_PROGRESS", project: { client: { userId } } } }),
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
}
