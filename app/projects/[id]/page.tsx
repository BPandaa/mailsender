import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          subscribers: true,
          campaigns: true,
        },
      },
    },
  });

  if (!project) notFound();
  return project;
}

async function getProjectStats(id: string) {
  const [totalSent, totalOpens, totalClicks, recentCampaigns] =
    await Promise.all([
      // Total emails sent
      prisma.emailEvent.count({
        where: {
          campaign: { projectId: id },
          status: "sent",
        },
      }),
      // Total opens
      prisma.openEvent.count({
        where: {
          emailEvent: {
            campaign: { projectId: id },
          },
        },
      }),
      // Total clicks
      prisma.clickEvent.count({
        where: {
          emailEvent: {
            campaign: { projectId: id },
          },
        },
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
      }),
    ]);

  return { totalSent, totalOpens, totalClicks, recentCampaigns };
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  const stats = await getProjectStats(id);

  const openRate =
    stats.totalSent > 0
      ? ((stats.totalOpens / stats.totalSent) * 100).toFixed(1)
      : "0";
  const clickRate =
    stats.totalSent > 0
      ? ((stats.totalClicks / stats.totalSent) * 100).toFixed(1)
      : "0";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 transition"
              >
                ← Projects
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Subscribers</div>
            <div className="text-3xl font-bold text-gray-900">
              {project._count.subscribers}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Campaigns</div>
            <div className="text-3xl font-bold text-gray-900">
              {project._count.campaigns}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Open Rate</div>
            <div className="text-3xl font-bold text-gray-900">{openRate}%</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-gray-600 text-sm mb-1">Click Rate</div>
            <div className="text-3xl font-bold text-gray-900">
              {clickRate}%
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href={`/projects/${id}/subscribers`}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition group"
          >
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
              Manage Subscribers →
            </h3>
            <p className="text-gray-600 text-sm">
              Add subscribers manually or import from CSV
            </p>
          </Link>
          <Link
            href={`/projects/${id}/campaigns`}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition group"
          >
            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
              View Campaigns →
            </h3>
            <p className="text-gray-600 text-sm">
              Create and manage email campaigns
            </p>
          </Link>
        </div>

        {/* Recent Campaigns */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Campaigns
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentCampaigns.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                No campaigns yet.{" "}
                <Link
                  href={`/projects/${id}/campaigns/new`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create your first campaign
                </Link>
              </div>
            ) : (
              stats.recentCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/projects/${id}/campaigns/${campaign.id}`}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {campaign.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Status</div>
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {campaign.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Sent</div>
                      <div className="text-sm font-medium text-gray-900">
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
