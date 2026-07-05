"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, EmptyState, ListRowsSkeleton, PageTitle } from "@/components/ui";

interface AdminLog {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  notes: string;
  created_at: string;
}

export default function AdminLogsPage() {
  const [items, setItems] = useState<AdminLog[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: AdminLog[] }>("/admin/logs")
      .then((d) => setItems(d.items))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Audit logs" subtitle="Every mutating admin action is recorded here." />
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {items === null ? (
        <ListRowsSkeleton count={6} />
      ) : items.length === 0 ? (
        <EmptyState>No actions logged yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-text/10 bg-background">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="border-b border-text/10 text-xs uppercase text-text/60">
              <tr>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <tr key={log.id} className="border-b border-text/5">
                  <td className="px-4 py-3 text-text/70">{log.admin_email}</td>
                  <td className="px-4 py-3 font-medium text-primary">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text/60">
                    {log.target_type}:{log.target_id.slice(-8)}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-text/60">{log.notes}</td>
                  <td className="px-4 py-3 text-xs text-text/60">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
