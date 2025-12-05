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

    if (webhookSecret) {
      const svixId = headersList.get("svix-id");
      const svixTimestamp = headersList.get("svix-timestamp");
      const svixSignature = headersList.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing Svix headers");
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
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }

      // Check timestamp to prevent replay attacks (5 minutes tolerance)
      const timestamp = parseInt(svixTimestamp);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        console.error("Webhook timestamp too old");
        return NextResponse.json(
          { error: "Webhook timestamp expired" },
          { status: 401 }
        );
      }
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

  // Detect if it's a bot (Resend provides this info)
  const isBot = data.is_bot || false;

  // Create open event
  await prisma.openEvent.create({
    data: {
      emailEventId: emailEvent.id,
      openedAt: new Date(data.opened_at || data.created_at),
      ipAddress: data.ip_address || null,
      userAgent: data.user_agent || null,
      country: data.location?.country || null,
      city: data.location?.city || null,
      device: data.device?.type || null,
      browser: data.browser?.name || null,
      os: data.os?.name || null,
      isUnique,
      isBot,
    },
  });

  console.log(`Email opened: ${data.email_id} (unique: ${isUnique}, bot: ${isBot})`);
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

  // Create click event
  await prisma.clickEvent.create({
    data: {
      emailEventId: emailEvent.id,
      linkUrl: data.link || data.url || "",
      clickedAt: new Date(data.clicked_at || data.created_at),
      ipAddress: data.ip_address || null,
      userAgent: data.user_agent || null,
      country: data.location?.country || null,
      city: data.location?.city || null,
      device: data.device?.type || null,
      browser: data.browser?.name || null,
      os: data.os?.name || null,
    },
  });

  console.log(`Email clicked: ${data.email_id} - Link: ${data.link || data.url}`);
}
