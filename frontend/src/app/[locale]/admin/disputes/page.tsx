"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Button, Card, EmptyState, ListRowsSkeleton, PageTitle, Select, Spinner, Textarea, statusColor } from "@/components/ui";

interface AdminDispute {
  id: string;
  parcel_reference: string | null;
  raised_by_user: { name: string; email: string } | null;
  description: string;
  status: "open" | "under_review" | "resolved" | "rejected";
  resolution_notes: string | null;
  created_at: string;
}

const STATUSES = ["open", "under_review", "resolved", "rejected"] as const;

export default function AdminDisputesPage() {
  const [items, setItems] = useState<AdminDispute[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; notes: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    api<{ items: AdminDispute[] }>("/admin/disputes")
      .then((d) => setItems(d.items))
      .catch((e) => setError(errorMessage(e)));
  }

  useEffect(load, []);

  async function update(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(id);
    setError("");
    try {
      await api(`/admin/disputes/${id}`, {
        method: "PATCH",
        body: { status: draft.status, resolution_notes: draft.notes },
      });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Disputes" />
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {items === null ? (
        <ListRowsSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState>No disputes.</EmptyState>
      ) : (
        <div className="space-y-6">
          {items.map((d) => {
            const draft = drafts[d.id] ?? { status: d.status, notes: d.resolution_notes ?? "" };
            return (
              <Card key={d.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono font-semibold text-primary">{d.parcel_reference ?? "?"}</p>
                    <p className="text-sm text-text/60">
                      {d.raised_by_user?.name} — {d.raised_by_user?.email}
                    </p>
                  </div>
                  <Badge color={statusColor(d.status)}>{d.status}</Badge>
                </div>
                <p className="mt-3 rounded-lg bg-accent/30 p-3 text-sm text-text/80">{d.description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
                  <Select
                    value={draft.status}
                    onChange={(e) => setDrafts({ ...drafts, [d.id]: { ...draft, status: e.target.value } })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <Textarea
                    placeholder="Resolution notes"
                    className="!min-h-10"
                    value={draft.notes}
                    onChange={(e) => setDrafts({ ...drafts, [d.id]: { ...draft, notes: e.target.value } })}
                  />
                  <Button disabled={busy === d.id} onClick={() => update(d.id)}>
                    {busy === d.id ? <Spinner /> : "Update"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
