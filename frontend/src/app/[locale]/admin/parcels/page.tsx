"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Button, Input, PageTitle, statusColor } from "@/components/ui";

interface AdminParcel {
  id: string;
  parcel_reference: string;
  region: string;
  status: "active" | "disputed" | "flagged";
  owner: { name: string; email: string } | null;
  listing?: { status: string };
  created_at: string;
}

export default function AdminParcelsPage() {
  const t = useTranslations("adminPanel.actions");
  const [items, setItems] = useState<AdminParcel[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      api<{ items: AdminParcel[] }>(`/admin/parcels${q ? `?q=${encodeURIComponent(q)}` : ""}`)
        .then((d) => setItems(d.items))
        .catch((e) => setError(errorMessage(e)));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  async function setStatus(id: string, status: string) {
    setError("");
    try {
      await api(`/admin/parcels/${id}`, { method: "PATCH", body: { status } });
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: status as AdminParcel["status"] } : p)),
      );
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Parcels" />
      <div className="mb-4 w-full sm:w-80">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference…" />
      </div>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="overflow-x-auto rounded-xl border border-text/10 bg-background">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-text/10 text-xs uppercase text-text/60">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-b border-text/5">
                <td className="px-4 py-3 font-mono font-medium text-primary">{p.parcel_reference}</td>
                <td className="px-4 py-3 text-text/70">{p.region}</td>
                <td className="px-4 py-3 text-text/70">{p.owner?.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColor(p.status)}>{p.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge color={p.listing?.status === "active" ? "green" : "gray"}>
                    {p.listing?.status ?? "none"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {p.status === "flagged" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "active")}>
                      {t("unflag")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="danger" onClick={() => setStatus(p.id, "flagged")}>
                      {t("flag")}
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
