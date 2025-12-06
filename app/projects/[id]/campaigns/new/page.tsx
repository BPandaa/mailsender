"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  subject: string | null;
  html: string;
  signature: string | null;
}

export default function NewCampaign() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    fromEmail: "",
    templateId: "",
  });

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        templateId: template.id,
        subject: template.subject || formData.subject,
        content:
          template.html +
          (template.signature ? `\n\n${template.signature}` : ""),
      });
    } else {
      setFormData({ ...formData, templateId: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create campaign
      const response = await fetch(`/api/projects/${projectId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create campaign");
      }

      const data = await response.json();
      router.push(`/projects/${projectId}/campaigns/${data.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleSendNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !confirm(
        "Are you sure you want to create and send this campaign immediately?"
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create campaign
      const createResponse = await fetch(
        `/api/projects/${projectId}/campaigns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || "Failed to create campaign");
      }

      const createData = await createResponse.json();

      // Send campaign
      const sendResponse = await fetch(
        `/api/projects/${projectId}/campaigns/${createData.campaign.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromEmail: formData.fromEmail }),
        }
      );

      if (!sendResponse.ok) {
        const data = await sendResponse.json();
        throw new Error(data.error || "Failed to send campaign");
      }

      router.push(`/projects/${projectId}/campaigns/${createData.campaign.id}`);
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
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/campaigns`}
              className="text-zinc-400 hover:text-white transition"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-white">
              Create New Campaign
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <form className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Campaign Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-white focus:border-transparent"
                placeholder="Monthly Newsletter, Product Launch, etc."
              />
            </div>

            {/* Template Selector */}
            <div>
              <label
                htmlFor="template"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Use Template (Optional)
              </label>
              <select
                id="template"
                value={formData.templateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-white focus:border-transparent"
                disabled={loadingTemplates}
              >
                <option value="">Start from scratch</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {templates.length === 0 && !loadingTemplates && (
                <p className="mt-1 text-xs text-zinc-400">
                  No templates available.{" "}
                  <Link
                    href={`/projects/${projectId}/templates/new`}
                    className="text-white hover:text-zinc-300"
                  >
                    Create one first
                  </Link>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Email Subject
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-white focus:border-transparent"
                placeholder="Hey {{name}}, check this out!"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Use personalization: {"{{"} name {"}}"},  {"{{"} first_name {"}}"},  {"{{"} email {"}}"}
              </p>
            </div>

            <div>
              <label
                htmlFor="fromEmail"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                From Email Address
              </label>
              <input
                type="email"
                id="fromEmail"
                required
                value={formData.fromEmail}
                onChange={(e) =>
                  setFormData({ ...formData, fromEmail: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-white focus:border-transparent"
                placeholder="noreply@yourdomain.com"
              />
              <p className="mt-1 text-xs text-zinc-400">
                Must be a verified domain in Resend
              </p>
            </div>

            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Email Content (HTML)
              </label>
              <textarea
                id="content"
                rows={12}
                required
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="w-full px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-white focus:border-transparent font-mono text-sm"
                placeholder="<html><body><h1>Hello!</h1><p>Your email content here...</p></body></html>"
              />
              <div className="mt-2 space-y-2">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-white mb-1">
                    Available personalization variables:
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <code className="bg-black px-2 py-1 rounded text-zinc-300 border border-zinc-700">
                      {"{{"} name {"}}"}
                    </code>
                    <code className="bg-black px-2 py-1 rounded text-zinc-300 border border-zinc-700">
                      {"{{"} first_name {"}}"}
                    </code>
                    <code className="bg-black px-2 py-1 rounded text-zinc-300 border border-zinc-700">
                      {"{{"} last_name {"}}"}
                    </code>
                    <code className="bg-black px-2 py-1 rounded text-zinc-300 border border-zinc-700">
                      {"{{"} email {"}}"}
                    </code>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Example: &quot;Hi {"{{"} first_name {"}}"}, thanks for subscribing!&quot;
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  Resend will automatically track opens and clicks via webhooks.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-zinc-800 text-zinc-300 px-6 py-2 rounded-lg hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Creating..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={handleSendNow}
                disabled={loading}
                className="bg-white text-black px-6 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Sending..." : "Create & Send Now"}
              </button>
              <Link
                href={`/projects/${projectId}/campaigns`}
                className="bg-zinc-800 text-zinc-300 px-6 py-2 rounded-lg hover:bg-zinc-700 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Preview */}
        {formData.content && (
          <div className="mt-8 bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h3 className="font-semibold text-white mb-4">Preview</h3>
            <div className="border border-zinc-800 rounded-lg p-4 bg-black">
              <div className="bg-zinc-900 rounded shadow-sm p-6">
                <div className="text-sm text-zinc-400 mb-2">
                  Subject: {formData.subject || "(No subject)"}
                </div>
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formData.content }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
