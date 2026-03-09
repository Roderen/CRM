import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const activities = await prisma.activity.findMany({
    where: { clientId: id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(activities);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { type, note, date } = await request.json();
  if (!type || !note) {
    return NextResponse.json({ error: "Type and note are required" }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: {
      type,
      note,
      date: date ? new Date(date) : new Date(),
      clientId: id,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
