import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        clientId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ role: null }, { status: 404 });
    }

    return NextResponse.json({ role: user.role, clientId: user.clientId });
  } catch (error) {
    console.error("Error getting user role:", error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}






