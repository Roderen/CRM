import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, projectId } = body;

  if (!title || !projectId) {
    return NextResponse.json(
      { error: "Title and projectId are required" },
      { status: 400 }
    );
  }

  // Verify the project belongs to the current user (via client ownership)
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      client: { userId },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
