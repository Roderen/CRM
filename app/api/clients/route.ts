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
    });
    return NextResponse.json(clients);
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
  const { name, email, phone, company, dealAmount } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const client = await prisma.client.create({
      data: {
        userId,
        name,
        email,
        phone,
        company,
        dealAmount: dealAmount ? parseFloat(dealAmount) : null,
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("POST /api/clients error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
