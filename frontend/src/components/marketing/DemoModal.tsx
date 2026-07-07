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
      <p className="mb-5 text-sm leading-relaxed text-text/70">{t("subtitle")}</p>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-primary">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-text/70">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Link href="/map" onClick={onClose} className="block flex-1">
          <Button className="w-full" variant="secondary" type="button">
            {t("ctaMap")}
          </Button>
        </Link>
        <Link href="/verify" onClick={onClose} className="block flex-1">
          <Button className="w-full" type="button">
            {t("ctaVerify")}
          </Button>
        </Link>
      </div>
    </Modal>
  );
}
