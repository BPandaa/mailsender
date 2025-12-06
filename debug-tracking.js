// Debug script to check tracking issues
// Run with: node debug-tracking.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugTracking() {
  console.log('🔍 Debugging Tracking Issues...\n');

  // Check for the specific email IDs mentioned
  const emailIds = [
    '8f27c480-7dc2-4c07-a7cd-41424146a082',
    '8f371041-8121-4560-9fd1-d1513a8eac45'
  ];

  console.log('📧 Checking EmailEvent records...\n');

  for (const resendId of emailIds) {
    const emailEvent = await prisma.emailEvent.findFirst({
      where: { resendId },
      include: {
        opens: true,
        clicks: true,
        campaign: {
          select: {
            name: true,
            subject: true
          }
        },
        subscriber: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    if (emailEvent) {
      console.log(`✅ Found EmailEvent for: ${resendId}`);
      console.log(`   Campaign: ${emailEvent.campaign.name}`);
      console.log(`   Subscriber: ${emailEvent.subscriber.email}`);
      console.log(`   Status: ${emailEvent.status}`);
      console.log(`   Sent At: ${emailEvent.sentAt}`);
      console.log(`   Opens: ${emailEvent.opens.length}`);
      console.log(`   Clicks: ${emailEvent.clicks.length}`);

      if (emailEvent.opens.length > 0) {
        console.log('   Open Details:');
        emailEvent.opens.forEach((open, i) => {
          console.log(`     ${i + 1}. Opened at: ${open.openedAt}`);
          console.log(`        IP: ${open.ipAddress || 'N/A'}`);
          console.log(`        Device: ${open.device || 'N/A'}`);
          console.log(`        Is Unique: ${open.isUnique}`);
        });
      }
    } else {
      console.log(`❌ No EmailEvent found for: ${resendId}`);
      console.log(`   This means the email was sent but not stored in database properly`);
    }
    console.log('');
  }

  // Check recent campaigns
  console.log('📊 Recent Campaigns:\n');
  const recentCampaigns = await prisma.campaign.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          emailEvents: true,
          replies: true
        }
      }
    }
  });

  recentCampaigns.forEach((campaign) => {
    console.log(`Campaign: ${campaign.name}`);
    console.log(`  Status: ${campaign.status}`);
    console.log(`  Email Events: ${campaign._count.emailEvents}`);
    console.log(`  Replies: ${campaign._count.replies}`);
    console.log('');
  });

  // Check if Reply model exists (migration ran)
  console.log('🔧 Checking Reply model...\n');
  try {
    const replyCount = await prisma.reply.count();
    console.log(`✅ Reply model exists! Found ${replyCount} replies`);

    if (replyCount > 0) {
      const recentReplies = await prisma.reply.findMany({
        take: 5,
        orderBy: { receivedAt: 'desc' },
        include: {
          campaign: {
            select: { name: true }
          }
        }
      });

      console.log('\nRecent Replies:');
      recentReplies.forEach((reply) => {
        console.log(`  From: ${reply.fromEmail}`);
        console.log(`  Campaign: ${reply.campaign.name}`);
        console.log(`  Subject: ${reply.subject}`);
        console.log(`  Received: ${reply.receivedAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.log('❌ Reply model does not exist!');
    console.log('   Run: npx prisma migrate dev --name add_reply_model');
    console.log('');
  }

  // Check OpenEvents
  console.log('👀 Checking OpenEvents...\n');
  const openCount = await prisma.openEvent.count();
  console.log(`Total Opens: ${openCount}`);

  if (openCount > 0) {
    const recentOpens = await prisma.openEvent.findMany({
      take: 5,
      orderBy: { openedAt: 'desc' },
      include: {
        emailEvent: {
          include: {
            campaign: {
              select: { name: true }
            },
            subscriber: {
              select: { email: true }
            }
          }
        }
      }
    });

    console.log('\nRecent Opens:');
    recentOpens.forEach((open) => {
      console.log(`  Campaign: ${open.emailEvent.campaign.name}`);
      console.log(`  Subscriber: ${open.emailEvent.subscriber.email}`);
      console.log(`  Opened At: ${open.openedAt}`);
      console.log(`  Device: ${open.device || 'N/A'}`);
      console.log('');
    });
  }

  await prisma.$disconnect();
}

debugTracking().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
