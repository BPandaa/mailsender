"use client";

import { useRouter } from "next/navigation";

type SendCampaignButtonProps = {
  campaignId: string;
  projectId: string;
  status: string;
};

export function SendCampaignButton({
  campaignId,
  projectId,
  status,
}: SendCampaignButtonProps) {
  const router = useRouter();

  const handleSendCampaign = async () => {
    if (!confirm("Send this campaign now?")) return;

    try {
      const fromEmail = prompt("Enter the from email address:");
      if (!fromEmail) return;

      const response = await fetch(
        `/api/projects/${projectId}/campaigns/${campaignId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromEmail }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(`Failed to send: ${data.error}`);
        return;
      }

      router.refresh();
    } catch (error) {
      alert("Failed to send campaign");
    }
  };

  if (status !== "draft") return null;

  return (
    <button
      onClick={handleSendCampaign}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
    >
      Send Campaign
    </button>
  );
}
