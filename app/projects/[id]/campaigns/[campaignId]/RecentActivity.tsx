"use client";

import { useState } from "react";

type ActivityEvent = {
  type: "sent" | "open" | "click";
  email: string;
  country?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  time: Date;
  linkUrl?: string;
  isBot?: boolean;
  isUnique?: boolean;
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  const [filter, setFilter] = useState<"all" | "sent" | "opened">("all");

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    if (filter === "sent") return event.type === "sent";
    if (filter === "opened") return event.type === "open";
    return true;
  });

  const tabs = [
    { id: "all", label: "All Activity", count: events.length },
    {
      id: "sent",
      label: "Sent",
      count: events.filter((e) => e.type === "sent").length,
    },
    {
      id: "opened",
      label: "Opened",
      count: events.filter((e) => e.type === "open").length,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                filter === tab.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs text-gray-500">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {filter === "all" ? "" : filter} activity yet
          </div>
        ) : (
          filteredEvents.map((event, idx) => (
            <div key={idx} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        event.type === "sent"
                          ? "bg-gray-100 text-gray-800"
                          : event.type === "open"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {event.type === "sent"
                        ? "Sent"
                        : event.type === "open"
                        ? "Opened"
                        : "Clicked"}
                    </span>
                    <span className="text-sm text-gray-900 font-medium">
                      {event.email}
                    </span>
                    {event.isBot && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Bot/Scanner
                      </span>
                    )}
                    {event.type === "open" && !event.isUnique && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Duplicate
                      </span>
                    )}
                  </div>
                  {event.type === "click" && event.linkUrl && (
                    <div className="text-xs text-gray-600 truncate mb-1">
                      {event.linkUrl}
                    </div>
                  )}
                  {event.type !== "sent" && (
                    <div className="text-xs text-gray-500">
                      {event.country && event.city
                        ? `${event.city}, ${event.country}`
                        : event.country || "Unknown location"}
                      {event.device && ` • ${event.device}`}
                      {event.browser && ` • ${event.browser}`}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                  {new Date(event.time).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
