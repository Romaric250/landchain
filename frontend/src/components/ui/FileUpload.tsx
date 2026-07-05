"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { genUploader } from "uploadthing/client";
import { Camera, Link2, Upload } from "lucide-react";
import type { UploadRouter } from "@/app/api/uploadthing/core";
import { UploadDropzone } from "@/lib/uploadthing";
import { getAccessToken } from "@/lib/api-client";
import { CameraCapture } from "@/components/ui/CameraCapture";
import { DropdownItem, DropdownMenu, DropdownTriggerButton } from "@/components/ui/DropdownMenu";
import { Spinner } from "@/components/ui";

const { uploadFiles } = genUploader<UploadRouter>();

interface FileUploadProps {
  endpoint: "kycDocument" | "landDocument";
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Use front camera for selfies */
  cameraFacing?: "user" | "environment";
}

type UploadMode = "file" | "camera" | "url";

/** UploadThing-powered file input with camera capture and URL fallback. */
export function FileUpload({
  endpoint,
  label,
  value,
  onChange,
  cameraFacing = "environment",
}: FileUploadProps) {
  const t = useTranslations("upload");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<UploadMode>("file");
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  async function uploadCaptured(file: File) {
    const token = getAccessToken();
    if (!token) {
      setError(t("loginRequired"));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await uploadFiles(endpoint, {
        files: [file],
        headers: { authorization: `Bearer ${token}` },
      });
      const uploaded = res[0];
      if (uploaded) onChange(uploaded.ufsUrl ?? uploaded.url);
      setMode("file");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    const isImage =
      /\.(jpe?g|png|gif|webp)(\?|$)/i.test(value) ||
      value.includes("utfs.io") ||
      value.includes("ufs.sh");
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-primary">{label}</span>
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-800">{t("uploaded")}</p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-xs text-green-700 underline"
            >
              {value}
            </a>
          </div>
          <DropdownMenu
            align="right"
            trigger={<DropdownTriggerButton label={t("replace")} className="!py-1.5 !text-xs" />}
          >
            <DropdownItem onClick={() => onChange("")}>
              <Upload className="h-4 w-4" strokeWidth={2} />
              {t("replace")}
            </DropdownItem>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  const modeLabel =
    mode === "camera" ? t("modeCamera") : mode === "url" ? t("modeUrl") : t("modeFile");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-primary">{label}</span>
        <DropdownMenu
          align="right"
          trigger={<DropdownTriggerButton label={modeLabel} className="!py-1.5 !text-xs" />}
        >
          <DropdownItem onClick={() => setMode("file")}>
            <Upload className="h-4 w-4" strokeWidth={2} />
            {t("modeFile")}
          </DropdownItem>
          <DropdownItem onClick={() => setMode("camera")}>
            <Camera className="h-4 w-4" strokeWidth={2} />
            {t("modeCamera")}
          </DropdownItem>
          <DropdownItem onClick={() => setMode("url")}>
            <Link2 className="h-4 w-4" strokeWidth={2} />
            {t("modeUrl")}
          </DropdownItem>
        </DropdownMenu>
      </div>

      {mode === "file" && (
        <UploadDropzone
          endpoint={endpoint}
          headers={(): Record<string, string> => {
            const token = getAccessToken();
            return token ? { authorization: `Bearer ${token}` } : {};
          }}
          onClientUploadComplete={(res) => {
            const file = res?.[0];
            if (file) onChange(file.ufsUrl ?? file.url);
            setError("");
          }}
          onUploadError={(e: Error) => {
            setError(e.message);
            setMode("url");
          }}
          appearance={{
            container:
              "!mt-0 rounded-xl border-2 border-dashed !border-text/20 bg-accent/10 py-6 ut-uploading:opacity-60",
            label: "!text-secondary hover:!text-secondary/80 text-sm",
            button:
              "!bg-primary !text-background !text-sm !font-semibold ut-ready:!bg-primary ut-uploading:!bg-primary/60 after:!bg-secondary",
            allowedContent: "!text-text/50",
          }}
        />
      )}

      {mode === "camera" && (
        uploading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/10 py-12 text-sm text-text/60">
            <Spinner /> {t("uploading")}
          </div>
        ) : (
          <CameraCapture
            facingMode={cameraFacing}
            onCapture={uploadCaptured}
            onCancel={() => setMode("file")}
          />
        )
      )}

      {mode === "url" && (
        <div className="rounded-xl border border-primary/10 bg-accent/10 p-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder={t("urlPlaceholder")}
              className="w-full rounded-lg border border-text/20 bg-background px-3 py-2 text-sm text-text placeholder:text-text/40 focus:border-secondary focus:outline-none"
            />
            <button
              type="button"
              disabled={!/^https?:\/\/.+/.test(manualUrl)}
              onClick={() => onChange(manualUrl)}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-background disabled:opacity-40 cursor-pointer"
            >
              {t("useUrl")}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
