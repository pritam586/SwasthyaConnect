"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

/** Live camera capture with a file-upload fallback (camera denied, no camera, or desktop). */
export function CameraCapture({ onImage }: { onImage: (file: File) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let active: MediaStream | null = null;
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("This browser cannot open the camera. Upload a photo instead.");
        return;
      }
      try {
        active = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          active.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(active);
      } catch {
        setCameraError("Camera access was not allowed. You can upload a photo instead.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      active?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onImage(new File([blob], `eye-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-muted">
        <li>{t("instr1")}</li>
        <li>{t("instr2")}</li>
        <li>{t("instr3")}</li>
      </ol>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        {stream ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
            {/* Framing guide for the lower eyelid. */}
            <div className="pointer-events-none absolute inset-[22%_15%] rounded-[50%] border-4 border-dashed border-white/80" aria-hidden />
          </>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center p-6 text-center text-white">
            {cameraError ?? t("loading")}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={capture} disabled={!stream}>{t("captureBtn")}</Button>
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>{t("uploadBtn")}</Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImage(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
