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

  const openRate =
    campaign.stats.totalSent > 0
      ? ((campaign.stats.opens / campaign.stats.totalSent) * 100).toFixed(1)
      : "0";
  const clickRate =
    campaign.stats.totalSent > 0
      ? ((campaign.stats.clicks / campaign.stats.totalSent) * 100).toFixed(1)
      : "0";

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
      className="block bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {campaign.name}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                campaign.status === "sent"
                  ? "bg-green-100 text-green-800"
                  : campaign.status === "sending"
                  ? "bg-blue-100 text-blue-800"
                  : campaign.status === "failed"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {campaign.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-2">
            Subject: {campaign.subject}
          </p>
          <p className="text-gray-500 text-xs">
            Created {new Date(campaign.createdAt).toLocaleDateString()}
            {campaign.sentAt &&
              ` • Sent ${new Date(campaign.sentAt).toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="ml-4 text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-600 mb-1">Sent</div>
          <div className="text-lg font-semibold text-gray-900">
            {campaign.stats.totalSent}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Opens</div>
          <div className="text-lg font-semibold text-gray-900">
            {campaign.stats.opens}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Open Rate</div>
          <div className="text-lg font-semibold text-gray-900">{openRate}%</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1">Click Rate</div>
          <div className="text-lg font-semibold text-gray-900">
            {clickRate}%
          </div>
        </div>
      </div>
    </Link>
  );
}
