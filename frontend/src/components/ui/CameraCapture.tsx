"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, RotateCcw } from "lucide-react";
import { Button, Spinner } from "@/components/ui";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  /** `user` for selfies, `environment` for ID documents */
  facingMode?: "user" | "environment";
}

export function CameraCapture({ onCapture, onCancel, facingMode = "environment" }: CameraCaptureProps) {
  const t = useTranslations("upload");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setStarting(true);
      setError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        if (!cancelled) setError(t("cameraDenied"));
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facingMode, t]);

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-primary/10 bg-primary/5">
      <div className="relative aspect-[4/3] bg-black/90">
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="h-8 w-8 border-white/30 border-t-white" />
          </div>
        )}
        {error ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-red-200">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-primary/10 bg-surface p-3">
        <Button type="button" variant="secondary" size="sm" onClick={snap} disabled={!!error || starting}>
          <Camera className="h-4 w-4" strokeWidth={2} />
          {t("takePhoto")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          {t("cancelCamera")}
        </Button>
      </div>
    </div>
  );
}
