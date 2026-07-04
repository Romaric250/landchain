"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import type { User } from "@/lib/types";
import { Alert, Badge, Button, Input, PageTitle, Select, statusColor } from "@/components/ui";

export default function AdminUsersPage() {
  const t = useTranslations("adminPanel.actions");
  const [users, setUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      api<{ items: User[] }>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`)
        .then((d) => setUsers(d.items))
        .catch((e) => setError(errorMessage(e)));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  async function update(userId: string, body: { role?: string; status?: string }) {
    setError("");
    try {
      const updated = await api<User>(`/admin/users/${userId}`, { method: "PATCH", body });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Users" />
      <div className="mb-4 w-full sm:w-80">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" />
      </div>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="overflow-x-auto rounded-xl border border-text/10 bg-background">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-text/10 text-xs uppercase text-text/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">{t("role")}</th>
              <th className="px-4 py-3">KYC</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-text/5">
                <td className="px-4 py-3 font-medium text-primary">{u.name}</td>
                <td className="px-4 py-3 text-text/70">{u.email}</td>
                <td className="px-4 py-3">
                  <Select
                    value={u.role}
                    onChange={(e) => update(u.id, { role: e.target.value })}
                    className="!w-32 !py-1 text-xs"
                  >
                    {["citizen", "notary", "admin", "super_admin"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(u.kyc_status)}>{u.kyc_status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(u.status)}>{u.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {u.status === "suspended" ? (
                    <Button size="sm" variant="outline" onClick={() => update(u.id, { status: "active" })}>
                      {t("reactivate")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => update(u.id, { status: "suspended" })}>
                      {t("suspend")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
