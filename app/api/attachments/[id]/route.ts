import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, ATTACHMENTS_BUCKET } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const attachment = await prisma.fileAttachment.findFirst({
    where: { id, project: { client: { userId } } },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([attachment.path]);
  await prisma.fileAttachment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
