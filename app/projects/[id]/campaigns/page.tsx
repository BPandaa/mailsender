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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${id}`}
                className="text-zinc-400 hover:text-white transition"
              >
                ← Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Campaigns</h1>
                <p className="text-zinc-400 text-sm mt-1">{project.name}</p>
              </div>
            </div>
            <Link
              href={`/projects/${id}/campaigns/new`}
              className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium"
            >
              New Campaign
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {campaigns.length === 0 ? (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              No campaigns yet
            </h3>
            <p className="text-zinc-400 mb-6">
              Create your first email campaign to get started
            </p>
            <Link
              href={`/projects/${id}/campaigns/new`}
              className="inline-block bg-white text-black px-6 py-2 rounded-lg hover:bg-zinc-200 transition font-medium"
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
