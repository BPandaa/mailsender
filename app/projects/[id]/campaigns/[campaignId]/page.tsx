import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { SendCampaignButton } from "./SendCampaignButton";
import { DeleteCampaignButton } from "./DeleteCampaignButton";

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

  // Get replies to this campaign
  const replies = await prisma.reply.findMany({
    where: { campaignId },
    include: {
      subscriber: true,
    },
    orderBy: { receivedAt: "desc" },
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
    replies,
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
              {analytics.totalSent}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {analytics.emailsWithOpens} opened
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

        {/* Recipients List */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 mb-8">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Recipients ({analytics.emailEvents.length})
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              All email addresses this campaign was sent to
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Opened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Clicked
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Sent At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {analytics.emailEvents.map((event) => {
                  const hasOpened = event.opens.length > 0;
                  const hasClicked = event.clicks.length > 0;
                  return (
                    <tr key={event.id} className="hover:bg-zinc-800/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {event.subscriber.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                        {event.subscriber.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            event.status === "delivered"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : event.status === "failed"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {hasOpened ? (
                          <span className="text-green-400">
                            ✓ {event.opens.length}x
                          </span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {hasClicked ? (
                          <span className="text-blue-400">
                            ✓ {event.clicks.length}x
                          </span>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                        {new Date(event.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Replies Section */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 mb-8">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Replies ({analytics.replies.length})
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Emails received in response to this campaign
            </p>
          </div>
          {analytics.replies.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              No replies yet
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {analytics.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-6 hover:bg-zinc-800/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Reply
                        </span>
                        <span className="text-sm text-white font-medium">
                          {reply.fromName || reply.fromEmail}
                        </span>
                      </div>
                      <h3 className="text-sm text-zinc-300 mb-1">
                        {reply.subject}
                      </h3>
                      {reply.textContent && (
                        <p className="text-sm text-zinc-500 line-clamp-2">
                          {reply.textContent}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xs text-zinc-400">
                        {new Date(reply.receivedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(reply.receivedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
