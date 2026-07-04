"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { Alert, Button, Input, PageTitle, Select, Spinner } from "@/components/ui";
import { FileUpload } from "@/components/ui/FileUpload";

const ParcelMap = dynamic(() => import("@/components/map/ParcelMap"), { ssr: false });

const DOC_TYPES = ["land_title", "survey_plan", "sale_agreement", "tax_receipt", "other"] as const;

interface DocEntry {
  file_url: string;
  doc_type: (typeof DOC_TYPES)[number];
}

export default function NewParcelPage() {
  const t = useTranslations("parcels");
  const router = useRouter();
  const [form, setForm] = useState({ parcel_reference: "", region: "", area_sqm: "" });
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [docs, setDocs] = useState<DocEntry[]>([{ file_url: "", doc_type: "land_title" }]);
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string>("");
  const [duplicate, setDuplicate] = useState<{ parcel_reference?: string; region?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      setError(t("mapHint"));
      return;
    }
    setState("loading");
    setError("");
    setDuplicate(null);
    try {
      // Upload documents first (URLs from UploadThing in production)
      const documentIds: string[] = [];
      for (const doc of docs.filter((d) => d.file_url.trim())) {
        const res = await api<{ id: string }>("/documents/upload", {
          method: "POST",
          body: { parcel_id: "pending", file_url: doc.file_url, doc_type: doc.doc_type },
        });
        documentIds.push(res.id);
      }

      const parcel = await api<{ id: string }>("/parcels", {
        method: "POST",
        body: {
          parcel_reference: form.parcel_reference,
          region: form.region,
          area_sqm: Number(form.area_sqm),
          geojson: { type: "Point", coordinates: [picked[0], picked[1]] },
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
          <p className="mb-2 text-xs text-text/60">{t("mapHint")}</p>
          <ParcelMap
            onPick={(lng, lat) => setPicked([lng, lat])}
            picked={picked}
            className="h-80 w-full rounded-xl border border-text/10"
          />
          {picked && (
            <p className="mt-2 font-mono text-xs text-text/60">
              {picked[1].toFixed(6)}, {picked[0].toFixed(6)}
            </p>
          )}
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
                  }}
                />
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
