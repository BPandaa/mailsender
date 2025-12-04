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

  // Calculate stats
  const totalSent = emailEvents.filter((e) => e.status === "sent").length;
  const totalOpens = emailEvents.filter((e) => e.opens.length > 0).length;
  const totalClicks = emailEvents.filter((e) => e.clicks.length > 0).length;
  const uniqueOpens = new Set(
    emailEvents.filter((e) => e.opens.length > 0).map((e) => e.subscriberId)
  ).size;
  const uniqueClicks = new Set(
    emailEvents.filter((e) => e.clicks.length > 0).map((e) => e.subscriberId)
  ).size;

  // Get all opens and clicks
  const allOpens = emailEvents.flatMap((e) => e.opens);
  const allClicks = emailEvents.flatMap((e) => e.clicks);

  // Count by country
  const countryCounts: Record<string, number> = {};
  allOpens.forEach((open) => {
    if (open.country) {
      countryCounts[open.country] = (countryCounts[open.country] || 0) + 1;
    }
  });

  // Count by device
  const deviceCounts: Record<string, number> = {};
  allOpens.forEach((open) => {
    if (open.device) {
      deviceCounts[open.device] = (deviceCounts[open.device] || 0) + 1;
    }
  });

  // Count by browser
  const browserCounts: Record<string, number> = {};
  allOpens.forEach((open) => {
    if (open.browser) {
      browserCounts[open.browser] = (browserCounts[open.browser] || 0) + 1;
    }
  });

  // Count clicks by URL
  const urlCounts: Record<string, number> = {};
  allClicks.forEach((click) => {
    urlCounts[click.linkUrl] = (urlCounts[click.linkUrl] || 0) + 1;
  });

  // Opens over time (group by day)
  const opensOverTime: Record<string, number> = {};
  allOpens.forEach((open) => {
    const date = new Date(open.openedAt).toISOString().split("T")[0];
    opensOverTime[date] = (opensOverTime[date] || 0) + 1;
  });

  return {
    totalSent,
    totalOpens,
    totalClicks,
    uniqueOpens,
    uniqueClicks,
    allOpens,
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

  const openRate =
    analytics.totalSent > 0
      ? ((analytics.uniqueOpens / analytics.totalSent) * 100).toFixed(1)
      : "0";
  const clickRate =
    analytics.totalSent > 0
      ? ((analytics.uniqueClicks / analytics.totalSent) * 100).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${id}/campaigns`}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Campaigns
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {campaign.name}
                </h1>
                <p className="text-gray-600 text-sm mt-1">{campaign.subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  campaign.status === "sent"
                    ? "bg-green-100 text-green-800"
                    : campaign.status === "sending"
                    ? "bg-blue-100 text-blue-800"
                    : campaign.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Sent</div>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.totalSent}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Opens</div>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.uniqueOpens}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.allOpens.length} total
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Open Rate</div>
            <div className="text-3xl font-bold text-gray-900">{openRate}%</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Clicks</div>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.uniqueClicks}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.allClicks.length} total
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Click Rate</div>
            <div className="text-3xl font-bold text-gray-900">{clickRate}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Countries */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Top Countries</h3>
            </div>
            <div className="p-6">
              {Object.keys(analytics.countryCounts).length === 0 ? (
                <p className="text-gray-600 text-sm">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.countryCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([country, count]) => (
                      <div key={country} className="flex items-center justify-between">
                        <span className="text-gray-900">{country}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (count / analytics.allOpens.length) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-600 text-sm w-12 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Devices */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Devices</h3>
            </div>
            <div className="p-6">
              {Object.keys(analytics.deviceCounts).length === 0 ? (
                <p className="text-gray-600 text-sm">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.deviceCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([device, count]) => (
                      <div key={device} className="flex items-center justify-between">
                        <span className="text-gray-900 capitalize">{device}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (count / analytics.allOpens.length) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-600 text-sm w-12 text-right">
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
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Browsers</h3>
            </div>
            <div className="p-6">
              {Object.keys(analytics.browserCounts).length === 0 ? (
                <p className="text-gray-600 text-sm">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.browserCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([browser, count]) => (
                      <div key={browser} className="flex items-center justify-between">
                        <span className="text-gray-900">{browser}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${
                                  (count / analytics.allOpens.length) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-600 text-sm w-12 text-right">
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
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Top Links</h3>
            </div>
            <div className="p-6">
              {Object.keys(analytics.urlCounts).length === 0 ? (
                <p className="text-gray-600 text-sm">No clicks yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics.urlCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([url, count]) => (
                      <div key={url} className="flex items-center justify-between">
                        <span className="text-gray-900 text-sm truncate flex-1">
                          {url.length > 40 ? url.substring(0, 40) + "..." : url}
                        </span>
                        <span className="text-gray-600 text-sm ml-3">{count}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {[...analytics.allOpens.map((o) => ({ ...o, type: "open" })),
              ...analytics.allClicks.map((c) => ({ ...c, type: "click" }))]
              .sort((a, b) => {
                const timeA = "openedAt" in a ? a.openedAt : a.clickedAt;
                const timeB = "openedAt" in b ? b.openedAt : b.clickedAt;
                return new Date(timeB).getTime() - new Date(timeA).getTime();
              })
              .slice(0, 20)
              .map((event, idx) => {
                const time = "openedAt" in event ? event.openedAt : event.clickedAt;
                const emailEvent = analytics.emailEvents.find(
                  (e) => e.id === event.emailEventId
                );

                return (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              event.type === "open"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {event.type === "open" ? "Opened" : "Clicked"}
                          </span>
                          <span className="text-sm text-gray-900">
                            {emailEvent?.subscriber.email}
                          </span>
                        </div>
                        {event.type === "click" && "linkUrl" in event && (
                          <div className="text-xs text-gray-600 truncate">
                            {event.linkUrl}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {event.country && `${event.country} • `}
                          {event.device && `${event.device} • `}
                          {event.browser}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(time).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
