"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/auth-provider";
import { useAsync } from "@/hooks/use-async";
import { formatDate } from "@/lib/format";
import { adminService } from "@/services/admin.service";

export function UsersPanel() {
  const { user: me } = useAuth();
  const users = useAsync(() => adminService.users(), []);

  async function toggle(id: string, isActive: boolean) {
    await adminService.setUserActive(id, isActive);
    users.setData((users.data ?? []).map((u) => (u.id === id ? { ...u, is_active: isActive } : u)));
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">Accounts</h2>
      {users.status === "error" ? <p className="mt-2 text-red-700">{users.error}</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-muted">
            <tr><th className="py-2">Name</th><th>Role</th><th>Phone</th><th>Joined</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(users.data ?? []).map((user) => (
              <tr key={user.id}>
                <td className="py-2 font-semibold">{user.name}</td>
                <td>{user.role}</td>
                <td>{user.phone}</td>
                <td>{formatDate(user.created_at)}</td>
                <td className="text-right">
                  {user.id !== me?.id ? (
                    <Button type="button" variant={user.is_active ? "ghost" : "secondary"} onClick={() => void toggle(user.id, !user.is_active)}>
                      {user.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
