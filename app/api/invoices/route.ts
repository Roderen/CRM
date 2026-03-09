import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      include: {
        client: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (err) {
    console.error("GET /api/invoices error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { clientId, projectId, dueDate, items, notes } = body;

  if (!clientId || !items?.length) {
    return NextResponse.json({ error: "clientId and items are required" }, { status: 400 });
  }

  // Verify the client belongs to this user
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Generate next invoice number for this user
  const count = await prisma.invoice.count({ where: { userId } });
  const number = `INV-${String(count + 1).padStart(3, "0")}`;

  try {
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        number,
        clientId,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        items,
        notes: notes || null,
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        project: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("POST /api/invoices error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
