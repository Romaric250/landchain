"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import type { GeoJSONGeometry } from "@/lib/types";
import { Alert, Button, Input, PageTitle, Select, Spinner } from "@/components/ui";
import { AiVerdictCard } from "@/components/ui/AiVerdictCard";
import { FileUpload } from "@/components/ui/FileUpload";

const ParcelDrawMap = dynamic(() => import("@/components/map/ParcelDrawMap"), { ssr: false });

const DOC_TYPES = ["land_title", "survey_plan", "sale_agreement", "tax_receipt", "other"] as const;

interface DocAiResult {
  verdict: string;
  score: number;
  flagged_reasons: string[];
  user_message?: string;
}

interface DocEntry {
  file_url: string;
  doc_type: (typeof DOC_TYPES)[number];
  doc_id?: string;
  ai?: DocAiResult | null;
  aiLoading?: boolean;
}

export default function NewParcelPage() {
  const t = useTranslations("parcels");
  const router = useRouter();
  const [form, setForm] = useState({ parcel_reference: "", region: "", area_sqm: "" });
  const [boundary, setBoundary] = useState<GeoJSONGeometry | null>(null);
  const [docs, setDocs] = useState<DocEntry[]>([{ file_url: "", doc_type: "land_title" }]);
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string>("");
  const [duplicate, setDuplicate] = useState<{ parcel_reference?: string; region?: string } | null>(null);

  const pollDocAi = useCallback(async (docId: string, index: number) => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const doc = await api<{ ai_verification_result: DocAiResult | null }>(`/documents/${docId}`);
        if (doc.ai_verification_result) {
          setDocs((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], ai: doc.ai_verification_result, aiLoading: false };
            }
            return next;
          });
          return;
        }
      } catch {
        break;
      }
    }
    setDocs((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], aiLoading: false };
      return next;
    });
  }, []);

  async function uploadDoc(index: number, fileUrl: string, docType: DocEntry["doc_type"]) {
    if (!fileUrl.trim()) return;
    setDocs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], file_url: fileUrl, aiLoading: true, ai: null };
      return next;
    });
    try {
      const res = await api<{ id: string }>("/documents/upload", {
        method: "POST",
        body: { parcel_id: "pending", file_url: fileUrl, doc_type: docType },
      });
      setDocs((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], doc_id: res.id, aiLoading: true };
        return next;
      });
      pollDocAi(res.id, index);
    } catch {
      setDocs((prev) => {
        const next = [...prev];
        if (next[index]) next[index] = { ...next[index], aiLoading: false };
        return next;
      });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!boundary || boundary.type !== "Polygon") {
      setError(t("mapHint"));
      return;
    }
    setState("loading");
    setError("");
    setDuplicate(null);
    try {
      const documentIds: string[] = [];
      for (const doc of docs.filter((d) => d.file_url.trim())) {
        if (doc.doc_id) {
          documentIds.push(doc.doc_id);
        } else {
          const res = await api<{ id: string }>("/documents/upload", {
            method: "POST",
            body: { parcel_id: "pending", file_url: doc.file_url, doc_type: doc.doc_type },
          });
          documentIds.push(res.id);
        }
      }

      const parcel = await api<{ id: string }>("/parcels", {
        method: "POST",
        body: {
          parcel_reference: form.parcel_reference,
          region: form.region,
          area_sqm: Number(form.area_sqm),
          geojson: boundary,
          document_ids: documentIds,
        },
      });
      router.push(`/dashboard/parcels/${parcel.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && typeof err.detail === "object" && err.detail) {
        const detail = err.detail as { message?: string; existing_parcel?: { parcel_reference?: string; region?: string } };
        setError(detail.message ?? "Duplicate parcel");
        setDuplicate(detail.existing_parcel ?? null);
      } else {
        setError(errorMessage(err));
      }
      setState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("newTitle")} subtitle={t("newSubtitle")} />

      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            name="parcel_reference"
            label={t("reference")}
            hint={t("referenceHint")}
            required
            minLength={3}
            value={form.parcel_reference}
            onChange={(e) => setForm({ ...form, parcel_reference: e.target.value })}
          />
          <Input
            name="region"
            label={t("region")}
            required
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
          />
          <Input
            name="area_sqm"
            type="number"
            min={1}
            label={t("area")}
            required
            value={form.area_sqm}
            onChange={(e) => setForm({ ...form, area_sqm: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-primary">{t("location")}</p>
          <ParcelDrawMap value={boundary} onChange={setBoundary} className="h-96 w-full rounded-xl" />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-primary">{t("documents")}</p>
          <div className="space-y-3">
            {docs.map((doc, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-text/10 p-4">
                <Select
                  aria-label={t("docType")}
                  value={doc.doc_type}
                  onChange={(e) => {
                    const next = [...docs];
                    next[i] = { ...doc, doc_type: e.target.value as DocEntry["doc_type"] };
                    setDocs(next);
                  }}
                  className="sm:w-56"
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {t(`docTypes.${dt}`)}
                    </option>
                  ))}
                </Select>
                <FileUpload
                  endpoint="landDocument"
                  label={t(`docTypes.${doc.doc_type}`)}
                  value={doc.file_url}
                  onChange={(url) => {
                    const next = [...docs];
                    next[i] = { ...doc, file_url: url };
                    setDocs(next);
                    uploadDoc(i, url, doc.doc_type);
                  }}
                />
                {doc.aiLoading && <AiVerdictCard analyzing />}
                {doc.ai && (
                  <AiVerdictCard
                    verdict={doc.ai.verdict as "authentic" | "suspicious" | "fraudulent"}
                    score={doc.ai.score}
                    userMessage={doc.ai.user_message}
                    flaggedReasons={doc.ai.flagged_reasons}
                  />
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setDocs([...docs, { file_url: "", doc_type: "other" }])}
          >
            + {t("addDocument")}
          </Button>
        </div>

        {error && (
          <Alert tone="error">
            {error}
            {duplicate && (
              <span className="mt-1 block font-mono text-xs">
                {t("duplicateError")} {duplicate.parcel_reference} ({duplicate.region})
              </span>
            )}
          </Alert>
        )}

        <Button type="submit" size="lg" disabled={state === "loading"}>
          {state === "loading" ? <Spinner /> : t("register")}
        </Button>
      </form>
    </div>
  );
}
