"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Button, Card, EmptyState, ListRowsSkeleton, PageTitle, Spinner, Textarea } from "@/components/ui";

interface KycSubmission {
  id: string;
  id_document_url: string;
  id_document_back_url: string | null;
  selfie_url: string;
  ai_face_match_score: number | null;
  ai_document_check: { verdict: string; score: number; flagged_reasons: string[] } | null;
  created_at: string;
  user: { name: string; email: string } | null;
}

export default function AdminKycPage() {
  const t = useTranslations("adminPanel.actions");
  const [items, setItems] = useState<KycSubmission[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    api<{ items: KycSubmission[] }>("/admin/kyc/pending")
      .then((d) => setItems(d.items))
      .catch((e) => setError(errorMessage(e)));
  }

  useEffect(load, []);

  async function review(id: string, decision: "approve" | "reject") {
    setBusy(id);
    setError("");
    try {
      await api(`/admin/kyc/${id}/${decision}`, {
        method: "POST",
        body: { notes: notes[id] ?? "" },
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
      <PageTitle title="KYC review queue" />
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      {items === null ? (
        <ListRowsSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState>Queue is empty 🎉</EmptyState>
      ) : (
        <div className="space-y-6">
          {items.map((sub) => (
            <Card key={sub.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary">{sub.user?.name}</p>
                  <p className="text-sm text-text/60">{sub.user?.email}</p>
                </div>
                <p className="text-xs text-text/50">{new Date(sub.created_at).toLocaleString()}</p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <a href={sub.id_document_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-text/10 p-3 text-sm text-secondary hover:bg-accent/30">
                  ID document (front) ↗
                </a>
                <a href={sub.selfie_url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-text/10 p-3 text-sm text-secondary hover:bg-accent/30">
                  Selfie ↗
                </a>
                {sub.id_document_back_url && (
                  <a href={sub.id_document_back_url} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-text/10 p-3 text-sm text-secondary hover:bg-accent/30">
                    ID document (back) ↗
                  </a>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {sub.ai_face_match_score !== null && (
                  <Badge color={sub.ai_face_match_score > 0.75 ? "green" : "yellow"}>
                    Face match: {Math.round(sub.ai_face_match_score * 100)}%
                  </Badge>
                )}
                {sub.ai_document_check && (
                  <Badge color={sub.ai_document_check.verdict === "authentic" ? "green" : "red"}>
                    Doc AI: {sub.ai_document_check.verdict} ({Math.round(sub.ai_document_check.score * 100)}%)
                  </Badge>
                )}
              </div>

              <div className="mt-4">
                <Textarea
                  placeholder={t("notes")}
                  value={notes[sub.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [sub.id]: e.target.value })}
                  className="!min-h-16"
                />
              </div>
              <div className="mt-3 flex gap-3">
                <Button disabled={busy === sub.id} onClick={() => review(sub.id, "approve")}>
                  {t("approve")}
                </Button>
                <Button variant="danger" disabled={busy === sub.id} onClick={() => review(sub.id, "reject")}>
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
