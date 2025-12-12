"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  received_at: string;
  attachments?: any[];
  project?: {
    id: string;
    name: string;
  } | null;
}

export default function ProjectInbox() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    fetchEmails();
    fetchProjectName();
  }, [projectId]);

  const fetchProjectName = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProjectName(data.project.name);
      }
    } catch (err) {
      console.error("Failed to fetch project name:", err);
    }
  };

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/receiving");
      if (!response.ok) {
        throw new Error("Failed to fetch received emails");
      }
      const data = await response.json();

      // Filter emails for this specific project
      const projectEmails = (data.emails || []).filter(
        (email: ReceivedEmail) => email.project?.id === projectId
      );

      setEmails(projectEmails);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmails();
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <Link
                href={`/projects/${projectId}`}
                className="text-zinc-400 hover:text-white transition text-sm w-fit"
              >
                ← Back to Project
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Inbox
                </h1>
                <p className="text-zinc-400 text-sm mt-1">
                  {projectName ? `${projectName} - Received emails` : "Received emails for this project"}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 font-medium"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
            <div className="text-zinc-400">Loading received emails...</div>
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
            <h3 className="text-lg font-medium text-white mb-2">
              No received emails for this project
            </h3>
            <p className="text-zinc-400 mb-6">
              Emails sent to your configured Resend domains from subscribers in this project will appear here
            </p>
            <p className="text-sm text-zinc-500">
              Make sure you have inbound email configured in your Resend
              dashboard
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Stats */}
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Received Emails
                </h2>
                <span className="text-sm text-zinc-400">
                  {emails.length}{" "}
                  {emails.length === 1 ? "email" : "emails"}
                </span>
              </div>
            </div>

            {/* Email List */}
            <div className="divide-y divide-zinc-800">
              {emails.map((email) => (
                <Link
                  key={email.id}
                  href={`/receiving/${email.id}`}
                  className="p-6 flex items-start justify-between hover:bg-zinc-800/50 transition group"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white group-hover:text-zinc-300 truncate">
                        {email.subject || "(No subject)"}
                      </h3>
                      {email.attachments && email.attachments.length > 0 && (
                        <span className="inline-flex items-center text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                          <svg
                            className="w-3 h-3 mr-1"
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
                          {email.attachments.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="truncate">From: {email.from}</span>
                      <span>•</span>
                      <span className="truncate">
                        To: {email.to.join(", ")}
                      </span>
                    </div>
                    {email.text && (
                      <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                        {email.text}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm text-zinc-400">
                      {new Date(email.received_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(email.received_at).toLocaleTimeString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
