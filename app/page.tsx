import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          subscribers: true,
          campaigns: true,
        },
      },
    },
  });
  return projects;
}

async function getProjectStats(projectId: string) {
  const [totalSent, totalOpens] = await Promise.all([
    prisma.emailEvent.count({
      where: {
        campaign: { projectId },
        status: "sent",
      },
    }),
    prisma.openEvent.count({
      where: {
        emailEvent: {
          campaign: { projectId },
        },
      },
    }),
  ]);

  return { totalSent, totalOpens };
}

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const projects = await getProjects(session.user.id);

  // Get stats for each project
  const projectsWithStats = await Promise.all(
    projects.map(async (project) => {
      const stats = await getProjectStats(project.id);
      return { ...project, stats };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Mail Tracker</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <Link
            href="/projects/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            New Project
          </Link>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition">
              <h3 className="font-semibold text-gray-900 mb-2">
                Getting Started
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Create your first project to start sending email campaigns
              </p>
              <Link
                href="/projects/new"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Create Project →
              </Link>
            </div>
          ) : (
            projectsWithStats.map((project) => {
              const openRate =
                project.stats.totalSent > 0
                  ? (
                      (project.stats.totalOpens / project.stats.totalSent) *
                      100
                    ).toFixed(1)
                  : "0";

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition group"
                >
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {project.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-xs text-gray-600">Subscribers</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {project._count.subscribers}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Campaigns</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {project._count.campaigns}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Emails Sent</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {project.stats.totalSent}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Open Rate</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {openRate}%
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
