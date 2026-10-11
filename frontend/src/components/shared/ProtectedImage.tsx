"use client";

import { useEffect, useState } from "react";
import { fileService } from "@/services/file.service";

/** Medical images are not public URLs: fetch with the user's token and show a local object URL. */
export function ProtectedImage({ fileId, alt, className = "" }: { fileId: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    fileService
      .download(fileId, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (failed) return <p className="text-sm text-muted">The image could not be loaded.</p>;
  if (!src) return <div className={`animate-pulse rounded-xl bg-[#e6e0d4] ${className}`} aria-label="Loading image" />;
  // eslint-disable-next-line @next/next/no-img-element -- object URLs cannot use next/image
  return <img src={src} alt={alt} className={className} />;
}

/** Opens a protected document (e.g. a PDF report) in a new tab. */
export async function openProtectedFile(fileId: string): Promise<void> {
  const blob = await fileService.download(fileId);
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
