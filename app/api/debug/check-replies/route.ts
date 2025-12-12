import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || "badradnani46@gmail.com";

    const result = {
      email,
      subscriber: null as any,
      emailEventsSent: 0,
      recentCampaigns: [] as any[],
      repliesInDatabase: 0,
      recentReplies: [] as any[],
      diagnosis: [] as string[],
    };

    // 1. Check if subscriber exists
    const subscriber = await prisma.subscriber.findFirst({
      where: { email },
      include: { project: { select: { id: true, name: true } } },
    });

    if (subscriber) {
      result.subscriber = {
        id: subscriber.id,
        name: subscriber.name,
        email: subscriber.email,
        project: subscriber.project.name,
        subscribed: subscriber.subscribed,
      };
      result.diagnosis.push("✅ Subscriber exists in database");
    } else {
      result.diagnosis.push("❌ Subscriber NOT found - replies cannot be matched to campaigns");
      result.diagnosis.push("Solution: Add this email as a subscriber to a project");
      return NextResponse.json(result);
    }

    // 2. Check campaigns sent to this subscriber
    const emailEvents = await prisma.emailEvent.findMany({
      where: { subscriberId: subscriber.id },
      include: {
        campaign: {
          select: { id: true, name: true, subject: true, sentAt: true }
        }
      },
      orderBy: { sentAt: "desc" },
      take: 10,
    });

    result.emailEventsSent = emailEvents.length;
    result.recentCampaigns = emailEvents.map((event) => ({
      campaignId: event.campaign.id,
      campaignName: event.campaign.name,
      subject: event.campaign.subject,
      status: event.status,
      sentAt: event.sentAt,
    }));

    if (emailEvents.length > 0) {
      result.diagnosis.push(`✅ Found ${emailEvents.length} email(s) sent to this subscriber`);
      result.diagnosis.push("Most recent campaign: " + emailEvents[0].campaign.name);
    } else {
      result.diagnosis.push("❌ No campaigns sent to this subscriber");
      result.diagnosis.push("Solution: Send a campaign to this subscriber, then they can reply");
    }

    // 3. Check existing replies
    const replies = await prisma.reply.findMany({
      where: { fromEmail: email },
      include: {
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { receivedAt: "desc" },
      take: 10,
    });

    result.repliesInDatabase = replies.length;
    result.recentReplies = replies.map((reply) => ({
      id: reply.id,
      subject: reply.subject,
      campaign: reply.campaign.name,
      receivedAt: reply.receivedAt,
    }));

    if (replies.length > 0) {
      result.diagnosis.push(`✅ Found ${replies.length} reply(ies) in database`);
    } else {
      result.diagnosis.push("❌ No replies in database yet");

      if (emailEvents.length > 0) {
        result.diagnosis.push("Webhook may not be configured or not receiving events");
        result.diagnosis.push("Check: Resend Dashboard → Webhooks → Ensure 'email.received' event is enabled");
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Check replies error:", error);
    return NextResponse.json(
      { error: "Failed to check replies", details: String(error) },
      { status: 500 }
    );
  }
}
