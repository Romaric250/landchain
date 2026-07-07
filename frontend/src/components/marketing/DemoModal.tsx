"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui";

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoModal({ open, onClose }: DemoModalProps) {
  const t = useTranslations("demo");

  const steps = t.raw("steps") as { title: string; text: string }[];

  return (
    <Modal open={open} onClose={onClose} title={t("title")} wide>
      <p className="mb-4 text-sm text-text/70">{t("subtitle")}</p>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
              {i + 1}
            </span>
            <div>
              <p className="font-semibold text-primary">{step.title}</p>
              <p className="mt-0.5 text-sm text-text/70">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href="/map" onClick={onClose} className="flex-1">
          <Button className="w-full" variant="secondary">{t("ctaMap")}</Button>
        </Link>
        <Link href="/verify" onClick={onClose} className="flex-1">
          <Button className="w-full">{t("ctaVerify")}</Button>
        </Link>
      </div>
    </Modal>
  );
}
