"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";

export const DEMO_VIDEO_URL =
  "https://2d4r8xyx2f.ufs.sh/f/NBqaoz7VhueJia1n4kqajzXfrQULbAsGqFxZDS4NOBeEdV18";

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoModal({ open, onClose }: DemoModalProps) {
  const t = useTranslations("demo");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!open) {
      el?.pause();
      if (el) el.currentTime = 0;
      return;
    }
    el?.play().catch(() => {
      /* autoplay blocked until user presses play — controls are visible */
    });
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={t("title")} video>
      <div className="aspect-video w-full bg-black">
        <video
          ref={videoRef}
          src={DEMO_VIDEO_URL}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
        >
          {t("videoFallback")}
        </video>
      </div>
    </Modal>
  );
}
