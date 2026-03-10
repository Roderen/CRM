import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ clients: [], projects: [], tasks: [], invoices: [] });
  }

  const [clients, projects, tasks, invoices] = await Promise.all([
    prisma.client.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, company: true },
      take: 4,
    }),
    prisma.project.findMany({
      where: {
        client: { userId },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, status: true, client: { select: { name: true } } },
      take: 4,
    }),
    prisma.task.findMany({
      where: {
        project: { client: { userId } },
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, status: true, projectId: true, project: { select: { name: true } } },
      take: 4,
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { client: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: { id: true, number: true, status: true, client: { select: { name: true } } },
      take: 4,
    }),
  ]);

  return NextResponse.json({ clients, projects, tasks, invoices });
}
