"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string; templateId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    html: "",
    signature: "",
  });

  useEffect(() => {
    fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(
        `/api/projects/${params.id}/templates/${params.templateId}`
      );
      if (!response.ok) throw new Error("Failed to fetch template");
      const data = await response.json();
      setTemplate(data);
      setFormData({
        name: data.name,
        subject: data.subject || "",
        html: data.html,
        signature: data.signature || "",
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/projects/${params.id}/templates/${params.templateId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save template");
      }

      const updatedTemplate = await response.json();
      setTemplate(updatedTemplate);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError("");

    try {
      const response = await fetch(
        `/api/projects/${params.id}/templates/${params.templateId}/publish`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish template");
      }

      const updatedTemplate = await response.json();
      setTemplate(updatedTemplate);
      setPublishing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setPublishing(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(
        `/api/projects/${params.id}/templates/${params.templateId}/duplicate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) throw new Error("Failed to duplicate template");

      const duplicated = await response.json();
      router.push(`/projects/${params.id}/templates/${duplicated.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this template? This action cannot be undone."
      )
    )
      return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/projects/${params.id}/templates/${params.templateId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete template");
      }

      router.push(`/projects/${params.id}/templates`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading template...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Template not found
          </h2>
          <Link
            href={`/projects/${params.id}/templates`}
            className="text-zinc-400 hover:text-white"
          >
            ← Back to templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Link
                href={`/projects/${params.id}/templates`}
                className="text-zinc-400 hover:text-white transition pt-1"
              >
                ← Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {template.name}
                </h1>
                <span
                  className={`inline-block text-xs px-2 py-1 rounded mt-1 ${
                    template.status === "published"
                      ? "bg-green-900 text-green-300"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {template.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDuplicate}
                className="bg-zinc-800 text-white px-4 py-2 rounded-lg hover:bg-zinc-700 transition"
              >
                Duplicate
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-900 text-red-300 px-4 py-2 rounded-lg hover:bg-red-800 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <form onSubmit={handleSave} className="space-y-6">
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
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-zinc-300 mb-2"
                  >
                    Default Subject Line
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
                </div>

                <div>
                  <label
                    htmlFor="html"
                    className="block text-sm font-medium text-zinc-300 mb-2"
                  >
                    Email HTML Content
                  </label>

                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-zinc-700 mb-4">
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className={`px-4 py-2 text-sm font-medium transition ${
                        !showPreview
                          ? "text-white border-b-2 border-white"
                          : "text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      Edit HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className={`px-4 py-2 text-sm font-medium transition ${
                        showPreview
                          ? "text-white border-b-2 border-white"
                          : "text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      Preview
                    </button>
                  </div>

                  {/* Content */}
                  {!showPreview ? (
                    <textarea
                      id="html"
                      required
                      rows={16}
                      value={formData.html}
                      onChange={(e) =>
                        setFormData({ ...formData, html: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-white p-6 rounded-lg border border-zinc-700 min-h-[24rem]">
                      {formData.html ? (
                        <>
                          {formData.subject && (
                            <div className="text-sm text-zinc-600 mb-4 pb-4 border-b border-zinc-200">
                              <strong>Subject:</strong> {formData.subject}
                            </div>
                          )}
                          <div dangerouslySetInnerHTML={{ __html: formData.html }} />
                          {formData.signature && (
                            <div className="mt-6 pt-6 border-t border-zinc-200">
                              <div dangerouslySetInnerHTML={{ __html: formData.signature }} />
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-zinc-400 text-sm">No content yet</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="signature"
                    className="block text-sm font-medium text-zinc-300 mb-2"
                  >
                    Email Signature
                  </label>
                  <textarea
                    id="signature"
                    rows={4}
                    value={formData.signature}
                    onChange={(e) =>
                      setFormData({ ...formData, signature: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-black border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-zinc-600 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-white text-black px-6 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  {template.status === "draft" && (
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishing}
                      className="bg-green-900 text-green-300 px-6 py-2 rounded-lg hover:bg-green-800 transition disabled:opacity-50"
                    >
                      {publishing ? "Publishing..." : "Publish to Resend"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Info */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h3 className="font-medium text-white mb-4">Template Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-zinc-400">Status</div>
                  <div className="text-white capitalize">{template.status}</div>
                </div>
                <div>
                  <div className="text-zinc-400">Created</div>
                  <div className="text-white">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400">Last Updated</div>
                  <div className="text-white">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                {template.resendTemplateId && (
                  <div>
                    <div className="text-zinc-400">Resend Template ID</div>
                    <div className="text-white font-mono text-xs">
                      {template.resendTemplateId}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Variables Help */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h3 className="font-medium text-white mb-3">
                Available Variables
              </h3>
              <div className="space-y-2 text-sm text-zinc-400">
                <p>
                  <code className="bg-black px-2 py-1 rounded text-zinc-300">
                    {"{"}
                    {"{"} name {"}"}
                    {"}"}
                  </code>{" "}
                  - Name
                </p>
                <p>
                  <code className="bg-black px-2 py-1 rounded text-zinc-300">
                    {"{"}
                    {"{"} email {"}"}
                    {"}"}
                  </code>{" "}
                  - Email
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
