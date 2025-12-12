"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  subscribed: boolean;
  createdAt: string;
};

export default function SubscribersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [formData, setFormData] = useState({ email: "", name: "" });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/subscribers`);
      if (!response.ok) throw new Error("Failed to fetch subscribers");
      const data = await response.json();
      setSubscribers(data.subscribers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add subscriber");
      }

      await fetchSubscribers();
      setFormData({ email: "", name: "" });
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setImporting(true);
    setError("");

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].toLowerCase().split(",");

      const emailIndex = headers.findIndex((h) => h.trim() === "email");
      const nameIndex = headers.findIndex((h) => h.trim() === "name");

      if (emailIndex === -1) {
        throw new Error("CSV must have an 'email' column");
      }

      const subscribersToImport = lines.slice(1).map((line) => {
        const values = line.split(",");
        return {
          email: values[emailIndex]?.trim() || "",
          name: nameIndex !== -1 ? values[nameIndex]?.trim() || "" : "",
        };
      });

      // Import subscribers one by one
      for (const sub of subscribersToImport) {
        if (sub.email) {
          await fetch(`/api/projects/${projectId}/subscribers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub),
          });
        }
      }

      await fetchSubscribers();
      setCsvFile(null);
      setShowImportForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleToggleStatus = async (subscriberId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/subscribers/${subscriberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscribed: !currentStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update subscriber");

      await fetchSubscribers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDelete = async (subscriberId: string) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/subscribers/${subscriberId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete subscriber");

      await fetchSubscribers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400">Loading subscribers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${projectId}`}
                className="text-zinc-400 hover:text-white transition"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-white">Subscribers</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportForm(true)}
                className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-700 transition"
              >
                Import CSV
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium"
              >
                Add Subscriber
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Total Subscribers</div>
            <div className="text-3xl font-bold text-white">
              {subscribers.length}
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Active</div>
            <div className="text-3xl font-bold text-white">
              {subscribers.filter((s) => s.subscribed).length}
            </div>
          </div>
          <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
            <div className="text-zinc-400 text-sm mb-1">Unsubscribed</div>
            <div className="text-3xl font-bold text-white">
              {subscribers.filter((s) => !s.subscribed).length}
            </div>
          </div>
        </div>

        {/* Add Subscriber Form */}
        {showAddForm && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-6">
            <h3 className="font-semibold text-white mb-4">
              Add New Subscriber
            </h3>
            <form onSubmit={handleAddSubscriber} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-white focus:border-transparent"
                  placeholder="Email address"
                />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="px-4 py-2 bg-black border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-white focus:border-transparent"
                  placeholder="Name (optional)"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition font-medium"
                >
                  Add Subscriber
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Import CSV Form */}
        {showImportForm && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6 mb-6">
            <h3 className="font-semibold text-white mb-4">
              Import from CSV
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Upload a CSV file with columns: email (required), name (optional)
            </p>
            <form onSubmit={handleImportCsv} className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-black hover:file:bg-zinc-200 file:font-medium"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!csvFile || importing}
                  className="bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {importing ? "Importing..." : "Import"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportForm(false)}
                  className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subscribers List */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                      No subscribers yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="hover:bg-zinc-800/50">
                      <td className="px-6 py-4 text-sm text-white">
                        {subscriber.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {subscriber.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleToggleStatus(subscriber.id, subscriber.subscribed)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition cursor-pointer hover:opacity-80 ${
                            subscriber.subscribed
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {subscriber.subscribed ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {new Date(subscriber.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleToggleStatus(subscriber.id, subscriber.subscribed)}
                            className={`font-medium transition ${
                              subscriber.subscribed
                                ? "text-zinc-400 hover:text-zinc-300"
                                : "text-green-400 hover:text-green-300"
                            }`}
                          >
                            {subscriber.subscribed ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDelete(subscriber.id)}
                            className="text-red-400 hover:text-red-300 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
