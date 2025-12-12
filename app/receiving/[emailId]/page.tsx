"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  received_at: string;
  headers?: Record<string, string>;
}

interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
}

export default function ReceivedEmailDetail() {
  const params = useParams();
  const emailId = params.emailId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState<ReceivedEmail | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [viewMode, setViewMode] = useState<"html" | "text">("html");

  useEffect(() => {
    fetchEmail();
    fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailId]);

  const fetchEmail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/receiving/${emailId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch email");
      }
      const data = await response.json();
      setEmail(data.email);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/receiving/${emailId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (err) {
      console.error("Failed to fetch attachments:", err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const downloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await fetch(
        `/api/receiving/${emailId}/attachments/${attachmentId}`
      );
      if (!response.ok) throw new Error("Failed to download attachment");

      const data = await response.json();
      // Handle attachment download logic here
      alert(`Attachment ${filename} ready for download`);
    } catch (err) {
      alert("Failed to download attachment");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading email...</div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            {error || "Email not found"}
          </h2>
          <Link
            href="/receiving"
            className="text-zinc-400 hover:text-white"
          >
            ← Back to inbox
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start gap-4">
            <Link
              href="/receiving"
              className="text-zinc-400 hover:text-white transition pt-1"
            >
              ← Inbox
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {email.subject || "(No subject)"}
              </h1>
              <div className="text-sm text-zinc-400 mt-2 space-y-1">
                <div>
                  <span className="text-zinc-500">From:</span> {email.from}
                </div>
                <div>
                  <span className="text-zinc-500">To:</span>{" "}
                  {email.to.join(", ")}
                </div>
                {email.cc && email.cc.length > 0 && (
                  <div>
                    <span className="text-zinc-500">CC:</span>{" "}
                    {email.cc.join(", ")}
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Date:</span>{" "}
                  {new Date(email.received_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                Attachments ({attachments.length})
              </h3>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-black rounded-lg border border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-zinc-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {attachment.filename}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {attachment.content_type} •{" "}
                          {(attachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        downloadAttachment(attachment.id, attachment.filename)
                      }
                      className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded text-sm hover:bg-zinc-700 transition"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Content */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800">
            {/* View Toggle */}
            {email.html && email.text && (
              <div className="p-4 border-b border-zinc-800 flex gap-2">
                <button
                  onClick={() => setViewMode("html")}
                  className={`px-3 py-1 rounded text-sm transition ${
                    viewMode === "html"
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1 rounded text-sm transition ${
                    viewMode === "text"
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Plain Text
                </button>
              </div>
            )}

            {/* Content Display */}
            <div className="p-6">
              {viewMode === "html" && email.html ? (
                <div className="bg-white p-6 rounded-lg border border-zinc-700">
                  <div dangerouslySetInnerHTML={{ __html: email.html }} />
                </div>
              ) : email.text ? (
                <pre className="text-zinc-300 whitespace-pre-wrap font-sans text-sm">
                  {email.text}
                </pre>
              ) : (
                <div className="text-zinc-500 text-center py-8">
                  No content available
                </div>
              )}
            </div>
          </div>

          {/* Email Headers (Collapsible) */}
          {email.headers && Object.keys(email.headers).length > 0 && (
            <details className="bg-zinc-900 rounded-lg border border-zinc-800">
              <summary className="p-4 cursor-pointer text-white font-medium hover:bg-zinc-800/50 transition">
                Email Headers
              </summary>
              <div className="p-4 border-t border-zinc-800">
                <pre className="text-xs text-zinc-400 overflow-x-auto">
                  {JSON.stringify(email.headers, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}
