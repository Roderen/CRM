import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, client: { userId } },
    include: {
      client: { select: { id: true, name: true } },
      tasks: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function POST(request: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, client: { userId } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, status } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const taskStatus = status ?? "TODO";

  const count = await prisma.task.count({
    where: { projectId: id, status: taskStatus },
  });

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description || null,
      status: taskStatus,
      position: count,
      projectId: id,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
