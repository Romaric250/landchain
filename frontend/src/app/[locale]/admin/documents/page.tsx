"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Button, Card, EmptyState, ListRowsSkeleton, PageTitle, Spinner, Textarea, statusColor } from "@/components/ui";

interface FlaggedDoc {
  id: string;
  file_url: string;
  doc_type: string;
  parcel_reference: string | null;
  uploader: { name: string; email: string } | null;
  ai_verification_result: { verdict: string; score: number; flagged_reasons: string[] } | null;
  created_at: string;
}

export default function AdminDocumentsPage() {
  const t = useTranslations("adminPanel.actions");
  const [items, setItems] = useState<FlaggedDoc[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    api<{ items: FlaggedDoc[] }>("/admin/documents/flagged")
      .then((d) => setItems(d.items))
      .catch((e) => setError(errorMessage(e)));
  }

  useEffect(load, []);

  async function review(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    setError("");
    try {
      await api(`/admin/documents/${id}/review`, {
        method: "POST",
        body: { decision, notes: notes[id] ?? "" },
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
      <PageTitle
        title="Document review queue"
        subtitle="AI-flagged documents requiring human review. No AI verdict auto-rejects a document."
      />
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {items === null ? (
        <ListRowsSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState>Queue is empty 🎉</EmptyState>
      ) : (
        <div className="space-y-6">
          {items.map((doc) => (
            <Card key={doc.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold capitalize text-primary">
                    {doc.doc_type.replace(/_/g, " ")}
                    {doc.parcel_reference && (
                      <span className="ml-2 font-mono text-sm text-text/60">{doc.parcel_reference}</span>
                    )}
                  </p>
                  <p className="text-sm text-text/60">
                    {doc.uploader?.name} — {doc.uploader?.email}
                  </p>
                </div>
                {doc.ai_verification_result && (
                  <Badge color={statusColor(doc.ai_verification_result.verdict)}>
                    {doc.ai_verification_result.verdict} (
                    {Math.round(doc.ai_verification_result.score * 100)}%)
                  </Badge>
                )}
              </div>

              {doc.ai_verification_result?.flagged_reasons?.length ? (
                <ul className="mt-3 list-inside list-disc rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  {doc.ai_verification_result.flagged_reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}

              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-secondary hover:underline"
              >
                Open document ↗
              </a>

              <div className="mt-4">
                <Textarea
                  placeholder={t("notes")}
                  value={notes[doc.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [doc.id]: e.target.value })}
                  className="!min-h-16"
                />
              </div>
              <div className="mt-3 flex gap-3">
                <Button disabled={busy === doc.id} onClick={() => review(doc.id, "approved")}>
                  {t("approve")}
                </Button>
                <Button variant="danger" disabled={busy === doc.id} onClick={() => review(doc.id, "rejected")}>
                  {t("reject")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
