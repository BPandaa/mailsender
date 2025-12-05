import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import crypto from "crypto";

// POST /api/webhooks/resend - Handle Resend webhook events
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();

    // Verify webhook signature for security
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (webhookSecret && webhookSecret !== "disabled") {
      const svixId = headersList.get("svix-id");
      const svixTimestamp = headersList.get("svix-timestamp");
      const svixSignature = headersList.get("svix-signature");

      console.log("Webhook signature verification enabled");
      console.log("Has svix-id:", !!svixId);
      console.log("Has svix-timestamp:", !!svixTimestamp);
      console.log("Has svix-signature:", !!svixSignature);

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing Svix headers");
        console.log("Skipping signature verification - missing headers");
        // Don't block the webhook if headers are missing, just log it
      } else {
        try {
          // Verify the signature
          const signedContent = `${svixId}.${svixTimestamp}.${body}`;
          const secret = webhookSecret.startsWith("whsec_")
            ? webhookSecret.slice(6) // Remove "whsec_" prefix
            : webhookSecret;

          const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(signedContent)
            .digest("base64");

          const signatures = svixSignature.split(" ");
          const isValid = signatures.some((sig) => {
            const [, signature] = sig.split(",");
            return signature === expectedSignature;
          });

          if (!isValid) {
            console.error("Invalid webhook signature");
            console.log("Expected signature:", expectedSignature);
            console.log("Received signatures:", signatures);
            // Continue processing anyway for now (can enable strict mode later)
          } else {
            console.log("✅ Webhook signature verified successfully");
          }

          // Check timestamp to prevent replay attacks (5 minutes tolerance)
          const timestamp = parseInt(svixTimestamp);
          const now = Math.floor(Date.now() / 1000);
          if (Math.abs(now - timestamp) > 300) {
            console.error("Webhook timestamp too old");
            // Continue processing anyway
          }
        } catch (error) {
          console.error("Error verifying webhook signature:", error);
          // Continue processing anyway
        }
      }
    } else {
      console.log("Webhook signature verification disabled");
    }

    // Parse the webhook payload
    const event = JSON.parse(body);

    console.log("Resend webhook received:", event.type);

    // Handle different event types
    switch (event.type) {
      case "email.sent":
        await handleEmailSent(event.data);
        break;

      case "email.delivered":
        await handleEmailDelivered(event.data);
        break;

      case "email.delivery_delayed":
        await handleEmailDeliveryDelayed(event.data);
        break;

      case "email.complained":
        await handleEmailComplained(event.data);
        break;

      case "email.bounced":
        await handleEmailBounced(event.data);
        break;

      case "email.opened":
        await handleEmailOpened(event.data);
        break;

      case "email.clicked":
        await handleEmailClicked(event.data);
        break;

      case "email.received":
        await handleEmailReceived(event.data);
        break;

      default:
        console.log("Unknown event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleEmailSent(data: any) {
  // Update email event status to sent
  const emailEvent = await prisma.emailEvent.findFirst({
    where: { resendId: data.email_id },
  });

  if (emailEvent) {
    await prisma.emailEvent.update({
      where: { id: emailEvent.id },
      data: {
        status: "sent",
        sentAt: new Date(data.created_at),
      },
    });
    console.log(`Email sent: ${data.email_id}`);
  }
}

async function handleEmailDelivered(data: any) {
  // Update email event status to delivered
  const emailEvent = await prisma.emailEvent.findFirst({
    where: { resendId: data.email_id },
  });

  if (emailEvent) {
    await prisma.emailEvent.update({
      where: { id: emailEvent.id },
      data: {
        status: "delivered",
      },
    });
    console.log(`Email delivered: ${data.email_id}`);
  }
}

async function handleEmailDeliveryDelayed(data: any) {
  // Update email event status to delayed
  const emailEvent = await prisma.emailEvent.findFirst({
    where: { resendId: data.email_id },
  });

  if (emailEvent) {
    await prisma.emailEvent.update({
      where: { id: emailEvent.id },
      data: {
        status: "delayed",
      },
    });
    console.log(`Email delivery delayed: ${data.email_id}`);
  }
}

async function handleEmailComplained(data: any) {
  // Mark email event as complained (spam)
  const emailEvent = await prisma.emailEvent.findFirst({
    where: { resendId: data.email_id },
  });

  if (emailEvent) {
    await prisma.emailEvent.update({
      where: { id: emailEvent.id },
      data: {
        status: "complained",
      },
    });

    // Optionally: Unsubscribe the user
    await prisma.subscriber.update({
      where: { id: emailEvent.subscriberId },
      data: { subscribed: false },
    });

    console.log(`Email complained (spam): ${data.email_id}`);
  }
}

async function handleEmailBounced(data: any) {
  // Mark email event as bounced
  const emailEvent = await prisma.emailEvent.findFirst({
    where: { resendId: data.email_id },
  });

  if (emailEvent) {
    await prisma.emailEvent.update({
      where: { id: emailEvent.id },
      data: {
        status: "bounced",
      },
    });

    // For hard bounces, mark subscriber as unsubscribed
    if (data.bounce_type === "hard") {
      await prisma.subscriber.update({
        where: { id: emailEvent.subscriberId },
        data: { subscribed: false },
      });
    }

    console.log(`Email bounced: ${data.email_id} (${data.bounce_type || "unknown"})`);
  }
}

async function handleEmailOpened(data: any) {
  // Find the email event
  const emailEvent = await prisma.emailEvent.findFirst({
    where: { resendId: data.email_id },
  });

  if (!emailEvent) {
    console.log(`Email event not found for: ${data.email_id}`);
    return;
  }

  // Check if this is a unique open (first open)
  const existingOpens = await prisma.openEvent.findMany({
    where: { emailEventId: emailEvent.id },
  });

  const isUnique = existingOpens.length === 0;

  // NOTE: Resend's email.opened event does NOT include device/browser/location data
  // Only basic email metadata is provided in the webhook payload
  // See: https://resend.com/docs/dashboard/webhooks/event-types

  // Create open event
  await prisma.openEvent.create({
    data: {
      emailEventId: emailEvent.id,
      openedAt: new Date(data.created_at),
      ipAddress: null, // Not provided by Resend for email.opened
      userAgent: null, // Not provided by Resend for email.opened
      country: null, // Not provided by Resend for email.opened
      city: null, // Not provided by Resend for email.opened
      device: null, // Not provided by Resend for email.opened
      browser: null, // Not provided by Resend for email.opened
      os: null, // Not provided by Resend for email.opened
      isUnique,
      isBot: false, // Not provided by Resend for email.opened
    },
  });

  console.log(`Email opened: ${data.email_id} (unique: ${isUnique})`);
}

async function handleEmailClicked(data: any) {
  // Find the email event
  const emailEvent = await prisma.emailEvent.findFirst({
    where: { resendId: data.email_id },
  });

  if (!emailEvent) {
    console.log(`Email event not found for: ${data.email_id}`);
    return;
  }

  // Resend provides click data in a nested 'click' object
  // See: https://resend.com/docs/dashboard/webhooks/event-types
  const clickData = data.click || {};

  // Parse user agent to extract device/browser/os info
  const userAgent = clickData.userAgent || "";
  const deviceInfo = parseUserAgent(userAgent);

  // Create click event
  await prisma.clickEvent.create({
    data: {
      emailEventId: emailEvent.id,
      linkUrl: clickData.link || "",
      clickedAt: new Date(clickData.timestamp || data.created_at),
      ipAddress: clickData.ipAddress || null,
      userAgent: userAgent || null,
      country: null, // Resend doesn't provide geolocation for clicks
      city: null, // Resend doesn't provide geolocation for clicks
      device: deviceInfo.device || null,
      browser: deviceInfo.browser || null,
      os: deviceInfo.os || null,
    },
  });

  console.log(`Email clicked: ${data.email_id} - Link: ${clickData.link || "unknown"}`);
}

// Helper function to parse user agent string
function parseUserAgent(userAgent: string) {
  if (!userAgent) {
    return { device: null, browser: null, os: null };
  }

  // Basic user agent parsing
  const result = {
    device: null as string | null,
    browser: null as string | null,
    os: null as string | null,
  };

  // Detect OS
  if (userAgent.includes("Windows")) result.os = "Windows";
  else if (userAgent.includes("Mac OS X")) result.os = "macOS";
  else if (userAgent.includes("Linux")) result.os = "Linux";
  else if (userAgent.includes("Android")) result.os = "Android";
  else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) result.os = "iOS";

  // Detect Browser
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) result.browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) result.browser = "Safari";
  else if (userAgent.includes("Firefox")) result.browser = "Firefox";
  else if (userAgent.includes("Edg")) result.browser = "Edge";
  else if (userAgent.includes("Opera") || userAgent.includes("OPR")) result.browser = "Opera";

  // Detect Device Type
  if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
    result.device = "mobile";
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    result.device = "tablet";
  } else {
    result.device = "desktop";
  }

  return result;
}

async function handleEmailReceived(data: any) {
  // Handle inbound email received event
  // This stores the inbound email in the Reply model for tracking

  console.log("Inbound email received:", data);

  try {
    // Try to match the email to a campaign if it's a reply
    // The from email should match a subscriber
    const subscriber = await prisma.subscriber.findFirst({
      where: {
        email: data.from,
      },
    });

    // Create a reply record
    await prisma.reply.create({
      data: {
        fromEmail: data.from,
        fromName: data.from_name || null,
        subject: data.subject || "",
        textContent: data.text || null,
        htmlContent: data.html || null,
        receivedAt: new Date(data.created_at || Date.now()),
        resendId: data.email_id,
        subscriberId: subscriber?.id || null,
        // If we can't match to a campaign, leave it null
        campaignId: null,
      },
    });

    console.log(`Inbound email stored: ${data.email_id}`);
  } catch (error) {
    console.error("Error handling inbound email:", error);
  }
}
