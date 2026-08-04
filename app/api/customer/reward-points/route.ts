import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ rewardPoints: 0 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { rewardPoints: true },
    });

    return NextResponse.json({ rewardPoints: user?.rewardPoints || 0 });
  } catch (error: any) {
    console.error("[REWARD_POINTS_GET_ERROR]", error);
    return NextResponse.json(
      { message: error.message || "Failed to retrieve reward points." },
      { status: 500 }
    );
  }
}
