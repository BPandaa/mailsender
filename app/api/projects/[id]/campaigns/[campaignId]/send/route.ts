import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendEmail, rewriteLinksForTracking, insertTrackingPixel } from "@/lib/email";
import { personalizeContent } from "@/lib/personalize";

// POST /api/projects/[id]/campaigns/[campaignId]/send - Send campaign
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id, campaignId } = await params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get campaign
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        projectId: id,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get all subscribed subscribers
    const subscribers = await prisma.subscriber.findMany({
      where: {
        projectId: id,
        subscribed: true,
      },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No subscribers found" },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sending" },
    });

    const { fromEmail } = await request.json();

    if (!fromEmail) {
      return NextResponse.json(
        { error: "From email address is required" },
        { status: 400 }
      );
    }

    // Get base URL for tracking links
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send emails
    for (const subscriber of subscribers) {
      try {
        // Create email event record
        const emailEvent = await prisma.emailEvent.create({
          data: {
            campaignId: campaignId,
            subscriberId: subscriber.id,
            status: "sent",
          },
        });

        // Prepare email content with personalization
        let emailHtml = personalizeContent(campaign.content, subscriber);
        let emailSubject = personalizeContent(campaign.subject, subscriber);

        // Insert tracking pixel
        emailHtml = insertTrackingPixel(emailHtml, emailEvent.id, baseUrl);

        // Rewrite links for click tracking
        emailHtml = rewriteLinksForTracking(emailHtml, emailEvent.id, baseUrl);

        // Send email
        const result = await sendEmail({
          to: subscriber.email,
          from: fromEmail,
          subject: emailSubject,
          html: emailHtml,
        });

        console.log(`Send result for ${subscriber.email}:`, result);

        if (result.success) {
          console.log(`✅ Email sent successfully to ${subscriber.email}, Message ID: ${result.messageId}`);
          // Update email event with Resend message ID
          await prisma.emailEvent.update({
            where: { id: emailEvent.id },
            data: {
              resendId: result.messageId || null,
              status: "delivered",
            },
          });
          results.sent++;
        } else {
          console.error(`❌ Failed to send to ${subscriber.email}:`, result.error);
          // Mark as failed
          await prisma.emailEvent.update({
            where: { id: emailEvent.id },
            data: { status: "failed" },
          });
          results.failed++;
          results.errors.push(`Failed to send to ${subscriber.email}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Error sending to ${subscriber.email}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Campaign sent",
      results,
    });
  } catch (error) {
    console.error("Send campaign error:", error);

    // Try to update campaign status to failed
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "failed" },
      });
    } catch (e) {
      // Ignore update error
    }

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
