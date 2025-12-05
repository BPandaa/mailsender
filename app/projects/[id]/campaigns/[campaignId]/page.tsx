import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { SendCampaignButton } from "./SendCampaignButton";
import { DeleteCampaignButton } from "./DeleteCampaignButton";
import { RecentActivity } from "./RecentActivity";

async function getCampaign(projectId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, projectId },
    include: {
      project: true,
    },
  });

  if (!campaign) notFound();
  return campaign;
}

async function getCampaignAnalytics(campaignId: string) {
  // Get all email events for this campaign
  const emailEvents = await prisma.emailEvent.findMany({
    where: { campaignId },
    include: {
      subscriber: true,
      opens: {
        orderBy: { openedAt: "desc" },
      },
      clicks: {
        orderBy: { clickedAt: "desc" },
      },
    },
  });

  // Get all opens and clicks
  const allOpens = emailEvents.flatMap((e) => e.opens);
  const allClicks = emailEvents.flatMap((e) => e.clicks);

  // Filter for unique, non-bot opens
  const realUniqueOpens = allOpens.filter((open) => open.isUnique && !open.isBot);
  const totalUniqueOpens = allOpens.filter((open) => open.isUnique);

  // Calculate stats
  const totalSent = emailEvents.length; // All email events created
  const emailsWithOpens = new Set(allOpens.map((o) => o.emailEventId)).size; // Emails that have been opened (delivered)
  const unopened = totalSent - emailsWithOpens; // Emails sent but not opened
  const uniqueOpens = new Set(realUniqueOpens.map((o) => o.emailEventId)).size;
  const uniqueClicks = new Set(allClicks.map((c) => c.emailEventId)).size;

  // Count by country (use real unique opens only, filter out bots)
  const countryCounts: Record<string, number> = {};
  realUniqueOpens.forEach((open) => {
    if (open.country) {
      countryCounts[open.country] = (countryCounts[open.country] || 0) + 1;
    }
  });

  // Count by device (use real unique opens only)
  const deviceCounts: Record<string, number> = {};
  realUniqueOpens.forEach((open) => {
    if (open.device) {
      deviceCounts[open.device] = (deviceCounts[open.device] || 0) + 1;
    }
  });

  // Count by browser (use real unique opens only)
  const browserCounts: Record<string, number> = {};
  realUniqueOpens.forEach((open) => {
    if (open.browser) {
      browserCounts[open.browser] = (browserCounts[open.browser] || 0) + 1;
    }
  });

  // Count clicks by URL
  const urlCounts: Record<string, number> = {};
  allClicks.forEach((click) => {
    urlCounts[click.linkUrl] = (urlCounts[click.linkUrl] || 0) + 1;
  });

  // Opens over time (group by day) - use real unique opens
  const opensOverTime: Record<string, number> = {};
  realUniqueOpens.forEach((open) => {
    const date = new Date(open.openedAt).toISOString().split("T")[0];
    opensOverTime[date] = (opensOverTime[date] || 0) + 1;
  });

  return {
    totalSent,
    emailsWithOpens,
    unopened,
    uniqueOpens,
    uniqueClicks,
    realUniqueOpens,
    totalUniqueOpens,
    allOpens, // Keep for debugging/showing all activity
    allClicks,
    countryCounts,
    deviceCounts,
    browserCounts,
    urlCounts,
    opensOverTime,
    emailEvents,
  };
}

export default async function CampaignAnalytics({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  const { id, campaignId } = await params;
  const campaign = await getCampaign(id, campaignId);
  const analytics = await getCampaignAnalytics(campaignId);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${id}/campaigns`}
                className="text-zinc-400 hover:text-white transition"
              >
                ← Campaigns
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {campaign.name}
                </h1>
                <p className="text-zinc-400 text-sm mt-1">{campaign.subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  campaign.status === "sent"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : campaign.status === "sending"
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : campaign.status === "failed"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                }`}
              >
                {campaign.status}
              </span>
              <SendCampaignButton
                campaignId={campaignId}
                projectId={id}
                status={campaign.status}
              />
              <DeleteCampaignButton
                campaignId={campaignId}
                projectId={id}
                campaignName={campaign.name}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Sent (Delivered)</div>
            <div className="text-3xl font-bold text-white">
              {analytics.emailsWithOpens}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Emails with opens
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Unopened</div>
            <div className="text-3xl font-bold text-white">
              {analytics.unopened}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Sent but not opened
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Unique Opens</div>
            <div className="text-3xl font-bold text-white">
              {analytics.uniqueOpens}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {analytics.totalUniqueOpens.length} total ({analytics.allOpens.length - analytics.totalUniqueOpens.length} bots)
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Clicks</div>
            <div className="text-3xl font-bold text-white">
              {analytics.uniqueClicks}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {analytics.allClicks.length} total
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Devices */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Devices</h3>
            </div>
            <div className="p-6">
              {Object.keys(analytics.deviceCounts).length === 0 ? (
                <p className="text-zinc-400 text-sm">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.deviceCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([device, count]) => (
                      <div key={device} className="flex items-center justify-between">
                        <span className="text-white capitalize">{device}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-zinc-800 rounded-full h-2">
                            <div
                              className="bg-white h-2 rounded-full"
                              style={{
                                width: `${
                                  (count / analytics.realUniqueOpens.length) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-zinc-400 text-sm w-12 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Browsers */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Browsers</h3>
            </div>
            <div className="p-6">
              {Object.keys(analytics.browserCounts).length === 0 ? (
                <p className="text-zinc-400 text-sm">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.browserCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([browser, count]) => (
                      <div key={browser} className="flex items-center justify-between">
                        <span className="text-white">{browser}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-zinc-800 rounded-full h-2">
                            <div
                              className="bg-white h-2 rounded-full"
                              style={{
                                width: `${
                                  (count / analytics.realUniqueOpens.length) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-zinc-400 text-sm w-12 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Links */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="font-semibold text-white">Top Links</h3>
            </div>
            <div className="p-6">
              {Object.keys(analytics.urlCounts).length === 0 ? (
                <p className="text-zinc-400 text-sm">No clicks yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.urlCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([url, count]) => (
                      <div key={url} className="flex items-center justify-between">
                        <span className="text-white text-sm truncate flex-1">
                          {url.length > 40 ? url.substring(0, 40) + "..." : url}
                        </span>
                        <span className="text-zinc-400 text-sm ml-3">{count}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity with Tabs */}
        <RecentActivity
          events={[
            // Sent events
            ...analytics.emailEvents
              .filter((e) => e.status === "sent")
              .map((e) => ({
                type: "sent" as const,
                email: e.subscriber.email,
                time: e.sentAt,
              })),
            // Open events
            ...analytics.allOpens.map((o) => {
              const emailEvent = analytics.emailEvents.find(
                (e) => e.id === o.emailEventId
              );
              return {
                type: "open" as const,
                email: emailEvent?.subscriber.email || "Unknown",
                country: o.country,
                city: o.city,
                device: o.device,
                browser: o.browser,
                time: o.openedAt,
                isBot: o.isBot,
                isUnique: o.isUnique,
              };
            }),
            // Click events
            ...analytics.allClicks.map((c) => {
              const emailEvent = analytics.emailEvents.find(
                (e) => e.id === c.emailEventId
              );
              return {
                type: "click" as const,
                email: emailEvent?.subscriber.email || "Unknown",
                country: c.country,
                city: c.city,
                device: c.device,
                browser: c.browser,
                time: c.clickedAt,
                linkUrl: c.linkUrl,
              };
            }),
          ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())}
        />
      </main>
    </div>
  );
}
