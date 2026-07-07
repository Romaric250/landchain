"use client";

import { use, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, errorMessage } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { Alert, Badge, Button, Card, Input, Modal, PageTitle, ParcelDetailSkeleton, Spinner, Textarea, statusColor } from "@/components/ui";
import { AiVerdictCard } from "@/components/ui/AiVerdictCard";
import { parcelLngLat } from "@/components/map/ParcelMap";

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
  const [disputeDesc, setDisputeDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const [listModal, setListModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [disputeModal, setDisputeModal] = useState(false);

  const load = useCallback(() => {
    api<Parcel>(`/parcels/${id}`).then(setParcel).catch((e) => setError(errorMessage(e)));
  }, [id]);

  useEffect(load, [load]);

  const docsPendingAi = (parcel?.document_list ?? []).some((d) => !d.ai_verification_result);
  useEffect(() => {
    if (!docsPendingAi || !parcel) return;
    const timer = window.setInterval(load, 4000);
    const timeout = window.setTimeout(() => window.clearInterval(timer), 120000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, [docsPendingAi, parcel, load]);

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
      setTransferModal(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function raiseDispute(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/disputes", { method: "POST", body: { parcel_id: id, description: disputeDesc } });
      setNotice(td("raised"));
      setDisputeModal(false);
      setDisputeDesc("");
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!parcel) {
    return (
      <div className="mx-auto max-w-5xl">
        {error ? (
          <div className="py-10">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : (
          <ParcelDetailSkeleton />
        )}
      </div>
    );
  }

  const center = parcelLngLat(parcel) ?? undefined;

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
          {parcel.geojson && (
            <ParcelMap
              parcels={[parcel]}
              center={center}
              zoom={14}
              showPolygons
              className="h-64 w-full rounded-xl border border-text/10"
            />
          )}

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
          </Card>

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

          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("documents")}</h2>
            {docsPendingAi && (
              <p className="mt-2 flex items-center gap-2 text-xs text-text/60">
                <Spinner className="h-3 w-3" />
                {t("aiAnalyzing")}
              </p>
            )}
            <ul className="mt-3 space-y-4">
              {(parcel.document_list ?? []).map((doc) => (
                <li key={doc.id} className="rounded-lg border border-text/10 p-3">
                  <p className="font-medium text-primary">
                    {tp(`docTypes.${doc.doc_type}` as Parameters<typeof tp>[0])}
                  </p>
                  {doc.ai_verification_result ? (
                    <div className="mt-2">
                      <AiVerdictCard
                        verdict={doc.ai_verification_result.verdict}
                        score={doc.ai_verification_result.score}
                        userMessage={doc.ai_verification_result.user_message}
                        flaggedReasons={doc.ai_verification_result.flagged_reasons}
                      />
                    </div>
                  ) : (
                    <div className="mt-2">
                      <AiVerdictCard analyzing />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-text/50">{t("aiHumanNote")}</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("listForSale")}</h2>
            {parcel.listing?.status === "active" ? (
              <div className="mt-3">
                <Alert tone="success">
                {t("listedActive", {
                  date: parcel.listing.expires_at
                    ? new Date(parcel.listing.expires_at).toLocaleDateString()
                    : "—",
                })}
                </Alert>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                disabled={parcel.status !== "active"}
                onClick={() => setListModal(true)}
              >
                {t("listForSale")}
              </Button>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase text-text/60">{t("transfer")}</h2>
            <Button
              type="button"
              className="mt-3 w-full"
              disabled={parcel.status !== "active"}
              onClick={() => setTransferModal(true)}
            >
              {t("transferCta")}
            </Button>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/verify/${parcel.id}`}>
              <Button variant="outline">{t("fullReport")}</Button>
            </Link>
            <Button variant="ghost" onClick={() => setDisputeModal(true)}>
              {td("raise")}
            </Button>
          </div>
        </div>
      </div>

      <Modal open={listModal} onClose={() => setListModal(false)} title={t("listForSaleModal")}>
        <form onSubmit={listForSale} className="space-y-4">
          <Input
            type="number"
            min={1000}
            label={t("askingPrice")}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
            {busy ? <Spinner /> : t("confirmList")}
          </Button>
        </form>
      </Modal>

      <Modal open={transferModal} onClose={() => setTransferModal(false)} title={t("transferModal")}>
        <form onSubmit={initiateTransfer} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Spinner /> : t("confirmTransfer")}
          </Button>
        </form>
      </Modal>

      <Modal open={disputeModal} onClose={() => setDisputeModal(false)} title={t("disputeModal")}>
        <form onSubmit={raiseDispute} className="space-y-4">
          <Textarea
            label={t("disputeDescription")}
            required
            minLength={10}
            rows={4}
            value={disputeDesc}
            onChange={(e) => setDisputeDesc(e.target.value)}
          />
          <Button type="submit" variant="danger" className="w-full" disabled={busy}>
            {busy ? <Spinner /> : td("submit")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
