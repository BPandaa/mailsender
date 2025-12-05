"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    html: "",
    signature: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${params.id}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create template");
      }

      const template = await response.json();
      router.push(`/projects/${params.id}/templates/${template.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-4">
            <Link
              href={`/projects/${params.id}/templates`}
              className="text-zinc-400 hover:text-white transition pt-1"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-white">
              Create New Template
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Template Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent"
                placeholder="e.g., Newsletter Template, Welcome Email"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Default Subject Line (Optional)
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent"
                placeholder="Use {{name}} for personalization"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Available variables: {"{"}
                {"{"} name {"}"}
                {"}"}, {"{"}
                {"{"} email {"}"}
                {"}"}
              </p>
            </div>

            <div>
              <label
                htmlFor="html"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Email HTML Content
              </label>
              <textarea
                id="html"
                required
                rows={12}
                value={formData.html}
                onChange={(e) =>
                  setFormData({ ...formData, html: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent font-mono text-sm"
                placeholder="<html>
<body>
  <h1>Hello {{name}}!</h1>
  <p>Your email content here...</p>
</body>
</html>"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Write HTML or paste from your email builder
              </p>
            </div>

            <div>
              <label
                htmlFor="signature"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Email Signature (Optional)
              </label>
              <textarea
                id="signature"
                rows={4}
                value={formData.signature}
                onChange={(e) =>
                  setFormData({ ...formData, signature: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent"
                placeholder="Best regards,&#10;Your Name&#10;Company"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-white text-black px-6 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Creating..." : "Create Template"}
              </button>
              <Link
                href={`/projects/${params.id}/templates`}
                className="bg-zinc-800 text-white px-6 py-2 rounded-lg hover:bg-zinc-700 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="font-medium text-white mb-3">Template Variables</h3>
          <div className="space-y-2 text-sm text-zinc-400">
            <p>
              <code className="bg-black px-2 py-1 rounded text-zinc-300">
                {"{"}
                {"{"} name {"}"}
                {"}"}
              </code>{" "}
              - Subscriber's name
            </p>
            <p>
              <code className="bg-black px-2 py-1 rounded text-zinc-300">
                {"{"}
                {"{"} email {"}"}
                {"}"}
              </code>{" "}
              - Subscriber's email address
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
