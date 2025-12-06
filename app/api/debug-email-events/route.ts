import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get recent email events
    const emailEvents = await prisma.emailEvent.findMany({
      orderBy: { sentAt: "desc" },
      take: 10,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            subject: true,
          },
        },
        subscriber: {
          select: {
            email: true,
          },
        },
      },
    });

    // Check if any have null resendId
    const nullResendIds = emailEvents.filter((e) => !e.resendId);

    // Check for the specific email_id from webhook
    const specificId = "25e31e4c-1085-4035-9598-4a783e39d325";
    const matchingEvent = await prisma.emailEvent.findFirst({
      where: { resendId: specificId },
    });

    return NextResponse.json({
      totalEvents: emailEvents.length,
      eventsWithNullResendId: nullResendIds.length,
      specificEmailFound: !!matchingEvent,
      specificEmailId: specificId,
      events: emailEvents.map((e) => ({
        id: e.id,
        resendId: e.resendId,
        status: e.status,
        campaign: e.campaign.name,
        subscriber: e.subscriber.email,
        sentAt: e.sentAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
