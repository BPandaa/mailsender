import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

async function getProject(id: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscribers: true,
            campaigns: true,
            templates: true,
          },
        },
      },
    });

    if (!project) notFound();
    return project;
  } catch (error) {
    console.error("Error fetching project:", error);
    throw error;
  }
}

async function getProjectStats(id: string) {
  try {
    const [totalSent, totalOpens, totalClicks, recentCampaigns] =
      await Promise.all([
        // Total emails sent
        prisma.emailEvent.count({
          where: {
            campaign: { projectId: id },
            status: "sent",
          },
        }).catch((err) => {
          console.error("Error counting sent emails:", err);
          return 0;
        }),
        // Total opens
        prisma.openEvent.count({
          where: {
            emailEvent: {
              campaign: { projectId: id },
            },
          },
        }).catch((err) => {
          console.error("Error counting opens:", err);
          return 0;
        }),
        // Total clicks
        prisma.clickEvent.count({
          where: {
            emailEvent: {
              campaign: { projectId: id },
            },
          },
        }).catch((err) => {
          console.error("Error counting clicks:", err);
          return 0;
        }),
        // Recent campaigns
        prisma.campaign.findMany({
          where: { projectId: id },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            _count: {
              select: { emailEvents: true },
            },
          },
        }).catch((err) => {
          console.error("Error fetching campaigns:", err);
          return [];
        }),
      ]);

    return { totalSent, totalOpens, totalClicks, recentCampaigns };
  } catch (error) {
    console.error("Error fetching project stats:", error);
    return { totalSent: 0, totalOpens: 0, totalClicks: 0, recentCampaigns: [] };
  }
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  const stats = await getProjectStats(id);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-4">
            <Link
              href="/"
              className="text-zinc-400 hover:text-white transition pt-1"
            >
              ← Projects
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-zinc-400 text-sm mt-1">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Subscribers</div>
            <div className="text-3xl font-bold text-white">
              {project._count.subscribers}
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Campaigns</div>
            <div className="text-3xl font-bold text-white">
              {project._count.campaigns}
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Total Sent</div>
            <div className="text-3xl font-bold text-white">
              {stats.totalSent}
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Total Opens</div>
            <div className="text-3xl font-bold text-white">
              {stats.totalOpens}
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href={`/projects/${id}/subscribers`}
            className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 hover:border-zinc-700 transition group"
          >
            <h3 className="font-semibold text-white mb-2 group-hover:text-zinc-300">
              Manage Subscribers →
            </h3>
            <p className="text-zinc-400 text-sm">
              Add subscribers manually or import from CSV
            </p>
          </Link>
          <Link
            href={`/projects/${id}/templates`}
            className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 hover:border-zinc-700 transition group"
          >
            <h3 className="font-semibold text-white mb-2 group-hover:text-zinc-300">
              Email Templates →
            </h3>
            <p className="text-zinc-400 text-sm">
              Create reusable email templates for campaigns
            </p>
          </Link>
          <Link
            href={`/projects/${id}/campaigns`}
            className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 hover:border-zinc-700 transition group"
          >
            <h3 className="font-semibold text-white mb-2 group-hover:text-zinc-300">
              View Campaigns →
            </h3>
            <p className="text-zinc-400 text-sm">
              Create and manage email campaigns
            </p>
          </Link>
        </div>

        {/* Recent Campaigns */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Recent Campaigns
            </h2>
          </div>
          <div className="divide-y divide-zinc-800">
            {stats.recentCampaigns.length === 0 ? (
              <div className="p-6 text-center text-zinc-400">
                No campaigns yet.{" "}
                <Link
                  href={`/projects/${id}/campaigns/new`}
                  className="text-white hover:text-zinc-300 font-medium"
                >
                  Create your first campaign
                </Link>
              </div>
            ) : (
              stats.recentCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/projects/${id}/campaigns/${campaign.id}`}
                  className="p-6 flex items-center justify-between hover:bg-zinc-800/50 transition"
                >
                  <div>
                    <h3 className="font-medium text-white">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      {campaign.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">Status</div>
                      <div className="text-sm font-medium text-white capitalize">
                        {campaign.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">Sent</div>
                      <div className="text-sm font-medium text-white">
                        {campaign._count.emailEvents}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
