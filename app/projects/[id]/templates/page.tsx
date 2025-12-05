import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

async function getProjectWithTemplates(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      templates: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) notFound();
  return project;
}

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectWithTemplates(id);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link
                href={`/projects/${id}`}
                className="text-zinc-400 hover:text-white transition pt-1"
              >
                ← Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Templates</h1>
                <p className="text-zinc-400 text-sm mt-1">{project.name}</p>
              </div>
            </div>
            <Link
              href={`/projects/${id}/templates/new`}
              className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium"
            >
              + New Template
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {project.templates.length === 0 ? (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
            <h3 className="text-lg font-medium text-white mb-2">
              No templates yet
            </h3>
            <p className="text-zinc-400 mb-6">
              Create reusable email templates to save time when creating
              campaigns
            </p>
            <Link
              href={`/projects/${id}/templates/new`}
              className="inline-block bg-white text-black px-6 py-2 rounded-lg hover:bg-zinc-200 transition font-medium"
            >
              Create Your First Template
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {project.templates.map((template) => (
              <Link
                key={template.id}
                href={`/projects/${id}/templates/${template.id}`}
                className="bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-zinc-800 flex items-center justify-center text-zinc-600">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>

                {/* Template Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white group-hover:text-zinc-300">
                      {template.name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        template.status === "published"
                          ? "bg-green-900 text-green-300"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {template.status}
                    </span>
                  </div>
                  {template.subject && (
                    <p className="text-sm text-zinc-400 mb-2">
                      {template.subject}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500">
                    Updated{" "}
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
