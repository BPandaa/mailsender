import prisma from "./lib/prisma";

async function checkReplySetup() {
  const replyEmail = "badradnani46@gmail.com";

  console.log("🔍 Checking reply setup for:", replyEmail);
  console.log("=" .repeat(60));

  // 1. Check if subscriber exists
  const subscriber = await prisma.subscriber.findFirst({
    where: { email: replyEmail },
    include: { project: true },
  });

  if (subscriber) {
    console.log("✅ Subscriber found:");
    console.log("   - Name:", subscriber.name);
    console.log("   - Project:", subscriber.project.name);
    console.log("   - Subscribed:", subscriber.subscribed);
  } else {
    console.log("❌ Subscriber NOT found in database");
    console.log("   This is why replies aren't being matched to campaigns!");
    return;
  }

  // 2. Check if campaigns were sent to this subscriber
  const emailEvents = await prisma.emailEvent.findMany({
    where: { subscriberId: subscriber.id },
    include: { campaign: true },
    orderBy: { sentAt: "desc" },
    take: 5,
  });

  if (emailEvents.length > 0) {
    console.log(`\n✅ Found ${emailEvents.length} email(s) sent to this subscriber:`);
    emailEvents.forEach((event) => {
      console.log(`   - Campaign: "${event.campaign.name}"`);
      console.log(`     Status: ${event.status}`);
      console.log(`     Sent: ${event.sentAt}`);
    });
  } else {
    console.log("\n❌ No campaigns sent to this subscriber");
    console.log("   This is why replies can't be matched!");
  }

  // 3. Check existing replies
  const replies = await prisma.reply.findMany({
    where: { fromEmail: replyEmail },
  });

  console.log(`\n📧 Existing replies in database: ${replies.length}`);
  if (replies.length > 0) {
    replies.forEach((reply) => {
      console.log(`   - Subject: "${reply.subject}"`);
      console.log(`     Received: ${reply.receivedAt}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Solutions:");
  console.log("   1. Make sure badradnani46@gmail.com is added as a subscriber");
  console.log("   2. Send a campaign to this subscriber");
  console.log("   3. Then reply to that campaign email");
  console.log("   4. The webhook will match the reply to the campaign");
}

checkReplySetup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
