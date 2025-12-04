import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/analytics/[projectId] - Get analytics for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get date range from query params (default: last 30 days)
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Get subscriber count
    const totalSubscribers = await prisma.subscriber.count({
      where: {
        projectId: projectId,
        subscribed: true,
      },
    });

    // 2. Get campaign stats
    const campaigns = await prisma.campaign.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        emailEvents: {
          include: {
            opens: true,
            clicks: true,
          },
        },
      },
    });

    const campaignStats = campaigns.map((campaign) => {
      const totalSent = campaign.emailEvents.length;
      const uniqueOpens = new Set(campaign.emailEvents.filter(e => e.opens.length > 0).map(e => e.subscriberId)).size;
      const totalOpens = campaign.emailEvents.reduce((sum, e) => sum + e.opens.length, 0);
      const uniqueClicks = new Set(campaign.emailEvents.filter(e => e.clicks.length > 0).map(e => e.subscriberId)).size;
      const totalClicks = campaign.emailEvents.reduce((sum, e) => sum + e.clicks.length, 0);

      return {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt,
        totalSent,
        uniqueOpens,
        totalOpens,
        uniqueClicks,
        totalClicks,
        openRate: totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (uniqueClicks / totalSent) * 100 : 0,
      };
    });

    // 3. Get overall stats
    const totalEmailsSent = campaigns.reduce((sum, c) => sum + c.emailEvents.length, 0);
    const allEmailEvents = campaigns.flatMap((c) => c.emailEvents);
    const totalUniqueOpens = new Set(
      allEmailEvents.filter((e) => e.opens.length > 0).map((e) => e.subscriberId)
    ).size;
    const totalOpens = allEmailEvents.reduce((sum, e) => sum + e.opens.length, 0);
    const totalUniqueClicks = new Set(
      allEmailEvents.filter((e) => e.clicks.length > 0).map((e) => e.subscriberId)
    ).size;
    const totalClicks = allEmailEvents.reduce((sum, e) => sum + e.clicks.length, 0);

    const overallStats = {
      totalSubscribers,
      totalCampaigns: campaigns.length,
      totalEmailsSent,
      totalUniqueOpens,
      totalOpens,
      totalUniqueClicks,
      totalClicks,
      avgOpenRate: totalEmailsSent > 0 ? (totalUniqueOpens / totalEmailsSent) * 100 : 0,
      avgClickRate: totalEmailsSent > 0 ? (totalUniqueClicks / totalEmailsSent) * 100 : 0,
    };

    // 4. Get timeline data for charts (opens and clicks over time)
    const openEvents = await prisma.openEvent.findMany({
      where: {
        emailEvent: {
          campaign: {
            projectId: projectId,
          },
        },
        openedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        openedAt: "asc",
      },
    });

    const clickEvents = await prisma.clickEvent.findMany({
      where: {
        emailEvent: {
          campaign: {
            projectId: projectId,
          },
        },
        clickedAt: {
          gte: startDate,
        },
      },
      orderBy: {
        clickedAt: "asc",
      },
    });

    // Group by date
    const timelineData: Record<string, { opens: number; clicks: number }> = {};

    openEvents.forEach((event) => {
      const date = event.openedAt.toISOString().split("T")[0];
      if (!timelineData[date]) {
        timelineData[date] = { opens: 0, clicks: 0 };
      }
      timelineData[date].opens++;
    });

    clickEvents.forEach((event) => {
      const date = event.clickedAt.toISOString().split("T")[0];
      if (!timelineData[date]) {
        timelineData[date] = { opens: 0, clicks: 0 };
      }
      timelineData[date].clicks++;
    });

    const timeline = Object.entries(timelineData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Top links
    const linkStats: Record<string, number> = {};
    clickEvents.forEach((event) => {
      linkStats[event.linkUrl] = (linkStats[event.linkUrl] || 0) + 1;
    });

    const topLinks = Object.entries(linkStats)
      .map(([url, clicks]) => ({ url, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // 6. Device stats
    const deviceStats: Record<string, number> = {};
    [...openEvents, ...clickEvents].forEach((event) => {
      if (event.device) {
        deviceStats[event.device] = (deviceStats[event.device] || 0) + 1;
      }
    });

    const devices = Object.entries(deviceStats).map(([device, count]) => ({
      device,
      count,
    }));

    // 7. Browser stats
    const browserStats: Record<string, number> = {};
    [...openEvents, ...clickEvents].forEach((event) => {
      if (event.browser) {
        browserStats[event.browser] = (browserStats[event.browser] || 0) + 1;
      }
    });

    const browsers = Object.entries(browserStats).map(([browser, count]) => ({
      browser,
      count,
    }));

    // 8. Geographic stats
    const countryStats: Record<string, number> = {};
    [...openEvents, ...clickEvents].forEach((event) => {
      if (event.country) {
        countryStats[event.country] = (countryStats[event.country] || 0) + 1;
      }
    });

    const countries = Object.entries(countryStats)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      overallStats,
      campaignStats,
      timeline,
      topLinks,
      devices,
      browsers,
      countries,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
