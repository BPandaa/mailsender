import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

// POST /api/webhooks/resend-inbound - Handle Resend inbound email webhooks
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();

    // Verify webhook signature for security
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (webhookSecret) {
      const svixId = headersList.get("svix-id");
      const svixTimestamp = headersList.get("svix-timestamp");
      const svixSignature = headersList.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing Svix headers for inbound email");
        return NextResponse.json(
          { error: "Missing webhook signature headers" },
          { status: 401 }
        );
      }

      // Verify the signature
      const signedContent = `${svixId}.${svixTimestamp}.${body}`;
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret.split("_")[1] || webhookSecret)
        .update(signedContent)
        .digest("base64");

      const signatures = svixSignature.split(" ");
      const isValid = signatures.some((sig) => {
        const [, signature] = sig.split(",");
        return signature === expectedSignature;
      });

      if (!isValid) {
        console.error("Invalid webhook signature for inbound email");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }

      // Check timestamp to prevent replay attacks (5 minutes tolerance)
      const timestamp = parseInt(svixTimestamp);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        console.error("Webhook timestamp too old for inbound email");
        return NextResponse.json(
          { error: "Webhook timestamp expired" },
          { status: 401 }
        );
      }
    }

    // Parse the webhook payload
    const event = JSON.parse(body);

    console.log("Resend inbound email received:", event.type);

    // Handle inbound email event
    if (event.type === "email.received") {
      await handleInboundEmail(event.data);
    } else {
      console.log("Unknown inbound event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Inbound webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleInboundEmail(data: any) {
  try {
    console.log("Processing inbound email:", {
      from: data.from,
      to: data.to,
      subject: data.subject,
    });

    // Extract email address from "Name <email@example.com>" format
    const fromEmail = extractEmail(data.from);
    const toEmail = extractEmail(data.to);

    if (!fromEmail || !toEmail) {
      console.error("Could not extract email addresses from inbound email");
      return;
    }

    // Find the subscriber by email
    const subscriber = await prisma.subscriber.findFirst({
      where: {
        email: fromEmail,
      },
      include: {
        project: true,
      },
    });

    if (!subscriber) {
      console.log(`No subscriber found for inbound email from: ${fromEmail}`);
      return;
    }

    // Try to find the campaign this is replying to
    // This can be done by checking the subject line for "Re:" or looking at In-Reply-To header
    let campaignId = null;

    // Option 1: Check recent campaigns sent to this subscriber
    const recentEmailEvent = await prisma.emailEvent.findFirst({
      where: {
        subscriberId: subscriber.id,
      },
      orderBy: {
        sentAt: "desc",
      },
      include: {
        campaign: true,
      },
    });

    if (recentEmailEvent) {
      campaignId = recentEmailEvent.campaignId;
    } else {
      // If no recent email found, associate with the most recent campaign in the project
      const recentCampaign = await prisma.campaign.findFirst({
        where: {
          projectId: subscriber.projectId,
        },
        orderBy: {
          sentAt: "desc",
        },
      });

      if (recentCampaign) {
        campaignId = recentCampaign.id;
      }
    }

    if (!campaignId) {
      console.log("Could not determine campaign for inbound email");
      return;
    }

    // Create reply record
    const reply = await prisma.reply.create({
      data: {
        campaignId,
        subscriberId: subscriber.id,
        fromEmail,
        fromName: extractName(data.from),
        subject: data.subject || "(No subject)",
        textContent: data.text || null,
        htmlContent: data.html || null,
        resendId: data.email_id || null,
        receivedAt: new Date(data.created_at || Date.now()),
      },
      include: {
        campaign: true,
      },
    });

    console.log(
      `Reply saved from ${fromEmail} for campaign ${campaignId}`
    );

    // Forward reply to configured email address
    const forwardToEmail = process.env.REPLY_FORWARD_EMAIL;
    const forwardFromEmail = process.env.REPLY_FORWARD_FROM_EMAIL;

    if (forwardToEmail && forwardFromEmail) {
      try {
        await sendEmail({
          to: forwardToEmail,
          from: forwardFromEmail,
          subject: `[Reply] ${reply.subject} - ${reply.campaign.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 10px 0; color: #111827;">New Campaign Reply</h2>
                <div style="color: #6b7280; font-size: 14px;">
                  <p style="margin: 5px 0;"><strong>Campaign:</strong> ${reply.campaign.name}</p>
                  <p style="margin: 5px 0;"><strong>From:</strong> ${reply.fromName || ""} &lt;${reply.fromEmail}&gt;</p>
                  <p style="margin: 5px 0;"><strong>Subject:</strong> ${reply.subject}</p>
                  <p style="margin: 5px 0;"><strong>Received:</strong> ${reply.receivedAt.toLocaleString()}</p>
                </div>
              </div>

              <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px;">Reply Content:</h3>
                ${reply.htmlContent || `<p style="white-space: pre-wrap; color: #374151;">${reply.textContent || "(No content)"}</p>`}
              </div>

              <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; font-size: 13px; color: #92400e;">
                <strong>💡 Tip:</strong> Reply directly to this email to respond to ${reply.fromEmail}
              </div>
            </div>
          `,
        });

        console.log(`Reply forwarded to ${forwardToEmail}`);
      } catch (error) {
        console.error("Failed to forward reply email:", error);
        // Don't fail the webhook if forwarding fails
      }
    }
  } catch (error) {
    console.error("Error handling inbound email:", error);
  }
}

// Extract email address from "Name <email@example.com>" or "email@example.com"
function extractEmail(emailString: string): string | null {
  if (!emailString) return null;

  const match = emailString.match(/<([^>]+)>/);
  if (match) {
    return match[1].toLowerCase();
  }

  // If no angle brackets, assume it's just the email
  return emailString.toLowerCase().trim();
}

// Extract name from "Name <email@example.com>"
function extractName(emailString: string): string | null {
  if (!emailString) return null;

  const match = emailString.match(/^([^<]+)</);
  if (match) {
    return match[1].trim();
  }

  return null;
}
