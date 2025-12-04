"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCampaign() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    fromEmail: "",
  });

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/campaigns`}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Create New Campaign
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Monthly Newsletter, Product Launch, etc."
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Hey {{name}}, check this out!"
              />
              <p className="mt-1 text-xs text-gray-500">
                Use personalization: {"{{"} name {"}}"},  {"{{"} first_name {"}}"},  {"{{"} email {"}}"}
              </p>
            </div>

            <div>
              <label
                htmlFor="fromEmail"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="noreply@yourdomain.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be a verified domain in Resend
              </p>
            </div>

            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="<html><body><h1>Hello!</h1><p>Your email content here...</p></body></html>"
              />
              <div className="mt-2 space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-900 mb-1">
                    Available personalization variables:
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <code className="bg-white px-2 py-1 rounded text-blue-700">
                      {"{{"} name {"}}"}
                    </code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">
                      {"{{"} first_name {"}}"}
                    </code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">
                      {"{{"} last_name {"}}"}
                    </code>
                    <code className="bg-white px-2 py-1 rounded text-blue-700">
                      {"{{"} email {"}}"}
                    </code>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    Example: &quot;Hi {"{{"} first_name {"}}"}, thanks for subscribing!&quot;
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Links will be automatically tracked. A tracking pixel will be
                  added for open tracking.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={handleSendNow}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Create & Send Now"}
              </button>
              <Link
                href={`/projects/${projectId}/campaigns`}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Preview */}
        {formData.content && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="bg-white rounded shadow-sm p-6">
                <div className="text-sm text-gray-600 mb-2">
                  Subject: {formData.subject || "(No subject)"}
                </div>
                <div
                  className="prose max-w-none"
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
