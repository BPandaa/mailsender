"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  from: string;
  fromName: string | null;
  subject: string;
  receivedAt: string;
  campaign: string;
  project: string;
}

export default function NotificationBar() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load dismissed notifications from localStorage
    const stored = localStorage.getItem("dismissedNotifications");
    if (stored) {
      try {
        setDismissed(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error("Failed to parse dismissed notifications:", e);
      }
    }

    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = (id: string) => {
    const newDismissed = new Set([...dismissed, id]);
    setDismissed(newDismissed);
    // Save to localStorage
    localStorage.setItem(
      "dismissedNotifications",
      JSON.stringify(Array.from(newDismissed))
    );
  };

  const visibleNotifications = notifications.filter(
    (n) => !dismissed.has(n.id)
  );

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-blue-600 text-white px-4 py-3 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  New email from{" "}
                  <span className="font-semibold">
                    {notification.fromName || notification.from}
                  </span>
                </p>
                <p className="text-xs text-blue-100 truncate">
                  {notification.subject} • {notification.project} •{" "}
                  {notification.campaign}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Link
                href={`/receiving/${notification.id}`}
                onClick={() => dismissNotification(notification.id)}
                className="text-xs bg-white text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition font-medium"
              >
                View
              </Link>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-white hover:text-blue-100 transition"
                aria-label="Dismiss"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
