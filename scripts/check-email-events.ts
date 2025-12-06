import prisma from "../lib/prisma";

async function checkEmailEvents() {
  try {
    console.log("=== Checking Email Events ===\n");

    // Get all email events
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

    console.log(`Found ${emailEvents.length} recent email events:\n`);

    emailEvents.forEach((event, index) => {
      console.log(`${index + 1}. EmailEvent ID: ${event.id}`);
      console.log(`   Resend ID: ${event.resendId || "NULL - THIS IS THE PROBLEM!"}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Campaign: ${event.campaign.name}`);
      console.log(`   Subscriber: ${event.subscriber.email}`);
      console.log(`   Sent At: ${event.sentAt}`);
      console.log("");
    });

    // Check if any have null resendId
    const nullResendIds = emailEvents.filter((e) => !e.resendId);
    if (nullResendIds.length > 0) {
      console.log(
        `⚠️  WARNING: ${nullResendIds.length} EmailEvents have NULL resendId!`
      );
      console.log(
        "This means webhooks cannot match them. Check the campaign send code."
      );
    }

    // Check for the specific email_id from the webhook
    const specificId = "25e31e4c-1085-4035-9598-4a783e39d325";
    const matchingEvent = await prisma.emailEvent.findFirst({
      where: { resendId: specificId },
    });

    console.log(`\n=== Checking for specific email_id: ${specificId} ===`);
    if (matchingEvent) {
      console.log(`✅ Found matching EmailEvent: ${matchingEvent.id}`);
      console.log(`   Status: ${matchingEvent.status}`);
    } else {
      console.log(`❌ No EmailEvent found with this resendId`);
      console.log(`   This is why the webhook cannot update the status!`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailEvents();
