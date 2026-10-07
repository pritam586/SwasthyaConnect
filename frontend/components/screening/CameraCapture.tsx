"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/common/Button";

interface Props {
  onImageReady: (file: File, previewUrl: string) => void;
}

export function CameraCapture({ onImageReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let active: MediaStream | null = null;
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser cannot open the camera. Upload a photo instead.");
        return;
      }
      try {
        active = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setStream(active);
        if (videoRef.current) videoRef.current.srcObject = active;
      } catch {
        setError("Camera permission was denied. You can still upload a photo.");
      }
    }
    void start();
    return () => {
      active?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function emitBlob(blob: Blob, name: string) {
    const file = new File([blob], name, { type: blob.type || "image/jpeg" });
    const preview = URL.createObjectURL(file);
    onImageReady(file, preview);
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) emitBlob(blob, `eye-capture-${Date.now()}.jpg`);
    }, "image/jpeg", 0.9);
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onImageReady(file, URL.createObjectURL(file));
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-base text-muted">
        <li>Sit in bright, even daylight. Avoid harsh flash.</li>
        <li>Gently pull down the lower eyelid so the inner pink lining is visible.</li>
        <li>Hold the camera 10–15 cm away. Keep the eye in the centre of the frame.</li>
        <li>Stay still, then capture. Do not crop out the eyelid lining.</li>
      </ol>
      <div className="overflow-hidden rounded-2xl border border-line bg-black">
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-[#1b2a27] p-6 text-center text-white">
            Camera preview will appear here when permission is granted.
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={capture} disabled={!stream}>
          Capture from camera
        </Button>
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
          Upload a photo
        </Button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
      </div>
    </div>
  );
}
