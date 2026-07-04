"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Button, Card, PageTitle, Select, statusColor } from "@/components/ui";

interface AdminPayment {
  id: string;
  type: "subscription" | "listing_fee";
  amount_xaf: number;
  fapshi_trans_id: string;
  status: string;
  user: { name: string; email: string } | null;
  created_at: string;
}

interface PaymentsResponse {
  items: AdminPayment[];
  total: number;
  revenue: Record<string, { total_xaf: number; count: number }>;
}

export default function AdminPaymentsPage() {
  const t = useTranslations("adminPanel.actions");
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    api<PaymentsResponse>(`/admin/payments?${params}`)
      .then(setData)
      .catch((e) => setError(errorMessage(e)));
  }, [statusFilter, typeFilter]);

  useEffect(load, [load]);

  async function recheck(transId: string) {
    setBusy(transId);
    try {
      await api(`/payments/${transId}/status`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Payments" />
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {Object.entries(data.revenue).map(([type, r]) => (
            <Card key={type}>
              <p className="text-xs font-semibold uppercase text-text/60">
                {type === "subscription" ? "Subscriptions" : "Listing fees"}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-primary">
                {r.total_xaf.toLocaleString()} XAF
                <span className="ml-2 text-sm font-normal text-text/60">({r.count})</span>
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-40">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {["PENDING", "SUCCESSFUL", "FAILED", "EXPIRED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="subscription">Subscription</option>
            <option value="listing_fee">Listing fee</option>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-text/10 bg-background">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-text/10 text-xs uppercase text-text/60">
            <tr>
              <th className="px-4 py-3">Trans ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p) => (
              <tr key={p.id} className="border-b border-text/5">
                <td className="px-4 py-3 font-mono text-xs text-primary">{p.fapshi_trans_id}</td>
                <td className="px-4 py-3 text-text/70">{p.user?.email ?? "—"}</td>
                <td className="px-4 py-3 text-text/70">{p.type}</td>
                <td className="px-4 py-3 font-medium text-primary">
                  {p.amount_xaf.toLocaleString()} XAF
                </td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(p.status)}>{p.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-text/60">
                  {new Date(p.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {p.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === p.fapshi_trans_id}
                      onClick={() => recheck(p.fapshi_trans_id)}
                    >
                      {t("recheck")}
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
