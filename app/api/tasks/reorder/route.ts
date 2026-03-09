import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { tasks } = body as {
    tasks: { id: string; status: TaskStatus; position: number }[];
  };

  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: "tasks array is required" }, { status: 400 });
  }

  // Verify all tasks belong to the current user, then batch update
  // Note: position field requires `prisma db push` to be applied first
  await prisma.$transaction(
    tasks.map(({ id, status }) =>
      prisma.task.updateMany({
        where: { id, project: { client: { userId } } },
        data: { status },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
