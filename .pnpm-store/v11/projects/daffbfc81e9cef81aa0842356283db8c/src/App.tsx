import { useState, useEffect, useRef } from "react"
import { requestVisualScreening, VisualScreeningServiceError } from "./modules/visualScreening"
import { requestTriageAssessment, TriageServiceError } from "./modules/triage/triageService"
import { requestAbhaLink } from "./modules/abha/abhaService"

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "splash" | "language" | "whoCares" | "selectMember"
  | "phone" | "createProfile" | "fetchingProfile" | "profileSummary"
  | "abha" | "consent" | "fetchingRecords" | "eligibility"
  | "eyeCapture" | "checkPhoto" | "retakePhoto" | "analyzing" | "screeningResult"
  | "symptomChat" | "triageResult"
  | "selfCare" | "pharmacy" | "visitSavedGreen"
  | "connectingDoctor" | "teleconsult" | "bookAppointment"
  | "prescriptionReceived" | "visitSavedYellow"
  | "emergency"
  | "doctorDashboard"

const LANGUAGES = [
  { code: "hi", native: "हिन्दी" },
  { code: "en", native: "English" },
  { code: "bn", native: "বাংলা" },
  { code: "te", native: "తెలుగు" },
  { code: "mr", native: "मराठी" },
  { code: "ta", native: "தமிழ்" },
  { code: "gu", native: "ગુજરાતી" },
  { code: "kn", native: "ಕನ್ನಡ" },
  { code: "pa", native: "ਪੰਜਾਬੀ" },
  { code: "or", native: "ଓଡ଼ିଆ" },
  { code: "ml", native: "മലയാളം" },
  { code: "ur", native: "اردو" },
]

// ─── Shared Components ────────────────────────────────────────────────────────

