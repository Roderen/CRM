import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getInvoiceForUser(id: string, userId: string) {
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      client: { select: { id: true, name: true, company: true, email: true, phone: true } },
      project: { select: { id: true, name: true } },
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const invoice = await getInvoiceForUser(id, userId);
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (err) {
    console.error("GET /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await getInvoiceForUser(id, userId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const { status, dueDate, items, notes, projectId } = body;

  try {
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(items !== undefined && { items }),
        ...(notes !== undefined && { notes }),
        ...(projectId !== undefined && { projectId: projectId || null }),
      },
      include: {
        client: { select: { id: true, name: true, company: true, email: true, phone: true } },
        project: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const existing = await getInvoiceForUser(id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/invoices/[id] error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
