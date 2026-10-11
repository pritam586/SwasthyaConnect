"use client";

import { Card } from "@/components/ui/Card";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime } from "@/lib/format";
import { patientService } from "@/services/patient.service";

export function NotificationList() {
  const notifications = useAsync(() => patientService.notifications(), []);
  const items = notifications.data ?? [];

  async function markRead(id: string) {
    await patientService.markNotificationRead(id);
    notifications.setData(items.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  }

  return (
    <Card>
      <h2 className="font-bold">Notifications</h2>
      {notifications.status === "error" ? <p className="mt-2 text-sm text-red-700">{notifications.error}</p> : null}
      {notifications.status === "success" && items.length === 0 ? <p className="mt-2 text-muted">No notifications.</p> : null}
      <ul className="mt-2 divide-y divide-line">
        {items.slice(0, 8).map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className={item.is_read ? "font-medium text-muted" : "font-semibold"}>{item.title}</p>
              <p className="text-sm text-muted">{item.message}</p>
              <p className="text-xs text-muted">{formatDateTime(item.created_at)}</p>
            </div>
            {!item.is_read ? (
              <button type="button" className="min-h-11 shrink-0 px-2 text-sm font-semibold text-teal" onClick={() => void markRead(item.id)}>
                Mark read
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
