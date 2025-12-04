import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { CampaignListItem } from "./CampaignListItem";

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) notFound();
  return project;
}

async function getCampaigns(projectId: string) {
  return await prisma.campaign.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { emailEvents: true },
      },
    },
  });
}

async function getCampaignStats(campaignId: string) {
  const [totalSent, opens, clicks] = await Promise.all([
    prisma.emailEvent.count({
      where: { campaignId, status: "sent" },
    }),
    prisma.openEvent.count({
      where: { emailEvent: { campaignId } },
    }),
    prisma.clickEvent.count({
      where: { emailEvent: { campaignId } },
    }),
  ]);

  return { totalSent, opens, clicks };
}

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  const campaigns = await getCampaigns(id);

  // Get stats for each campaign
  const campaignsWithStats = await Promise.all(
    campaigns.map(async (campaign) => {
      const stats = await getCampaignStats(campaign.id);
      return { ...campaign, stats };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${id}`}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
                <p className="text-gray-600 text-sm mt-1">{project.name}</p>
              </div>
            </div>
            <Link
              href={`/projects/${id}/campaigns/new`}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              New Campaign
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No campaigns yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first email campaign to get started
            </p>
            <Link
              href={`/projects/${id}/campaigns/new`}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {campaignsWithStats.map((campaign) => (
              <CampaignListItem
                key={campaign.id}
                campaign={campaign}
                projectId={id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