function MobileShell({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  return (
    <div className="min-h-screen bg-[#dff0f5] flex items-start justify-center py-6 px-4 font-body">
      <div
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col ${noPadding ? "" : ""}`}
        style={{ minHeight: "780px", maxHeight: "860px", overflowY: "auto" }}
      >
        {children}
      </div>
    </div>
  )
}

function AppLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const s = size === "sm" ? 28 : 36
  const icon = size === "sm" ? 14 : 18
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-200"
      style={{ width: s, height: s }}
    >
      <svg width={icon} height={icon} viewBox="0 0 18 18" fill="none">
        <path d="M9 1.5C9 1.5 3 6 3 10.5a6 6 0 0012 0C15 6 9 1.5 9 1.5z" fill="white" fillOpacity="0.92" />
        <circle cx="9" cy="10.5" r="2.5" fill="white" fillOpacity="0.45" />
        <circle cx="9" cy="10.5" r="1.2" fill="white" />
      </svg>
    </div>
  )
}

function Header({
  lang,
  onLangClick,
  back,
  onBack,
}: {
  lang: string
  onLangClick: () => void
  back?: boolean
  onBack?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white flex-shrink-0">
      {back ? (
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 -ml-1 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 15l-5-5 5-5" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <AppLogo size="sm" />
          <span className="font-display font-bold text-teal-700 text-sm tracking-wide">SwasthyaConnect</span>
        </div>
      )}
      <button
        onClick={onLangClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-50 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7 1C7 1 5 4 5 7s2 6 2 6M7 1c0 0 2 3 2 6s-2 6-2 6M1 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {lang.toUpperCase()}
      </button>
    </div>
  )
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="px-5 pt-3 pb-1 flex gap-1.5 flex-shrink-0">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
            i < step ? "bg-teal-500" : i === step ? "bg-teal-200" : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  )
}

function Btn({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger"
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-md shadow-teal-100",
    secondary: "bg-white text-teal-700 border-2 border-teal-200 hover:bg-teal-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-200",
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2.5 w-full min-h-[52px] px-5 py-3 rounded-2xl font-semibold text-base transition-all ${variants[variant]} ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  )
}

function VoiceBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active ? "bg-teal-600 text-white border-teal-600" : "bg-white text-teal-700 border-teal-200 hover:bg-teal-50"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <rect x="5" y="1" width="6" height="9" rx="3" fill="currentColor" />
        <path d="M2 8c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="14" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {active ? "Listening…" : "Voice"}
    </button>
  )
}

function SkeletonLine({ w = "full" }: { w?: string }) {
  return <div className={`h-3 bg-slate-200 rounded-full animate-pulse w-${w}`} style={{ animationDuration: "1.5s" }} />
}

// ─── SCREEN: Splash ───────────────────────────────────────────────────────────

function SplashScreen({ goto }: { goto: (s: Screen) => void }) {
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-between py-12 px-6 sc-fade-in">
        <div className="flex-1 flex flex-col items-center justify-center gap-7">
          {/* Logo */}
          <div className="relative">
            <div className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center shadow-2xl shadow-teal-300">
              <svg width="62" height="62" viewBox="0 0 64 64" fill="none">
                <path d="M32 6C32 6 12 20 12 36a20 20 0 0040 0C52 20 32 6 32 6z" fill="white" fillOpacity="0.92" />
                <circle cx="32" cy="36" r="8.5" fill="white" fillOpacity="0.38" />
                <circle cx="32" cy="36" r="4" fill="white" />
              </svg>
            </div>
            <div className="sc-ping absolute inset-0 rounded-[28px] border-2 border-teal-400 opacity-30" />
          </div>

          <div className="text-center">
            <h1 className="font-display font-black text-3xl text-slate-800 mb-2 tracking-tight">SwasthyaConnect</h1>
            <p className="text-slate-500 text-base leading-relaxed">
              AI-powered health screening,
              <br />
              right in your hands.
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-orange-200">
              🛡️ Ayushman Bharat
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-200">
              🏛️ ABHA Linked
            </div>
            <div className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-teal-200">
              🤖 AI Screening
            </div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <Btn onClick={() => goto("language")}>Get Started →</Btn>
          <button
            onClick={() => goto("doctorDashboard")}
            className="w-full text-center text-sm text-slate-400 hover:text-teal-600 py-2 transition-colors font-medium"
          >
            Doctor / Staff Login →
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Language Selection ───────────────────────────────────────────────

function LanguageScreen({ goto, setLanguage }: { goto: (s: Screen) => void; setLanguage: (l: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <div className="mb-5">
          <h2 className="font-display font-black text-2xl text-slate-800 mb-1">Choose Language</h2>
          <p className="text-slate-400 text-sm">अपनी भाषा चुनें · ভাষা বেছে নিন</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 flex-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelected(l.code)}
              className={`min-h-[66px] rounded-2xl border-2 flex items-center justify-center font-semibold text-lg transition-all ${
                selected === l.code
                  ? "border-teal-500 bg-teal-50 text-teal-700 shadow-md shadow-teal-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/50"
              }`}
            >
              {l.native}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <Btn
            onClick={() => {
              if (selected) {
                setLanguage(selected)
                goto("whoCares")
              }
            }}
            disabled={!selected}
          >
            Continue
          </Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Who Needs Care ───────────────────────────────────────────────────

function WhoCares({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("language")} />
      <Progress step={1} total={6} />
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <div className="mb-7">
          <h2 className="font-display font-black text-2xl text-slate-800 mb-1.5">Who needs care today?</h2>
          <p className="text-slate-400 text-sm">आज किसे देखभाल की जरूरत है?</p>
        </div>
        <div className="space-y-4 flex-1">
          {[
            {
              label: "Myself",
              sub: "मैं खुद के लिए",
              icon: (
                <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="14" r="7" fill="#0891b2" fillOpacity="0.65" />
                  <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#0891b2" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                </svg>
              ),
              bg: "bg-teal-100",
              target: "phone" as Screen,
            },
            {
              label: "Family member",
              sub: "परिवार के लिए",
              icon: (
                <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
                  <circle cx="14" cy="14" r="6" fill="#6366f1" fillOpacity="0.55" />
                  <circle cx="27" cy="17" r="5" fill="#6366f1" fillOpacity="0.35" />
                  <path d="M3 34c0-6.075 4.925-11 11-11 2.42 0 4.658.779 6.49 2.097" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <path d="M18 34c0-5 4-9 9-9s9 4 9 9" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                </svg>
              ),
              bg: "bg-indigo-100",
              target: "selectMember" as Screen,
            },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => goto(opt.target)}
              className="w-full p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/60 transition-all flex items-center gap-4 text-left group"
            >
              <div
                className={`w-16 h-16 rounded-2xl ${opt.bg} flex items-center justify-center flex-shrink-0 transition-opacity`}
              >
                {opt.icon}
              </div>
              <div>
                <div className="font-bold text-slate-800 text-lg">{opt.label}</div>
                <div className="text-slate-400 text-sm mt-0.5">{opt.sub}</div>
              </div>
              <svg
                className="ml-auto text-slate-300 group-hover:text-teal-400 transition-colors"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
        <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <span>👩‍⚕️</span>
            <span className="font-bold text-amber-800 text-sm">ASHA Worker / Call Agent?</span>
          </div>
          <button
            onClick={() => goto("doctorDashboard")}
            className="text-amber-700 text-xs hover:underline"
          >
            Use the staff console for assisted intake →
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Select Member ────────────────────────────────────────────────────

function SelectMember({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const members = [
    { name: "Sunita Devi", age: 45, relation: "Mother", avatar: "👩" },
    { name: "Ramesh Kumar", age: 52, relation: "Father", avatar: "👨" },
    { name: "Aarav Kumar", age: 8, relation: "Son", avatar: "👦" },
  ]
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("whoCares")} />
      <Progress step={1} total={6} />
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <h2 className="font-display font-black text-2xl text-slate-800 mb-6">Select member</h2>
        <div className="space-y-3 flex-1">
          {members.map((m) => (
            <button
              key={m.name}
              onClick={() => goto("phone")}
              className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50/60 transition-all flex items-center gap-4 text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">{m.avatar}</div>
              <div>
                <div className="font-bold text-slate-800">{m.name}</div>
                <div className="text-slate-400 text-sm">
                  {m.age} yrs · {m.relation}
                </div>
              </div>
              <svg
                className="ml-auto text-slate-300 group-hover:text-teal-400 transition-colors"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
          <button
            onClick={() => goto("createProfile")}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/60 hover:bg-teal-100 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-teal-700">Add new member</span>
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Phone Entry ──────────────────────────────────────────────────────

function PhoneEntry({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const [phone, setPhone] = useState("")
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "✱", "0", "⌫"]
  const press = (d: string) => {
    if (d === "⌫") setPhone((p) => p.slice(0, -1))
    else if (phone.length < 10) setPhone((p) => p + d)
  }
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("whoCares")} />
      <Progress step={2} total={6} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in">
        <h2 className="font-display font-black text-2xl text-slate-800 mb-1">Enter phone number</h2>
        <p className="text-slate-400 text-sm mb-6">We will send a one-time verification code</p>

        <div className="flex items-center gap-3 mb-6 px-4 py-4 rounded-2xl border-2 border-teal-300 bg-teal-50">
          <span className="text-lg font-bold text-slate-600 border-r border-teal-200 pr-3">+91</span>
          <span className="text-2xl font-bold text-slate-800 tracking-widest flex-1 min-w-0 overflow-hidden">
            {phone.length > 0 ? (
              phone.split("").join(" ")
            ) : (
              <span className="text-slate-300 text-xl">— — — — — — — — — —</span>
            )}
          </span>
          {phone.length === 10 && (
            <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {digits.map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="h-16 rounded-2xl bg-slate-100 hover:bg-teal-100 active:bg-teal-200 flex items-center justify-center text-xl font-bold text-slate-700 transition-colors"
            >
              {d}
            </button>
          ))}
        </div>

        <Btn onClick={() => goto("fetchingProfile")} disabled={phone.length !== 10}>
          Send OTP
        </Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Create Profile ───────────────────────────────────────────────────

function CreateProfile({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("whoCares")} />
      <Progress step={2} total={6} />
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <h2 className="font-display font-black text-2xl text-slate-800 mb-6">Create profile</h2>
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-400 outline-none text-slate-800 text-base transition-colors bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Age (years)</label>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 34"
              type="number"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-400 outline-none text-slate-800 text-base transition-colors bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {["Male", "Female", "Other"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all ${
                    gender === g
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Btn onClick={() => goto("fetchingProfile")} className="mt-5">
          Save & Continue
        </Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Fetching Profile (skeleton) ─────────────────────────────────────

function FetchingProfile({ goto }: { goto: (s: Screen) => void }) {
  useEffect(() => {
    const t = setTimeout(() => goto("profileSummary"), 2600)
    return () => clearTimeout(t)
  }, [goto])

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col px-5 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-6 h-6 sc-spin" style={{ borderRadius: "50%", border: "3px solid #0891b2", borderTopColor: "transparent" }} />
          <p className="text-slate-600 font-semibold text-sm">Getting your health record ready…</p>
        </div>
        {/* Skeleton */}
        <div className="p-4 rounded-2xl bg-slate-50 mb-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="flex-1 space-y-2.5">
            <SkeletonLine w="3/4" />
            <SkeletonLine w="1/2" />
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {[85, 60, 90, 70, 80].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-slate-200 rounded-full animate-pulse"
              style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
        <div className="h-24 bg-slate-200 rounded-2xl animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-16 bg-slate-200 rounded-2xl animate-pulse" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Profile Summary ──────────────────────────────────────────────────

function ProfileSummary({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const [medList, setMedList] = useState(["Ferrous sulfate 200 mg", "Folic acid 5 mg"])
  const [newMed, setNewMed] = useState("")
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("phone")} />
      <Progress step={3} total={6} />
      <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto sc-fade-in">
        {/* Profile card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-teal-50 border border-teal-200 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-teal-200 flex items-center justify-center text-2xl">👩</div>
          <div>
            <div className="font-display font-black text-slate-800 text-lg">Priya Sharma</div>
            <div className="text-slate-500 text-sm">34 yrs · Female · Hapur, UP</div>
            <div className="text-teal-600 text-xs font-semibold mt-0.5">ABHA: 12-3456-7890-1234</div>
          </div>
        </div>

        {/* Visit history */}
        <div className="mb-5">
          <div className="font-bold text-slate-700 text-sm mb-3">Recent visits</div>
          <div className="space-y-2">
            {[
              { date: "12 Aug 2026", reason: "Anaemia screening", result: "amber", doc: "Dr. Verma" },
              { date: "3 Jun 2026", reason: "Follow-up check", result: "green", doc: "Dr. Singh" },
            ].map((v, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    v.result === "green" ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-700">{v.reason}</div>
                  <div className="text-xs text-slate-400">
                    {v.date} · {v.doc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        <div className="mb-5">
          <div className="font-bold text-slate-700 text-sm mb-3">Current medications</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {medList.map((m, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm border border-blue-200">
                {m}
                <button
                  onClick={() => setMedList((prev) => prev.filter((_, j) => j !== i))}
                  className="text-blue-400 hover:text-blue-700 ml-0.5 font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newMed}
              onChange={(e) => setNewMed(e.target.value)}
              placeholder="Add medication…"
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-300 text-slate-700"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newMed.trim()) {
                  setMedList((prev) => [...prev, newMed.trim()])
                  setNewMed("")
                }
              }}
            />
            <button
              onClick={() => {
                if (newMed.trim()) {
                  setMedList((prev) => [...prev, newMed.trim()])
                  setNewMed("")
                }
              }}
              className="px-4 py-2.5 bg-teal-100 text-teal-700 rounded-xl text-sm font-bold hover:bg-teal-200 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        <Btn onClick={() => goto("abha")}>Continue to Screening →</Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: ABHA Verification ───────────────────────────────────────────────

function AbhaScreen({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const [abha, setAbha] = useState("")
  const [integrationMessage, setIntegrationMessage] = useState("")

  const checkAbhaAvailability = async () => {
    try {
      const formatted = abha.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, "$1-$2-$3-$4")
      const result = await requestAbhaLink(formatted, true)
      setIntegrationMessage(result.message)
    } catch (error) {
      setIntegrationMessage(error instanceof Error ? error.message : "ABHA linking is unavailable. No health record was linked.")
    }
  }

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("profileSummary")} />
      <Progress step={4} total={6} />
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="6" width="24" height="16" rx="3" stroke="#2563eb" strokeWidth="2" />
            <path d="M8 14h12M8 18h8" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="5" y="9" width="8" height="5" rx="1" fill="#dbeafe" />
          </svg>
        </div>
        <h2 className="font-display font-black text-2xl text-slate-800 mb-2">ABHA Verification</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          ABDM Sandbox linking is not configured in this prototype. You may check the integration status, but no record will be linked.
        </p>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">ABHA Number</label>
            <input
              value={abha}
              onChange={(e) => setAbha(e.target.value.replace(/\D/g, ""))}
              placeholder="12-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-teal-400 outline-none text-slate-800 text-base transition-colors font-mono tracking-wider"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-sm">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <button className="w-full p-4 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 flex items-center justify-center gap-3 text-teal-700 font-semibold hover:bg-teal-100 transition-colors min-h-[52px]">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="13" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="1" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="14" y="14" width="2" height="2" fill="currentColor" rx="0.5" />
              <rect x="18" y="14" width="2" height="2" fill="currentColor" rx="0.5" />
              <rect x="14" y="18" width="2" height="2" fill="currentColor" rx="0.5" />
              <rect x="18" y="18" width="2" height="2" fill="currentColor" rx="0.5" />
            </svg>
            Scan QR Code
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Btn onClick={() => void checkAbhaAvailability()} disabled={abha.length !== 14}>Check integration status</Btn>
          {integrationMessage && <p role="status" className="text-center text-amber-700 text-xs leading-relaxed">{integrationMessage}</p>}
          <button
            onClick={() => goto("consent")}
            className="w-full text-center text-slate-400 text-sm py-2 hover:text-slate-600"
          >
            Skip for now
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Consent ──────────────────────────────────────────────────────────

function ConsentScreen({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const [checks, setChecks] = useState([false, false, false])
  const items = [
    "Share my health records with the treating doctor for this consultation",
    "Allow AI analysis of my eye scan to detect signs of anaemia",
    "Store my visit summary in my ABHA-linked health profile",
  ]
  const toggle = (i: number) => setChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))
  const allChecked = checks.every(Boolean)

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("abha")} />
      <Progress step={4} total={6} />
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 3L4 8v7c0 5.5 4.3 10.7 10 12 5.7-1.3 10-6.5 10-12V8L14 3z" stroke="#d97706" strokeWidth="2" fill="none" />
            <path d="M10 14l3 3 5-5" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-display font-black text-2xl text-slate-800 mb-2">Consent to share</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Please review and accept. Your data is protected under India&apos;s Digital Health Mission.
        </p>

        <div className="space-y-3 flex-1">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full p-4 rounded-2xl border-2 text-left flex gap-3 transition-all ${
                checks[i] ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-200"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  checks[i] ? "bg-teal-500 border-teal-500" : "border-slate-300 bg-white"
                }`}
              >
                {checks[i] && (
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <Btn onClick={() => goto("fetchingRecords")} disabled={!allChecked}>
            Accept &amp; Continue
          </Btn>
          <Btn variant="secondary" onClick={() => {}}>
            Decline
          </Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Fetching Records ─────────────────────────────────────────────────

function FetchingRecords({ goto }: { goto: (s: Screen) => void }) {
  useEffect(() => {
    const t = setTimeout(() => goto("eligibility"), 2400)
    return () => clearTimeout(t)
  }, [goto])

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="relative mb-7">
          <div className="w-20 h-20 rounded-3xl bg-teal-100 flex items-center justify-center">
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none" className="animate-pulse">
              <path d="M20 4L6 11v11c0 8.5 5.8 16.5 14 18.7C28.2 38.5 34 30.5 34 22V11L20 4z" fill="#0891b2" fillOpacity="0.12" stroke="#0891b2" strokeWidth="2" />
            </svg>
          </div>
          <div className="sc-spin absolute inset-0 rounded-3xl" style={{ border: "2.5px solid #14b8a6", borderTopColor: "transparent" }} />
        </div>
        <h2 className="font-display font-black text-xl text-slate-800 mb-2 text-center">Fetching linked records…</h2>
        <p className="text-slate-400 text-sm text-center mb-8">Checking Ayushman Bharat eligibility</p>
        <div className="space-y-3 w-full max-w-xs">
          {[85, 65, 78].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-slate-200 rounded-full animate-pulse"
              style={{ width: `${w}%`, animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Eligibility Result ───────────────────────────────────────────────

function EligibilityResult({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("profileSummary")} />
      <Progress step={5} total={6} />
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <h2 className="font-display font-black text-2xl text-slate-800 mb-6">Insurance eligibility</h2>

        {/* Eligible */}
        <div className="p-5 rounded-2xl bg-green-50 border-2 border-green-200 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L4 7v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V7L12 3z" stroke="#16a34a" strokeWidth="2" fill="none" />
                <path d="M8 12l3 3 5-5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="font-display font-black text-green-800">Eligible</div>
              <div className="text-green-600 text-sm font-semibold">Ayushman Bharat PM-JAY</div>
            </div>
            <div className="ml-auto bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">✓ VERIFIED</div>
          </div>
          <div className="border-t border-green-200 pt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-green-600 mb-0.5 font-medium">Annual coverage</div>
              <div className="font-display font-black text-green-800 text-xl">₹5 Lakh</div>
            </div>
            <div>
              <div className="text-xs text-green-600 mb-0.5 font-medium">Family ID</div>
              <div className="font-bold text-green-800 text-sm font-mono">UP-7842-3901</div>
            </div>
          </div>
        </div>

        {/* ABHA linked */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏛️</span>
            <div>
              <div className="font-bold text-blue-800 text-sm">ABHA record linked</div>
              <div className="text-blue-600 text-xs">3 previous visits imported successfully</div>
            </div>
          </div>
        </div>

        <div className="flex-1" />
        <Btn onClick={() => goto("eyeCapture")}>Start Anaemia Screening →</Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Eye Capture (CORE FEATURE) ──────────────────────────────────────

function EyeCapture({ goto }: { goto: (s: Screen) => void }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [voiceActive, setVoiceActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serviceMessage, setServiceMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const instructions = [
    { icon: "💡", text: "Move to a well-lit area — natural light or bright room works best" },
    { icon: "👁️", text: "Gently pull your lower eyelid down with one finger" },
    { icon: "📸", text: "Hold the phone 15–20 cm from your face. Keep your hand steady." },
  ]

  const submitPhoto = async (file: File) => {
    setSubmitting(true)
    setServiceMessage("")
    try {
      await requestVisualScreening(file)
      goto("screeningResult")
    } catch (error) {
      setServiceMessage(
        error instanceof VisualScreeningServiceError
          ? error.message
          : "Visual screening is unavailable. No result was generated.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitting) {
    return (
      <MobileShell>
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sc-fade-in">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl bg-teal-50 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="12" fill="#0891b2" fillOpacity="0.2" />
                <circle cx="24" cy="24" r="6" fill="#0891b2" fillOpacity="0.6" />
                <circle cx="24" cy="24" r="2.5" fill="#0891b2" />
              </svg>
            </div>
            <div className="sc-spin absolute inset-0 rounded-3xl" style={{ border: "2.5px solid #14b8a6", borderTopColor: "transparent" }} />
          </div>
          <h2 className="font-display font-black text-xl text-slate-800 mb-2">Sending photo securely…</h2>
          <p className="text-slate-400 text-sm mb-8">The service will check technical image quality before any research screening.</p>
          <div className="w-full space-y-4">
            {["Uploading image", "Checking service availability", "Waiting for a safe response"].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    i === 0 ? "border-2 border-teal-400 border-t-transparent sc-spin" : "bg-slate-200"
                  }`}
                >
                </div>
                <span className={`text-sm transition-colors ${i === 0 ? "text-slate-700 font-semibold" : "text-slate-400"}`}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </MobileShell>
    )
  }

  return (
    <div
      className="min-h-screen flex items-start justify-center py-6 px-4"
      style={{ background: "#dff0f5" }}
    >
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" style={{ minHeight: "780px", maxHeight: "860px" }}>
        {/* Camera viewfinder — dark */}
        <div className="relative bg-slate-950 flex flex-col" style={{ height: "780px" }}>
          {/* Top bar overlay */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-5 pb-4">
            <button
              onClick={() => goto("eligibility")}
              className="w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M13 15l-5-5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="text-white text-sm font-semibold bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full">
              👁️ Eye Scan
            </div>
            <VoiceBtn active={voiceActive} onClick={() => setVoiceActive(!voiceActive)} />
          </div>

          {/* Camera preview */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* BG ambience */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950" />
              <div className="absolute top-1/3 left-1/4 w-40 h-40 rounded-full bg-teal-900/25 blur-2xl" />
              <div className="absolute bottom-1/3 right-1/4 w-32 h-32 rounded-full bg-slate-700/30 blur-2xl" />
            </div>

            {/* Oval alignment guide with animated dashes */}
            <div className="relative z-10">
              <svg width="280" height="170" viewBox="0 0 280 170">
                <defs>
                  <mask id="oval-cutout">
                    <rect width="280" height="170" fill="white" />
                    <ellipse cx="140" cy="85" rx="108" ry="65" fill="black" />
                  </mask>
                </defs>
                {/* Dark overlay outside oval */}
                <rect width="280" height="170" fill="rgba(0,0,0,0.55)" mask="url(#oval-cutout)" />
                {/* Animated dashed oval */}
                <ellipse cx="140" cy="85" rx="108" ry="65" fill="none" stroke="#14b8a6" strokeWidth="2" strokeDasharray="10 5" opacity="0.9">
                  <animateTransform attributeName="transform" type="rotate" from="0 140 85" to="360 140 85" dur="9s" repeatCount="indefinite" />
                </ellipse>
                {/* Static oval */}
                <ellipse cx="140" cy="85" rx="108" ry="65" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                {/* Corner brackets */}
                <path d="M32 85 Q32 22 95 22" stroke="#14b8a6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <path d="M248 85 Q248 22 185 22" stroke="#14b8a6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <path d="M32 85 Q32 148 95 148" stroke="#14b8a6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <path d="M248 85 Q248 148 185 148" stroke="#14b8a6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                {/* Crosshair */}
                <circle cx="140" cy="85" r="3.5" fill="#14b8a6" opacity="0.8" />
                <line x1="126" y1="85" x2="136.5" y2="85" stroke="#14b8a6" strokeWidth="1.2" opacity="0.7" />
                <line x1="143.5" y1="85" x2="154" y2="85" stroke="#14b8a6" strokeWidth="1.2" opacity="0.7" />
                <line x1="140" y1="71" x2="140" y2="81.5" stroke="#14b8a6" strokeWidth="1.2" opacity="0.7" />
                <line x1="140" y1="88.5" x2="140" y2="99" stroke="#14b8a6" strokeWidth="1.2" opacity="0.7" />
              </svg>
            </div>

            {/* Colour reference card */}
            <div className="absolute bottom-5 right-5 z-10">
              <div className="border-2 border-white/50 rounded-xl w-18 p-1.5 bg-black/30 backdrop-blur-sm" style={{ width: "68px" }}>
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-full h-6 bg-red-400 rounded-md" />
                  <div className="w-full h-6 bg-green-400 rounded-md" />
                  <div className="w-full h-6 bg-blue-400 rounded-md" />
                  <div className="w-full h-6 bg-white rounded-md" />
                </div>
              </div>
              <div className="text-white/50 text-[9px] text-center mt-1 font-medium">Colour ref</div>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="relative z-20 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-10 pb-6 px-5 flex-shrink-0">
            {/* Instruction card */}
            <div className="bg-black/55 backdrop-blur-md rounded-2xl p-4 mb-5 border border-white/10">
              <div className="flex gap-2.5 mb-3">
                <span className="text-xl flex-shrink-0">{instructions[stepIdx].icon}</span>
                <p className="text-white text-sm leading-relaxed">{instructions[stepIdx].text}</p>
              </div>
              <div className="flex gap-1.5">
                {instructions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full flex-1 transition-all duration-400 ${
                      i === stepIdx ? "bg-teal-400" : i < stepIdx ? "bg-teal-600" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Capture row */}
            <div className="flex items-center justify-around">
              <button
                onClick={() => setStepIdx((p) => Math.max(0, p - 1))}
                className="w-11 h-11 rounded-full border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 transition-all text-lg"
              >
                ←
              </button>

              {/* Main capture button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="user"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void submitPhoto(file)
                  event.target.value = ""
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full group"
                aria-label="Choose an eye photo for technical quality screening"
              >
                <div className="absolute inset-0 rounded-full border-4 border-white/80" />
                <div className="absolute inset-2 rounded-full bg-white group-hover:bg-teal-50 transition-colors shadow-lg" />
                <div className="sc-ping absolute inset-0 rounded-full border-2 border-teal-400 opacity-0 group-hover:opacity-100" />
              </button>

              <button
                onClick={() => setStepIdx((p) => Math.min(instructions.length - 1, p + 1))}
                className="w-11 h-11 rounded-full border border-white/25 flex items-center justify-center text-white/60 hover:text-white hover:border-white/50 transition-all text-lg"
              >
                →
              </button>
            </div>
            <p className="text-center text-white/40 text-xs mt-3">Choose a JPEG, PNG, or WebP photo. No result is shown when the service is unavailable.</p>
            {serviceMessage && <p role="alert" className="mt-3 text-center text-amber-200 text-xs leading-relaxed">{serviceMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Analyzing Sample ─────────────────────────────────────────────────

function AnalyzingSample({ goto }: { goto: (s: Screen) => void }) {
  const [progress, setProgress] = useState(0)
  const stages = ["Preprocessing image", "Running CNN model", "Analysing conjunctiva", "Generating result"]

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); setTimeout(() => goto("screeningResult"), 400); return 100 }
        return p + 1
      })
    }, 100)
    return () => clearInterval(interval)
  }, [goto])

  const stage = Math.min(3, Math.floor(progress / 25))

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 sc-fade-in">
        {/* AI eye animation */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-3xl bg-teal-50 flex items-center justify-center border border-teal-100">
            <div className="relative">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <ellipse cx="36" cy="36" rx="30" ry="18" fill="#e0f2fe" />
                <circle cx="36" cy="36" r="12" fill="#0891b2" fillOpacity="0.25" />
                <circle cx="36" cy="36" r="7" fill="#0891b2" fillOpacity="0.7" />
                <circle cx="36" cy="36" r="3" fill="#0891b2" />
                <circle cx="31" cy="32" r="2" fill="white" fillOpacity="0.6" />
              </svg>
              {/* Scan line */}
              <div
                className="sc-scan absolute left-0 right-0 h-0.5 bg-teal-400"
                style={{ top: "50%", boxShadow: "0 0 8px #14b8a6" }}
              />
            </div>
          </div>
          {/* Orbit dots */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-full bg-teal-400"
              style={{
                top: `${50 + 46 * Math.sin(i * 2.094)}%`,
                left: `${50 + 46 * Math.cos(i * 2.094)}%`,
                transform: "translate(-50%, -50%)",
                animation: `sc-spin ${1.8 + i * 0.4}s linear infinite`,
              }}
            />
          ))}
        </div>

        <h2 className="font-display font-black text-xl text-slate-800 mb-1.5 text-center">Analysing sample</h2>
        <p className="text-slate-400 text-sm text-center mb-7">This takes about 10 seconds</p>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #0891b2, #14b8a6)" }}
          />
        </div>
        <div className="text-teal-600 font-display font-black text-2xl mb-7">{progress}%</div>

        {/* Stage checklist */}
        <div className="w-full space-y-3.5">
          {stages.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${i <= stage ? "opacity-100" : "opacity-25"}`}>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  i < stage ? "bg-teal-500" : i === stage ? "sc-spin" : "bg-slate-200"
                }`}
                style={i === stage ? { border: "2px solid #14b8a6", borderTopColor: "transparent" } : {}}
              >
                {i < stage && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${i <= stage ? "text-slate-700 font-semibold" : "text-slate-400"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Screening Result ─────────────────────────────────────────────────

function ScreeningResult({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("eyeCapture")} />
      <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto sc-fade-in">
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Visual screening</div>
          <h2 className="font-display font-black text-2xl text-slate-800">Screening unavailable</h2>
        </div>

        {/* Risk level chip */}
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 mb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4l11 19H3L14 4z" fill="white" fillOpacity="0.9" />
              <path d="M14 12v5M14 19v1.5" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="font-display font-black text-xl text-amber-700">No clinical result generated</div>
            <div className="text-amber-600 text-sm font-semibold">The service did not provide a result you can act on.</div>
          </div>
        </div>

        {/* Eye photo + Grad-CAM */}
        <div className="rounded-2xl overflow-hidden bg-slate-900 mb-2 relative" style={{ height: "185px" }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="100%" height="185" viewBox="0 0 320 185" preserveAspectRatio="xMidYMid meet">
              <ellipse cx="160" cy="92" rx="130" ry="72" fill="#f4d6cc" />
              <ellipse cx="160" cy="92" rx="128" ry="70" fill="#f0c8bc" />
              <circle cx="160" cy="92" r="35" fill="#5b3a2a" />
              <circle cx="160" cy="92" r="27" fill="#3d2518" />
              <circle cx="160" cy="92" r="13" fill="#080303" />
              <circle cx="150" cy="84" r="4.5" fill="white" fillOpacity="0.75" />
              <path d="M32 90 Q85 76 140 91" stroke="#e08070" strokeWidth="1.2" fill="none" opacity="0.65" />
              <path d="M32 95 Q90 110 138 96" stroke="#e08070" strokeWidth="1" fill="none" opacity="0.5" />
              <path d="M280 88 Q240 80 190 90" stroke="#e08070" strokeWidth="1.2" fill="none" opacity="0.55" />
              <path d="M30 92 Q160 32 290 92" stroke="#8b6455" strokeWidth="3" fill="none" />
              <path d="M30 92 Q160 152 290 92" stroke="#8b6455" strokeWidth="3" fill="none" />
            </svg>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-sm font-semibold">
            Inner eyelid (conjunctiva)
          </div>
        </div>

        {/* Explanation */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4">
          <div className="flex items-start gap-2.5">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 mt-0.5">
              <circle cx="10" cy="10" r="9" stroke="#0891b2" strokeWidth="1.5" />
              <path d="M10 9v5M10 7v.5" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <div className="font-bold text-slate-700 text-sm mb-1">What happens next</div>
              <p className="text-slate-600 text-sm leading-relaxed">
                This prototype cannot evaluate your image. It does not diagnose anaemia, recommend treatment, issue a prescription, or decide whether you need emergency care.
              </p>
            </div>
          </div>
        </div>

        <Btn onClick={() => goto("symptomChat")}>Record symptoms for clinician review</Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Symptom Chat ─────────────────────────────────────────────────────

function SymptomChat({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  type Msg = { from: "bot" | "user"; text: string }
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hello Priya 👋 I will ask you a few quick questions about your symptoms. This usually takes 2–3 minutes." },
    { from: "bot", text: "Do you feel tired or have low energy most days?" },
  ])
  const [typing, setTyping] = useState(false)
  const [step, setStep] = useState(0)
  const [voiceActive, setVoiceActive] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const questionSets = [
    ["Yes, most days", "Sometimes", "Rarely"],
    ["Yes, often", "Occasionally", "No"],
    ["Yes", "A little", "No"],
  ]
  const followUps = [
    "Do you feel short of breath when climbing stairs or walking quickly?",
    "Have you noticed any dizziness or headaches recently?",
  ]

  const choose = (ans: string) => {
    setMessages((prev) => [...prev, { from: "user", text: ans }])
    const submittedAnswers = [...answers, ans]
    setAnswers(submittedAnswers)
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      if (step < followUps.length) {
        setMessages((prev) => [...prev, { from: "bot", text: followUps[step] }])
        setStep((p) => p + 1)
      } else {
        void requestTriageAssessment({
          symptom_answers: submittedAnswers,
          visual_screening: { status: "unavailable", quality_passed: false },
        })
          .then(() => {
            setMessages((prev) => [...prev, { from: "bot", text: "Thank you. Your responses are recorded for clinician review." }])
          })
          .catch((error) => {
            const message = error instanceof TriageServiceError
              ? error.message
              : "Symptom collection is unavailable. No triage result was generated."
            setMessages((prev) => [...prev, { from: "bot", text: message }])
          })
          .finally(() => setTimeout(() => goto("triageResult"), 900))
      }
    }, 1200)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typing])

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("screeningResult")} />
      <Progress step={step + 1} total={3} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"} sc-fade-in`}>
              {m.from === "bot" && (
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="#0891b2" fillOpacity="0.25" />
                    <circle cx="8" cy="8" r="3" fill="#0891b2" />
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.from === "bot"
                    ? "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                    : "bg-teal-600 text-white rounded-tr-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#0891b2" fillOpacity="0.25" />
                  <circle cx="8" cy="8" r="3" fill="#0891b2" />
                </svg>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-400 sc-bounce-1" />
                <div className="w-2 h-2 rounded-full bg-slate-400 sc-bounce-2" />
                <div className="w-2 h-2 rounded-full bg-slate-400 sc-bounce-3" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        {!typing && step < questionSets.length && (
          <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs text-slate-400 font-medium">Choose an answer or speak</span>
              <VoiceBtn active={voiceActive} onClick={() => setVoiceActive(!voiceActive)} />
            </div>
            <div className="space-y-2">
              {questionSets[step]?.map((opt) => (
                <button
                  key={opt}
                  onClick={() => choose(opt)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-200 hover:border-teal-400 hover:bg-teal-50/60 rounded-2xl text-left text-slate-700 text-sm font-semibold transition-all min-h-[48px]"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Triage Result ────────────────────────────────────────────────────

function TriageResult({ goto }: { goto: (s: Screen) => void }) {
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col sc-fade-in">
        <div className="bg-slate-700 px-5 py-8 text-white text-center flex-shrink-0">
          <div className="text-5xl mb-3">ℹ️</div>
          <div className="font-display font-black text-3xl mb-1">Clinical review required</div>
          <div className="text-white/80 text-base">No triage result was generated</div>
        </div>

        <div className="flex-1 flex flex-col px-5 py-5 overflow-y-auto">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
            <p className="text-slate-700 text-sm leading-relaxed">The visual model and triage service are not validated for use. This prototype does not determine risk, recommend medication, or contact emergency services.</p>
          </div>

          <div className="mb-5">
            <div className="font-bold text-slate-700 text-sm mb-3">Safe next steps</div>
            <div className="space-y-2.5">
              {["A clinician must assess symptoms and any valid screening result.", "Use locally approved care channels for urgent concerns.", "No prescription or treatment guidance is available from this prototype."].map((step, index) => (
                <div key={step} className="flex items-start gap-3 p-3 rounded-xl border bg-white border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">{index + 1}</div>
                  <span className="text-slate-700 text-sm leading-snug">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <Btn onClick={() => goto("splash")}>Return to home</Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Self-Care Plan ───────────────────────────────────────────────────

function SelfCarePlan({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("triageResult")} />
      <div className="flex-1 flex flex-col px-5 py-4 overflow-y-auto sc-fade-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl">💊</div>
          <div>
            <h2 className="font-display font-black text-xl text-slate-800">Self-Care Plan</h2>
            <p className="text-green-600 text-sm font-semibold">Priya Sharma · 23 Aug 2026</p>
          </div>
        </div>

        {/* Diet */}
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 mb-4">
          <div className="font-bold text-green-800 text-sm mb-3">🥗 Diet recommendations</div>
          <div className="space-y-2.5">
            {[
              ["Leafy greens", "Spinach, methi — 1 cup daily"],
              ["Iron-rich dal", "Masoor, moong — twice daily"],
              ["Citrus fruits", "Amla, orange — aids iron absorption"],
              ["Jaggery (gur)", "2 pieces daily, good iron source"],
            ].map(([item, detail], i) => (
              <div key={i} className="flex justify-between items-start">
                <span className="font-semibold text-green-700 text-sm">{item}</span>
                <span className="text-green-600 text-xs text-right ml-3 leading-tight">{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prescription card */}
        <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-slate-700 text-sm">Suggested supplements</span>
            <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">OTC</span>
          </div>
          {[
            { name: "Ferrous Sulfate", dose: "200 mg", freq: "Once daily with food · 90 days" },
            { name: "Folic Acid", dose: "5 mg", freq: "Once daily · 90 days" },
          ].map((med, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-2 last:mb-0">
              <span className="text-xl">💊</span>
              <div>
                <div className="font-bold text-slate-700 text-sm">{med.name} {med.dose}</div>
                <div className="text-slate-500 text-xs">{med.freq}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-5">
          <div className="flex items-start gap-2">
            <span>⚠️</span>
            <p className="text-amber-700 text-xs leading-relaxed">
              Avoid tea or coffee 1 hour before/after iron tablets. If symptoms worsen, see a doctor immediately.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Btn onClick={() => goto("pharmacy")}>Find Nearest Pharmacy</Btn>
          <Btn variant="secondary" onClick={() => goto("splash")}>Return to Home</Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Nearest Pharmacy ─────────────────────────────────────────────────

function NearestPharmacy({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const pharmacies = [
    { name: "Jan Aushadhi Kendra", dist: "0.4 km", open: true, stock: true, govt: true },
    { name: "Apollo Pharmacy", dist: "0.9 km", open: true, stock: true, govt: false },
    { name: "MedPlus", dist: "1.3 km", open: false, stock: false, govt: false },
  ]
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("selfCare")} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in">
        <h2 className="font-display font-black text-xl text-slate-800 mb-1">Nearest Pharmacy</h2>
        <p className="text-slate-400 text-sm mb-4">Hapur, Uttar Pradesh · Iron supplements in stock</p>

        {/* Map placeholder */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 mb-4" style={{ height: "130px" }}>
          <svg width="100%" height="130" viewBox="0 0 320 130">
            <rect width="320" height="130" fill="#e0f2fe" />
            <line x1="0" y1="65" x2="320" y2="65" stroke="white" strokeWidth="9" />
            <line x1="160" y1="0" x2="160" y2="130" stroke="white" strokeWidth="7" />
            <line x1="0" y1="32" x2="320" y2="37" stroke="white" strokeWidth="4" opacity="0.7" />
            <line x1="80" y1="0" x2="80" y2="130" stroke="white" strokeWidth="4" opacity="0.7" />
            <rect x="30" y="40" width="25" height="18" rx="3" fill="#bae6fd" />
            <rect x="110" y="20" width="20" height="28" rx="3" fill="#bae6fd" />
            <rect x="200" y="35" width="30" height="22" rx="3" fill="#bae6fd" />
            {/* Markers */}
            <circle cx="55" cy="68" r="10" fill="#16a34a" />
            <text x="55" y="72" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">J</text>
            <circle cx="155" cy="48" r="10" fill="#0891b2" />
            <text x="155" y="52" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">A</text>
            <circle cx="235" cy="80" r="10" fill="#94a3b8" />
            <text x="235" y="84" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">M</text>
            {/* Current loc */}
            <circle cx="145" cy="80" r="8" fill="#0891b2" fillOpacity="0.2" />
            <circle cx="145" cy="80" r="4" fill="#0891b2" />
            <circle cx="145" cy="80" r="2" fill="white" />
          </svg>
        </div>

        <div className="space-y-3 flex-1">
          {pharmacies.map((p, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white border-2 border-slate-200 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${p.govt ? "bg-orange-100" : "bg-slate-100"}`}>
                {p.govt ? "🏛️" : "💊"}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                <div className="text-slate-400 text-xs mt-0.5">{p.dist} away</div>
                <div className="flex gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.open ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {p.open ? "Open now" : "Closed"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.stock ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-600"}`}>
                    {p.stock ? "In stock" : "Out of stock"}
                  </span>
                </div>
              </div>
              <button className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3l6 6-6 6M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <Btn className="mt-4" onClick={() => goto("visitSavedGreen")}>Done</Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Connecting to Doctor ────────────────────────────────────────────

function ConnectingDoctor({ goto }: { goto: (s: Screen) => void }) {
  const [dots, setDots] = useState(0)
  useEffect(() => {
    const dt = setInterval(() => setDots((d) => (d + 1) % 4), 550)
    const tt = setTimeout(() => goto("teleconsult"), 4200)
    return () => { clearInterval(dt); clearTimeout(tt) }
  }, [goto])

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sc-fade-in">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-amber-100 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="10" width="40" height="28" rx="4" stroke="#d97706" strokeWidth="2.5" fill="none" />
              <circle cx="24" cy="24" r="8" fill="#d97706" fillOpacity="0.18" stroke="#d97706" strokeWidth="2" />
              <circle cx="24" cy="24" r="3.5" fill="#d97706" />
            </svg>
          </div>
          <div className="sc-ping absolute inset-0 rounded-3xl border-2 border-amber-400 opacity-40" />
          <div className="absolute inset-0 rounded-3xl border-2 border-amber-300 opacity-20 sc-pulse-ring" />
        </div>

        <h2 className="font-display font-black text-2xl text-slate-800 mb-2 text-center">Connecting to a doctor</h2>
        <p className="text-slate-400 text-sm text-center mb-8">
          Finding an available doctor{".".repeat(dots)}
        </p>

        <div className="w-full space-y-3">
          {["Dr. Anjali Verma", "Dr. Suresh Kumar"].map((doc, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-xl">{i === 0 ? "👩‍⚕️" : "👨‍⚕️"}</div>
              <div className="flex-1 space-y-2">
                <SkeletonLine w={i === 0 ? "3/4" : "2/3"} />
                <SkeletonLine w={i === 0 ? "1/2" : "2/5"} />
              </div>
              <div className={`w-3 h-3 rounded-full ${i === 0 ? "bg-teal-400 animate-pulse" : "bg-slate-200"}`} />
            </div>
          ))}
        </div>

        <button onClick={() => goto("bookAppointment")} className="mt-7 text-sm text-slate-400 hover:text-teal-600 transition-colors">
          No doctors available? Book appointment →
        </button>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Teleconsult ──────────────────────────────────────────────────────

function TeleconsultScreen({ goto }: { goto: (s: Screen) => void }) {
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="min-h-screen flex items-start justify-center py-6 px-4" style={{ background: "#dff0f5" }}>
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" style={{ minHeight: "780px" }}>
        <div className="flex flex-col bg-slate-900" style={{ height: "780px" }}>
          {/* Doctor feed */}
          <div className="flex-1 bg-gradient-to-b from-slate-800 to-slate-900 relative flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-teal-900/60 flex items-center justify-center text-5xl mx-auto mb-3">👩‍⚕️</div>
              <div className="text-white/70 text-sm font-semibold">Dr. Anjali Verma</div>
              <div className="text-teal-400 text-xs">MBBS, MD · General Physician</div>
            </div>

            {/* Timer */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/55 text-white text-sm px-4 py-1.5 rounded-full font-mono backdrop-blur-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {fmt(elapsed)}
            </div>

            {/* Self preview */}
            <div className="absolute bottom-4 right-4 w-24 h-32 rounded-xl bg-slate-700 border-2 border-white/20 overflow-hidden flex items-center justify-center">
              {camOff ? (
                <span className="text-slate-500 text-[11px] text-center px-1">Camera off</span>
              ) : (
                <span className="text-3xl">👩</span>
              )}
            </div>

            {/* Context sidebar */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-xl p-3 max-w-[160px]">
              <div className="text-white/50 text-[9px] uppercase tracking-wider mb-1 font-bold">Patient context</div>
              <div className="text-white text-xs font-bold mb-0.5">Priya Sharma, 34F</div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300 text-[10px] font-semibold">Moderate risk</span>
              </div>
              <div className="text-white/45 text-[10px] leading-tight">Last visit: 12 Aug<br />Ayushman ✓</div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-slate-950 px-6 py-5 flex items-center justify-around flex-shrink-0">
            <button
              onClick={() => setMuted(!muted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="7" y="1" width="8" height="12" rx="4" fill={muted ? "rgba(255,255,255,0.4)" : "white"} />
                {muted && <line x1="3" y1="3" x2="19" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />}
                <path d="M3 10c0 4.418 3.582 8 8 8s8-3.582 8-8" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <line x1="11" y1="18" x2="11" y2="21" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            {/* End call */}
            <button
              onClick={() => goto("prescriptionReceived")}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg shadow-red-900/40"
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                <path d="M3 13c0-2 1.5-3.5 4-4.5C9.5 7.5 11 7 13 7s3.5.5 6 1.5C21.5 9.5 23 11 23 13c0 .8-.4 1.4-.8 1.8l-3 2.2c-.6.4-1.4.2-1.9-.3l-1.5-1.5c-.4-.4-.4-1 0-1.4l.8-.8c-1-.4-2-.6-3.6-.6s-2.6.2-3.6.6l.8.8c.4.4.4 1 0 1.4l-1.5 1.5c-.5.5-1.3.7-1.9.3L3.8 14.8C3.4 14.4 3 13.8 3 13z" fill="white" />
              </svg>
            </button>

            <button
              onClick={() => setCamOff(!camOff)}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${camOff ? "bg-red-600" : "bg-slate-700 hover:bg-slate-600"}`}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="1" y="5" width="14" height="12" rx="2" fill={camOff ? "rgba(255,255,255,0.4)" : "white"} />
                <path d="M15 9l6-3v10l-6-3V9z" fill={camOff ? "rgba(255,255,255,0.4)" : "white"} />
                {camOff && <line x1="3" y1="3" x2="19" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SCREEN: Book Appointment ─────────────────────────────────────────────────

function BookAppointment({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  const [selDate, setSelDate] = useState<number | null>(null)
  const [selSlot, setSelSlot] = useState<string | null>(null)
  const days = ["Mon 24", "Tue 25", "Wed 26", "Thu 27", "Fri 28"]
  const slots = ["9:00 AM", "10:30 AM", "2:00 PM", "4:30 PM", "6:00 PM"]
  const unavailable = [1]

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("connectingDoctor")} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in">
        <h2 className="font-display font-black text-xl text-slate-800 mb-1">Book appointment</h2>
        <p className="text-slate-400 text-sm mb-6">Dr. Anjali Verma · Video consultation</p>

        <div className="mb-6">
          <div className="font-bold text-slate-600 text-sm mb-3">Select date</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelDate(i)}
                className={`flex-shrink-0 px-4 py-3 rounded-2xl text-sm font-bold transition-all min-w-[72px] ${
                  selDate === i ? "bg-teal-600 text-white shadow-md shadow-teal-100" : "bg-white border-2 border-slate-200 text-slate-700 hover:border-teal-300"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="font-bold text-slate-600 text-sm mb-3">Select time</div>
          <div className="grid grid-cols-3 gap-2">
            {slots.map((s, i) => (
              <button
                key={i}
                onClick={() => !unavailable.includes(i) && setSelSlot(s)}
                disabled={unavailable.includes(i)}
                className={`py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  selSlot === s
                    ? "bg-teal-600 text-white"
                    : unavailable.includes(i)
                    ? "bg-slate-100 text-slate-300 line-through cursor-not-allowed"
                    : "bg-white border-2 border-slate-200 text-slate-700 hover:border-teal-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Btn className="mt-5" onClick={() => goto("visitSavedYellow")} disabled={selDate === null || !selSlot}>
          Confirm Appointment
        </Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Prescription Received ───────────────────────────────────────────

function PrescriptionReceived({ goto, lang }: { goto: (s: Screen) => void; lang: string }) {
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-2xl">📋</div>
          <div>
            <h2 className="font-display font-black text-xl text-slate-800">Prescription received</h2>
            <p className="text-teal-600 text-sm font-semibold">From Dr. Anjali Verma</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-slate-200 mb-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <div className="font-display font-black text-slate-800">Priya Sharma</div>
              <div className="text-slate-400 text-xs font-mono">23 Aug 2026 · Ref: SC-2847</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-xl">🏥</div>
          </div>

          {[
            { name: "Ferrous Sulfate", dose: "200 mg", note: "Once daily after food · 90 days" },
            { name: "Folic Acid", dose: "5 mg", note: "Once daily · 90 days" },
            { name: "Vitamin C", dose: "500 mg", note: "With iron tablet · 90 days" },
          ].map((m, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 text-base">💊</div>
              <div>
                <div className="font-bold text-slate-700 text-sm">{m.name} {m.dose}</div>
                <div className="text-slate-400 text-xs">{m.note}</div>
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-blue-700 text-xs font-semibold leading-relaxed">
              Follow-up blood test (CBC) in 4 weeks. Return if symptoms worsen or no improvement in 2 weeks.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Btn onClick={() => goto("pharmacy")}>Find Pharmacy</Btn>
          <Btn variant="secondary" onClick={() => goto("visitSavedYellow")}>Download PDF</Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Visit Saved ──────────────────────────────────────────────────────

function VisitSaved({ goto, variant }: { goto: (s: Screen) => void; variant: "green" | "yellow" }) {
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center sc-fade-in">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 text-5xl ${variant === "green" ? "bg-green-100" : "bg-teal-100"}`}>
          {variant === "green" ? "✅" : "📋"}
        </div>
        <h2 className="font-display font-black text-2xl text-slate-800 mb-3">
          {variant === "green" ? "Visit saved" : "Appointment confirmed"}
        </h2>
        <p className="text-slate-500 text-base leading-relaxed mb-2 max-w-xs mx-auto">
          {variant === "green"
            ? "Your self-care plan has been saved to your ABHA health profile."
            : "Your consultation record has been saved and sent to your ABHA profile."}
        </p>
        <p className={`text-sm font-semibold mb-10 ${variant === "green" ? "text-green-600" : "text-teal-600"}`}>
          {variant === "green" ? "📅 4-week follow-up reminder set" : "💬 Prescription sent to +91 98765 43XXX"}
        </p>
        <div className="w-full space-y-3">
          <Btn onClick={() => goto("splash")}>Return to Home</Btn>
          <Btn variant="secondary" onClick={() => goto("splash")}>View Health Profile</Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Emergency Alert ──────────────────────────────────────────────────

function EmergencyAlert({ goto }: { goto: (s: Screen) => void }) {
  return (
    <MobileShell noPadding>
      <div className="flex-1 flex flex-col bg-red-600" style={{ minHeight: "780px" }}>
        {/* Main */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-10">
          <div className="relative mb-7">
            <div className="w-28 h-28 rounded-3xl bg-white/20 flex items-center justify-center">
              <span className="text-6xl">🚨</span>
            </div>
            <div className="sc-ping absolute inset-0 rounded-3xl border-3 border-white opacity-50" style={{ borderWidth: "3px" }} />
          </div>

          <h1 className="font-display font-black text-4xl text-white mb-3">Emergency action unavailable</h1>
          <p className="text-red-100 text-base leading-relaxed mb-7 max-w-xs">
            This prototype does not assess emergencies, contact services, share your location, or notify anyone.
          </p>

          <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm px-5 py-3 rounded-2xl">
            <div className="w-4 h-4 rounded-full bg-white/70 flex-shrink-0" />
            <span className="text-white font-bold">No emergency action was taken</span>
          </div>
        </div>

        {/* Info */}
        <div className="bg-red-700 px-5 py-5 space-y-3.5">
          {[
            { icon: "📍", label: "Location", val: "Not accessed or shared" },
            { icon: "📋", label: "Health record", val: "Not sent" },
            { icon: "📞", label: "Contacts", val: "Not notified" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-red-200 text-xs font-semibold">{item.label}</div>
                <div className="text-white text-sm font-bold">{item.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-red-800 px-5 pb-6 pt-4 space-y-3">
          <button onClick={() => goto("splash")} className="w-full text-red-200/70 text-sm text-center py-2 hover:text-white transition-colors">
            Return to app
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN: Doctor Dashboard (full desktop) ──────────────────────────────────

function DoctorDashboard({ goto }: { goto: (s: Screen) => void }) {
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="text-5xl mb-5">🔒</div>
        <h2 className="font-display font-black text-2xl text-slate-800 mb-3">Clinician workflow unavailable</h2>
        <p className="text-slate-600 text-sm leading-relaxed max-w-xs mb-7">
          Authentication, consented patient records, audit logging, and clinician approval are required before a dashboard can show cases or record decisions.
        </p>
        <Btn onClick={() => goto("splash")}>Return to home</Btn>
      </div>
    </MobileShell>
  )

  type DemoCase = {
    id: string; name: string; age: string; loc: string; risk: string; wait: string; eligible: boolean; abha: string
    symptoms: string[]; history: Array<{ d: string; e: string; doc: string }>
  }
  const [selIdx, setSelIdx] = useState<number | null>(0)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [rxNotes, setRxNotes] = useState("")
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue")

  const cases: DemoCase[] = [
    { id: "SC-2851", name: "Ramesh Yadav", age: "58M", loc: "Ghaziabad, UP", risk: "red", wait: "2 min", eligible: true, abha: "12-7891-2345-6789", symptoms: ["Severe fatigue", "Dizziness", "Chest pain on exertion"], history: [{ d: "10 Aug", e: "Anaemia screen — Red", doc: "Dr. Gupta" }, { d: "2 May", e: "Cardiac OPD", doc: "AIIMS Okhla" }] },
    { id: "SC-2847", name: "Priya Sharma", age: "34F", loc: "Hapur, UP", risk: "amber", wait: "8 min", eligible: true, abha: "12-3456-7890-1234", symptoms: ["Fatigue", "Pallor on exertion", "Shortness of breath"], history: [{ d: "12 Aug", e: "Anaemia screen — Yellow", doc: "Dr. Verma" }, { d: "3 Jun", e: "Follow-up — Green", doc: "Dr. Singh" }] },
    { id: "SC-2849", name: "Sunita Bai", age: "26F", loc: "Bulandshahr, UP", risk: "amber", wait: "15 min", eligible: false, abha: "12-5678-9012-3456", symptoms: ["Pallor", "Weakness", "Poor appetite"], history: [{ d: "5 Jul", e: "Anaemia screen — Yellow", doc: "PHC Bulandshahr" }] },
    { id: "SC-2846", name: "Arjun Singh", age: "45M", loc: "Meerut, UP", risk: "green", wait: "22 min", eligible: true, abha: "12-9012-3456-7890", symptoms: ["Mild fatigue", "Occasional headaches"], history: [{ d: "18 Aug", e: "Routine check — Green", doc: "Dr. Kumar" }] },
  ]

  const riskBadge = (r: string) =>
    r === "red"
      ? "bg-red-50 text-red-700 border-red-200"
      : r === "amber"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-green-50 text-green-700 border-green-200"

  const riskDot = (r: string) => (r === "red" ? "bg-red-500" : r === "amber" ? "bg-amber-500" : "bg-green-500")
  const riskLabel = (r: string) => (r === "red" ? "High Risk" : r === "amber" ? "Moderate" : "Low Risk")
  const sel = cases[selIdx ?? 0]

  return (
    <div className="min-h-screen bg-[#dff0f5] font-body flex flex-col">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-5 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <AppLogo size="sm" />
          <span className="font-display font-black text-teal-700">SwasthyaConnect</span>
          <span className="text-slate-200 mx-1">|</span>
          <span className="text-slate-600 text-sm font-semibold">Doctor Console</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3.5 py-1.5 rounded-full text-sm font-semibold">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Online · {cases.length} cases
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-lg">👩‍⚕️</div>
            <span className="text-sm font-semibold text-slate-700">Dr. Anjali Verma</span>
          </div>
          <button
            onClick={() => goto("splash")}
            className="text-slate-400 text-sm hover:text-teal-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors font-medium"
          >
            ← Patient App
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Case queue sidebar */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col flex-shrink-0" style={{ height: "calc(100vh - 57px)" }}>
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">Case Queue</div>
            <div className="flex gap-2">
              {["All", "Urgent", "Yellow"].map((f, i) => (
                <button
                  key={i}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${i === 0 ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {cases.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelIdx(i)}
                className={`w-full text-left px-4 py-4 border-b border-slate-100 hover:bg-teal-50/60 transition-colors ${
                  selIdx === i ? "bg-teal-50 border-l-4 border-l-teal-500 pl-3.5" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${riskBadge(c.risk)}`}>{riskLabel(c.risk)}</span>
                </div>
                <div className="text-slate-400 text-xs mb-1.5">
                  {c.age} · {c.loc}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${riskDot(c.risk)} animate-pulse`} />
                  <span className="text-slate-500 text-xs font-semibold">Waiting {c.wait}</span>
                  <span className="text-slate-200">·</span>
                  <span className="text-slate-400 text-xs">{c.id}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main detail pane */}
        <main className="flex-1 overflow-y-auto p-6">
          {sel ? (
            <div className="sc-fade-in">
              {/* Patient header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <h2 className="font-display font-black text-2xl text-slate-800">{sel.name}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-black border ${riskBadge(sel.risk)}`}>{riskLabel(sel.risk)}</span>
                    {sel.eligible && (
                      <span className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full text-xs font-bold">
                        🛡️ Ayushman Bharat ✓
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-sm font-mono">{sel.age} · {sel.loc} · ABHA: {sel.abha}</div>
                </div>
                <button
                  onClick={() => goto("teleconsult")}
                  className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors shadow-md shadow-teal-100"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="4" width="10" height="8" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
                    <path d="M11 7l4-2v6l-4-2V7z" fill="white" />
                  </svg>
                  Start Teleconsult
                </button>
              </div>

              {/* 3-column grid */}
              <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                {/* Eye scan */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-sm">Eye Scan</span>
                    <button
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${showHeatmap ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {showHeatmap ? "🔥 Heatmap" : "AI focus"}
                    </button>
                  </div>
                  <div className="bg-slate-900 relative" style={{ height: "175px" }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="100%" height="175" viewBox="0 0 240 175">
                        <ellipse cx="120" cy="87" rx="100" ry="60" fill="#f0c8bc" />
                        <circle cx="120" cy="87" r="30" fill="#5b3a2a" />
                        <circle cx="120" cy="87" r="22" fill="#3d2518" />
                        <circle cx="120" cy="87" r="10" fill="#0a0505" />
                        <circle cx="112" cy="80" r="3.5" fill="white" fillOpacity="0.75" />
                        <path d="M22 86 Q70 74 108 88" stroke="#e08070" strokeWidth="1" fill="none" opacity="0.6" />
                        <path d="M218 84 Q180 76 140 88" stroke="#e08070" strokeWidth="1" fill="none" opacity="0.55" />
                        <path d="M20 87 Q120 32 220 87" stroke="#8b6455" strokeWidth="2.5" fill="none" />
                        <path d="M20 87 Q120 142 220 87" stroke="#8b6455" strokeWidth="2.5" fill="none" />
                      </svg>
                    </div>
                    {showHeatmap && (
                      <div className="absolute inset-0" style={{ mixBlendMode: "screen" }}>
                        <svg width="100%" height="175" viewBox="0 0 240 175">
                          <defs>
                            <radialGradient id="dhm-a" cx="28%" cy="52%">
                              <stop offset="0%" stopColor="#ff1a00" stopOpacity="0.88" />
                              <stop offset="55%" stopColor="#ff6600" stopOpacity="0.42" />
                              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="dhm-b" cx="72%" cy="48%">
                              <stop offset="0%" stopColor="#ff2200" stopOpacity="0.72" />
                              <stop offset="55%" stopColor="#ffaa00" stopOpacity="0.38" />
                              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                            </radialGradient>
                          </defs>
                          <ellipse cx="67" cy="90" rx="55" ry="38" fill="url(#dhm-a)" />
                          <ellipse cx="173" cy="83" rx="50" ry="35" fill="url(#dhm-b)" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>AI confidence: <strong className="text-slate-700">78%</strong></span>
                      <span className={`font-bold ${riskBadge(sel.risk).split(" ")[1]}`}>{riskLabel(sel.risk)}</span>
                    </div>
                    {showHeatmap && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Less</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: "linear-gradient(to right,#3b82f6,#22c55e,#eab308,#f97316,#ef4444)" }} />
                        <span className="text-[10px] text-slate-400">More</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Symptoms + history */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="font-bold text-slate-700 text-sm mb-3">Symptom summary</div>
                    <div className="space-y-2">
                      {sel.symptoms.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="font-bold text-slate-700 text-sm mb-3">ABHA-linked history</div>
                    <div className="space-y-2.5">
                      {sel.history.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-slate-400 w-12 flex-shrink-0 font-mono">{h.d}</span>
                          <div>
                            <div className="text-slate-600 font-semibold">{h.e}</div>
                            <div className="text-slate-400">{h.doc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span>🛡️</span>
                      <span className="font-bold text-orange-800 text-sm">Ayushman Bharat PM-JAY</span>
                    </div>
                    <p className="text-orange-700 text-xs leading-relaxed">
                      {sel.eligible ? "✓ Eligible · Coverage up to ₹5 lakh · Family ID: UP-7842" : "✗ Not eligible for this scheme"}
                    </p>
                  </div>
                </div>

                {/* Prescription panel */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                  <div className="font-bold text-slate-700 text-sm mb-4">Write prescription</div>
                  <div className="space-y-2.5 mb-4">
                    {[
                      { name: "Ferrous Sulfate 200 mg", freq: "Once daily after food · 90 days" },
                      { name: "Folic Acid 5 mg", freq: "Once daily · 90 days" },
                    ].map((m, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
                        <span className="text-base flex-shrink-0">💊</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-700 truncate">{m.name}</div>
                          <div className="text-xs text-slate-500">{m.freq}</div>
                        </div>
                        <button className="text-slate-400 hover:text-red-500 flex-shrink-0 font-bold">×</button>
                      </div>
                    ))}
                  </div>
                  <textarea
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                    placeholder="Add notes, instructions, or additional medicines…"
                    className="flex-1 w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-teal-300 resize-none min-h-[80px]"
                  />
                  <div className="mt-3 space-y-2">
                    <button className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-teal-700 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                        <path d="M2 14l4-1 8-8-3-3-8 8-1 4zM11 3l2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Send prescription
                    </button>
                    <button className="w-full text-slate-500 text-sm py-2 hover:text-slate-700 transition-colors font-medium">
                      Schedule follow-up →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="text-6xl mb-4">👆</div>
                <div className="font-display font-black text-xl text-slate-700 mb-2">Select a case</div>
                <div className="text-slate-400 text-sm max-w-xs">Choose a patient from the queue to review their details and write a prescription.</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ─── App Router ───────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash")
  const [lang, setLang] = useState("EN")
  const goto = (s: Screen) => setScreen(s)

  // Full-page surfaces
  if (screen === "doctorDashboard") return <DoctorDashboard goto={goto} />
  if (screen === "teleconsult") return <TeleconsultScreen goto={goto} />
  if (screen === "eyeCapture") return <EyeCapture goto={goto} />

  return (
    <>
      {screen === "splash" && <SplashScreen goto={goto} />}
      {screen === "language" && <LanguageScreen goto={goto} setLanguage={setLang} />}
      {screen === "whoCares" && <WhoCares goto={goto} lang={lang} />}
      {screen === "selectMember" && <SelectMember goto={goto} lang={lang} />}
      {screen === "phone" && <PhoneEntry goto={goto} lang={lang} />}
      {screen === "createProfile" && <CreateProfile goto={goto} lang={lang} />}
      {screen === "fetchingProfile" && <FetchingProfile goto={goto} />}
      {screen === "profileSummary" && <ProfileSummary goto={goto} lang={lang} />}
      {screen === "abha" && <AbhaScreen goto={goto} lang={lang} />}
      {screen === "consent" && <ConsentScreen goto={goto} lang={lang} />}
      {screen === "fetchingRecords" && <FetchingRecords goto={goto} />}
      {screen === "eligibility" && <EligibilityResult goto={goto} lang={lang} />}
      {screen === "screeningResult" && <ScreeningResult goto={goto} lang={lang} />}
      {screen === "symptomChat" && <SymptomChat goto={goto} lang={lang} />}
      {screen === "triageResult" && <TriageResult goto={goto} />}
    </>
  )
}
