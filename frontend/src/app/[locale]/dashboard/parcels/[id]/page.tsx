"use client";

import { use, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, errorMessage } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { Alert, Badge, Button, Card, Input, PageTitle, Spinner, statusColor } from "@/components/ui";

const ParcelMap = dynamic(() => import("@/components/map/ParcelMap"), { ssr: false });

export default function ParcelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("parcels.detail");
  const tp = useTranslations("parcels");
  const tc = useTranslations("common");
  const td = useTranslations("disputes");
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [price, setPrice] = useState("");
  const [transfer, setTransfer] = useState({ to_owner_email: "", notary_email: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Parcel>(`/parcels/${id}`).then(setParcel).catch((e) => setError(errorMessage(e)));
  }, [id]);

  useEffect(load, [load]);

  async function listForSale(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ link: string }>(`/parcels/${id}/list-for-sale`, {
        method: "POST",
        body: { price_xaf: Number(price) },
      });
      window.location.href = res.link;
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function initiateTransfer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ message: string }>(`/parcels/${id}/transfer`, {
        method: "POST",
        body: {
          to_owner_email: transfer.to_owner_email,
          notary_email: transfer.notary_email || null,
        },
      });
      setNotice(res.message);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!parcel) {
    return (
      <div className="flex justify-center py-20">
        {error ? <Alert tone="error">{error}</Alert> : <Spinner className="h-8 w-8" />}
      </div>
    );
  }

  const geo = parcel.geojson;
  const center: [number, number] | undefined =
    geo?.type === "Point" ? [(geo.coordinates as number[])[0], (geo.coordinates as number[])[1]] : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle title={parcel.parcel_reference} subtitle={parcel.region} />
        <Badge color={statusColor(parcel.status)}>{tc(`status.${parcel.status}`)}</Badge>
      </div>

      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {geo && (
            <ParcelMap
              parcels={[parcel]}
              center={center}
              zoom={14}
              className="h-64 w-full rounded-xl border border-text/10"
            />
          )}

          {/* Blockchain anchor */}
          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("blockchain")}</h2>
            <p className="mt-2 text-sm font-medium text-primary">
              {parcel.blockchain_tx_hash ? t("anchored") : t("pendingAnchor")}
            </p>
            {parcel.record_hash && (
              <p className="mt-2 break-all font-mono text-xs text-text/60">
                {t("recordHash")}: {parcel.record_hash}
              </p>
            )}
            {parcel.blockchain_tx_hash && (
              <p className="mt-1 break-all font-mono text-xs text-text/60">
                tx: {parcel.blockchain_tx_hash}
              </p>
            )}
          </Card>

          {/* History */}
          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("history")}</h2>
            <ul className="mt-3 space-y-3">
              {(parcel.transactions ?? []).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium capitalize text-primary">{tx.type}</p>
                    <p className="text-xs text-text/60">{new Date(tx.timestamp).toLocaleString()}</p>
                  </div>
                  <Badge color={statusColor(tx.status)}>{tx.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          {/* Documents */}
          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("documents")}</h2>
            <ul className="mt-3 space-y-3">
              {(parcel.document_list ?? []).map((doc) => (
                <li key={doc.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-primary">{tp(`docTypes.${doc.doc_type}` as Parameters<typeof tp>[0])}</p>
                    {doc.ai_verification_result && (
                      <p className="text-xs text-text/60">
                        AI: {doc.ai_verification_result.verdict} (
                        {Math.round(doc.ai_verification_result.score * 100)}%)
                      </p>
                    )}
                  </div>
                  {doc.ai_verification_result && (
                    <Badge color={statusColor(doc.ai_verification_result.verdict)}>
                      {doc.ai_verification_result.verdict}
                    </Badge>
                  )}
                </li>
              ))}
              {(parcel.document_list ?? []).length === 0 && (
                <li className="text-sm text-text/60">—</li>
              )}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {/* List for sale */}
          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("listForSale")}</h2>
            {parcel.listing?.status === "active" ? (
              <Alert tone="success">
                {t("listedActive", {
                  date: parcel.listing.expires_at
                    ? new Date(parcel.listing.expires_at).toLocaleDateString()
                    : "—",
                })}
              </Alert>
            ) : (
              <form onSubmit={listForSale} className="mt-3 space-y-3">
                <Input
                  type="number"
                  min={1000}
                  label={t("askingPrice")}
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Button type="submit" variant="secondary" disabled={busy || parcel.status !== "active"}>
                  {busy ? <Spinner /> : t("listCta")}
                </Button>
              </form>
            )}
          </Card>

          {/* Transfer */}
          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("transfer")}</h2>
            <form onSubmit={initiateTransfer} className="mt-3 space-y-3">
              <Input
                type="email"
                label={t("recipientEmail")}
                required
                value={transfer.to_owner_email}
                onChange={(e) => setTransfer({ ...transfer, to_owner_email: e.target.value })}
              />
              <Input
                type="email"
                label={t("notaryEmail")}
                value={transfer.notary_email}
                onChange={(e) => setTransfer({ ...transfer, notary_email: e.target.value })}
              />
              <Button type="submit" disabled={busy || parcel.status !== "active"}>
                {busy ? <Spinner /> : t("transferCta")}
              </Button>
            </form>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/verify/${parcel.id}`}>
              <Button variant="outline">{t("fullReport")}</Button>
            </Link>
            <Link href="/dashboard/disputes">
              <Button variant="ghost">{td("raise")}</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
