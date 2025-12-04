"use client";

import { useRouter } from "next/navigation";

type DeleteCampaignButtonProps = {
  campaignId: string;
  projectId: string;
  campaignName: string;
};

export function DeleteCampaignButton({
  campaignId,
  projectId,
  campaignName,
}: DeleteCampaignButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${campaignName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/campaigns/${campaignId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to delete: ${data.error}`);
        return;
      }

      // Redirect to campaigns list
      router.push(`/projects/${projectId}/campaigns`);
      router.refresh();
    } catch (error) {
      alert("Failed to delete campaign");
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
    >
      Delete Campaign
    </button>
  );
}
