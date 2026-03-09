import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      where: { client: { userId } },
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/projects error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, clientId, deadline, status, budget } = body;

  if (!name || !clientId) {
    return NextResponse.json(
      { error: "Name and clientId are required" },
      { status: 400 }
    );
  }

  // Verify the client belongs to the current user
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      clientId,
      deadline: deadline ? new Date(deadline) : null,
      status: status ?? "PLANNED",
      budget: budget ? parseFloat(budget) : null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
