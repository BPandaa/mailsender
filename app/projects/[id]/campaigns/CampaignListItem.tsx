"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  stats: {
    totalSent: number;
    opens: number;
    clicks: number;
  };
};

type CampaignListItemProps = {
  campaign: Campaign;
  projectId: string;
};

export function CampaignListItem({
  campaign,
  projectId,
}: CampaignListItemProps) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !confirm(
        `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/campaigns/${campaign.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to delete: ${data.error}`);
        return;
      }

      router.refresh();
    } catch (error) {
      alert("Failed to delete campaign");
    }
  };

  return (
    <Link
      href={`/projects/${projectId}/campaigns/${campaign.id}`}
      className="block bg-zinc-900 rounded-lg border border-zinc-800 p-6 hover:border-zinc-700 transition"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">
              {campaign.name}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                campaign.status === "sent"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : campaign.status === "sending"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : campaign.status === "failed"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              {campaign.status}
            </span>
          </div>
          <p className="text-zinc-400 text-sm mb-2">
            Subject: {campaign.subject}
          </p>
          <p className="text-zinc-500 text-xs">
            Created {new Date(campaign.createdAt).toLocaleDateString()}
            {campaign.sentAt &&
              ` • Sent ${new Date(campaign.sentAt).toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="ml-4 text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded hover:bg-red-500/10 transition"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
        <div>
          <div className="text-xs text-zinc-400 mb-1">Sent</div>
          <div className="text-lg font-semibold text-white">
            {campaign.stats.totalSent}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400 mb-1">Opens</div>
          <div className="text-lg font-semibold text-white">
            {campaign.stats.opens}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-400 mb-1">Clicks</div>
          <div className="text-lg font-semibold text-white">
            {campaign.stats.clicks}
          </div>
        </div>
      </div>
    </Link>
  );
}
