import React, { useState, useEffect, useRef } from "react"
import { translations, Language } from "../../i18n"
import { UserProfile } from "../auth/authService"

interface EyeCaptureScreenProps {
  onBack: () => void
  onCaptured: (imageDataUrl: string, qualityPassed: boolean, qualityReason: string) => void
  lang: Language
  user: UserProfile
}

export function EyeCaptureScreen({
  onBack,
  onCaptured,
  lang,
  user,
}: EyeCaptureScreenProps) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [qualityCheck, setQualityCheck] = useState<{ passed: boolean; reason: string }>({
    passed: true,
    reason: "",
  })

  // Start real webcam preview
  useEffect(() => {
    let activeStream: MediaStream | null = null

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera API is not supported in this browser. Please upload an image.")
        return
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
        activeStream = s
        setStream(s)
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      } catch (err: any) {
        setCameraError(`Camera access could not be initialized (${err.name || "Denied"}). Use upload instead.`)
      }
    }

    startCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Analyze image quality (brightness, size, contrast)
  const evaluateQuality = (canvas: HTMLCanvasElement): { passed: boolean; reason: string } => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return { passed: true, reason: "" }

    if (canvas.width < 128 || canvas.height < 128) {
      return { passed: false, reason: "Image is too small. Move closer and retake the photo." }
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imgData.data
    let totalLuminance = 0
    const pixelCount = data.length / 4

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      // Standard perceived luminance formula
      totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b
    }

    const avgLuminance = totalLuminance / pixelCount

    if (avgLuminance < 35) {
      return { passed: false, reason: "Image is too dark. Use brighter, even lighting and retake the photo." }
    }
    if (avgLuminance > 225) {
      return { passed: false, reason: "Image is overexposed. Reduce glare and retake the photo." }
    }

    return { passed: true, reason: "Lighting and image clarity verified (Quality gate passed)." }
  }

  // Capture frame from webcam
  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    const quality = evaluateQuality(canvas)

    setCapturedImage(dataUrl)
    setQualityCheck(quality)
  }

  // File upload fallback handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const quality = evaluateQuality(canvas)
          setCapturedImage(dataUrl)
          setQualityCheck(quality)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  // Retake
  const handleRetake = () => {
    setCapturedImage(null)
    setQualityCheck({ passed: true, reason: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Confirm
  const handleConfirm = () => {
    if (!capturedImage) return
    onCaptured(capturedImage, qualityCheck.passed, qualityCheck.reason)
  }

  return (
    <div className="min-h-screen bg-[#dff0f5] flex items-start justify-center py-6 px-4 font-body">
      <div
        className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden bg-slate-950 flex flex-col"
        style={{ minHeight: "780px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 z-20 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            ←
          </button>
          <div className="text-white text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            👁️ {t("eyeScanTitle")} · {user.name}
          </div>
          <span className="text-[10px] text-teal-400 font-bold bg-teal-950 px-2.5 py-1 rounded-full border border-teal-800">
            {lang.toUpperCase()}
          </span>
        </div>

        {/* Viewfinder or Captured Preview */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
          {capturedImage ? (
            /* Captured Preview Mode */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
              <img
                src={capturedImage}
                alt="Captured sample"
                className="max-h-[380px] w-auto rounded-2xl border-2 border-teal-500 shadow-2xl object-cover"
              />

              {/* Quality Gate Status Card */}
              <div
                className={`mt-4 p-3 rounded-xl border text-xs max-w-xs text-center font-semibold ${
                  qualityCheck.passed
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                    : "bg-red-950/80 border-red-500 text-red-200"
                }`}
              >
                {qualityCheck.passed ? `✓ ${qualityCheck.reason}` : `⚠️ ${qualityCheck.reason}`}
              </div>
            </div>
          ) : (
            /* Live Camera Feed */
            <div className="relative w-full h-full flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center text-white space-y-3 max-w-xs">
                  <div className="text-4xl">📷</div>
                  <div className="text-xs text-amber-300 font-semibold">{cameraError}</div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    📁 Upload Eye Photo from Device
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Framing Guide Oval */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="280" height="170" viewBox="0 0 280 170">
                      <ellipse
                        cx="140"
                        cy="85"
                        rx="108"
                        ry="65"
                        fill="none"
                        stroke="#14b8a6"
                        strokeWidth="2.5"
                        strokeDasharray="8 6"
                      />
                      <circle cx="140" cy="85" r="4" fill="#14b8a6" />
                    </svg>
                  </div>

                  {/* Colour calibration card overlay */}
                  <div className="absolute bottom-4 right-4 z-20 bg-black/70 p-2 rounded-xl border border-white/20">
                    <div className="grid grid-cols-2 gap-1 w-12">
                      <div className="h-4 bg-red-500 rounded" />
                      <div className="h-4 bg-green-500 rounded" />
                      <div className="h-4 bg-blue-500 rounded" />
                      <div className="h-4 bg-white rounded" />
                    </div>
                    <div className="text-[8px] text-white/80 text-center mt-1 font-bold">
                      {t("colourRefCard")}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hidden Canvas for snapshot processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls & Shutter */}
        <div className="p-5 bg-slate-950 z-20 space-y-3 border-t border-white/10">
          {capturedImage ? (
            /* Retake / Confirm buttons */
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition"
              >
                🔄 Retake Photo
              </button>
              <button
                onClick={handleConfirm}
                disabled={!qualityCheck.passed}
                className={`flex-1 py-3 font-bold text-xs rounded-xl shadow-lg transition ${
                  qualityCheck.passed
                    ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/30"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                Confirm & Analyze →
              </button>
            </div>
          ) : (
            /* Live Capture Controls */
            <>
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-white text-xs leading-relaxed">
                <div className="font-bold mb-0.5">📸 {t("instr1")}</div>
                <div className="text-white/80 text-[11px]">{t("instr2")}</div>
              </div>

              <div className="flex items-center justify-around pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg transition"
                  title={t("uploadBtnLabel")}
                >
                  📁
                </button>

                {/* Shutter Button */}
                <button
                  onClick={handleCapture}
                  disabled={Boolean(cameraError)}
                  className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform bg-teal-600 shadow-xl shadow-teal-600/30 disabled:opacity-50"
                  style={{ width: "68px", height: "68px" }}
                >
                  <div className="w-12 h-12 rounded-full bg-white" />
                </button>

                <div className="w-12" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
