"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignatureEditor({
  projectId,
  initialSignature,
}: {
  projectId: string;
  initialSignature: string;
}) {
  const router = useRouter();
  const [signature, setSignature] = useState(initialSignature);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signature }),
      });

      if (!response.ok) {
        throw new Error("Failed to save signature");
      }

      setSaveMessage("Signature saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
      router.refresh();
    } catch (error) {
      setSaveMessage("Error saving signature");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
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
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Enter your HTML signature here..."
          className="w-full h-64 bg-zinc-950 text-white border border-zinc-800 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
        />
      ) : (
        <div className="bg-white p-6 rounded-lg border border-zinc-800 min-h-[16rem]">
          {signature ? (
            <div dangerouslySetInnerHTML={{ __html: signature }} />
          ) : (
            <p className="text-zinc-400 text-sm">No signature yet</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSaving ? "Saving..." : "Save Signature"}
          </button>
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.includes("Error")
                  ? "text-red-400"
                  : "text-green-400"
              }`}
            >
              {saveMessage}
            </span>
          )}
        </div>
        <button
          onClick={() => setSignature("")}
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
