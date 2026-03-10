import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { projects: { select: { budget: true } } },
    });
    const result = clients.map(({ projects, ...client }) => ({
      ...client,
      totalBudget: projects.some((p) => p.budget != null)
        ? projects.reduce((sum, p) => sum + (p.budget ?? 0), 0)
        : null,
    }));
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/clients error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, phone, company } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const client = await prisma.client.create({
      data: { userId, name, email, phone, company },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("POST /api/clients error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
