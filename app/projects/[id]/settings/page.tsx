import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { SignatureEditor } from "./SignatureEditor";

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) notFound();
  return project;
}

export default async function ProjectSettings({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${id}`}
              className="text-zinc-400 hover:text-white transition"
            >
              ← Back to Project
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Project Settings</h1>
              <p className="text-zinc-400 text-sm mt-1">{project.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">Email Signature</h2>
            <p className="text-sm text-zinc-400 mt-1">
              This signature will be automatically added to all campaigns sent from this project.
              You can use HTML and include images using external URLs.
            </p>
          </div>
          <div className="p-6">
            <SignatureEditor projectId={id} initialSignature={project.signature || ""} />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="font-semibold text-white mb-3">Tips for Email Signatures</h3>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>• Use external image URLs (e.g., from Imgur, Cloudinary, or your website)</p>
            <p>• Keep images small for faster loading (recommended max width: 600px)</p>
            <p>• Test your signature by sending a test campaign</p>
            <p>• You can use HTML styling for formatting</p>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-sm text-zinc-400 mb-2">Example HTML signature:</p>
            <pre className="bg-zinc-950 p-4 rounded text-xs text-zinc-300 overflow-x-auto">
{`<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
  <p style="margin: 0; color: #333;">Best regards,<br>
  <strong>Your Name</strong></p>
  <p style="margin: 5px 0; color: #666; font-size: 14px;">
    Your Title | Your Company
  </p>
  <img src="https://your-domain.com/logo.png"
       alt="Company Logo"
       style="max-width: 150px; margin-top: 10px;">
</div>`}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
