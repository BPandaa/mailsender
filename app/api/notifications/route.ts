import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/notifications - Get recent inbound email notifications
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent replies (last 24 hours) for user's campaigns
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentReplies = await prisma.reply.findMany({
      where: {
        campaign: {
          project: {
            userId: session.user.id,
          },
        },
        receivedAt: {
          gte: oneDayAgo,
        },
      },
      include: {
        campaign: {
          select: {
            name: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        receivedAt: "desc",
      },
      take: 10,
    });

    const notifications = recentReplies.map((reply) => ({
      id: reply.id,
      from: reply.fromEmail,
      fromName: reply.fromName,
      subject: reply.subject,
      receivedAt: reply.receivedAt,
      campaign: reply.campaign.name,
      project: reply.campaign.project.name,
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
