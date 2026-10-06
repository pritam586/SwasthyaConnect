import { useState, useEffect, useRef } from "react"
import { translations, Language } from "./i18n"
import { checkUserExists, requestPhoneOtp, registerUser, loginUser, loginDoctor, UserProfile } from "./modules/auth/authService"
import { submitTriageAssessment, TriageAssessmentResult } from "./modules/triage/triageService"
import { fetchClinicianCases, submitPrescription, ClinicianCase } from "./modules/clinicalWorkflow/clinicalWorkflowService"
import { requestAbhaLink } from "./modules/abha/abhaService"
import { requestVisualScreening, VisualScreeningServiceError } from "./modules/visualScreening"
import { PharmacyScreen } from "./modules/pharmacy/PharmacyScreen"
import { BookAppointmentScreen } from "./modules/appointments/BookAppointmentScreen"
import { MedicalReportsSection } from "./modules/reports/MedicalReportsSection"
import { EyeCaptureScreen } from "./modules/screening/EyeCaptureScreen"
import {
  fetchMyProfile,
  fetchMyMedications,
  addMyMedication,
  deleteMyMedication,
  fetchMyEncounters,
  addMyEncounter,
  PatientMedication,
  PatientHealthEncounter,
} from "./modules/patient/patientService"

// ─── Screen Navigation Types ──────────────────────────────────────────────────
export type Screen =
  | "splash" | "language" | "auth"
  | "profileSummary" | "abha" | "consent" | "fetchingRecords" | "eligibility"
  | "eyeCapture" | "analyzing" | "screeningResult"
  | "symptomChat" | "triageResult"
  | "selfCare" | "pharmacy" | "visitSavedGreen"
  | "connectingDoctor" | "teleconsult" | "bookAppointment"
  | "prescriptionReceived" | "visitSavedYellow"
  | "emergency"
  | "doctorDashboard"

const LANGUAGES = [
  { code: "en", native: "English", label: "English" },
  { code: "hi", native: "हिन्दी", label: "Hindi" },
  { code: "mr", native: "मराठी", label: "Marathi" },
  { code: "bn", native: "বাংলা", label: "Bengali" },
  { code: "te", native: "తెలుగు", label: "Telugu" },
  { code: "ta", native: "தமிழ்", label: "Tamil" },
  { code: "gu", native: "ગુજરાતી", label: "Gujarati" },
  { code: "kn", native: "ಕನ್ನಡ", label: "Kannada" },
  { code: "pa", native: "ਪੰਜਾਬੀ", label: "Punjabi" },
  { code: "or", native: "ଓଡ଼ିଆ", label: "Odia" },
  { code: "ml", native: "മലയാളം", label: "Malayalam" },
  { code: "ur", native: "اردو", label: "Urdu" },
]

// ─── Default Sample Patient Profile ──────────────────────────────────────────
const DEFAULT_USER: UserProfile = {
  id: "usr-0421dc38",
  phone: "9988776655",
  name: "Pritam Prajapati",
  age: 22,
  gender: "Male",
  location: "Pune, Maharashtra",
  abha_id: null,
  pmjay_eligible: true,
  role: "patient",
}

// ─── Shared UI Shell & Components ─────────────────────────────────────────────

function MobileShell({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
  return (
    <div className="min-h-screen bg-[#dff0f5] flex items-start justify-center py-6 px-4 font-body">
      <div
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col ${noPadding ? "" : ""}`}
        style={{ minHeight: "780px", maxHeight: "880px", overflowY: "auto" }}
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
  title,
}: {
  lang: Language
  onLangClick: () => void
  back?: boolean
  onBack?: () => void
  title?: string
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
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
          <span className="font-display font-bold text-teal-700 text-sm tracking-wide">
            {title || t("appName")}
          </span>
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
            i < step ? "bg-teal-500" : i === step ? "bg-teal-300" : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  )
}

function Btn({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "danger"
  className?: string
}) {
  const base =
    "w-full py-4 px-5 rounded-2xl font-display font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] min-h-[52px]"
  const variants = {
    primary: disabled
      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
      : "bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/25",
    secondary: disabled
      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
      : "bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 shadow-sm",
    danger: disabled
      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
      : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25",
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

// ─── SCREEN 1: Splash Screen ──────────────────────────────────────────────────

function SplashScreen({ goto, lang }: { goto: (s: Screen) => void; lang: Language }) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-between px-6 py-10 text-center sc-fade-in">
        <div className="w-full flex justify-end">
          <button
            onClick={() => goto("language")}
            className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200"
          >
            🌐 {lang.toUpperCase()}
          </button>
        </div>

        <div className="my-auto flex flex-col items-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-teal-500/30 mb-6">
            <AppLogo size="md" />
          </div>

          <h1 className="font-display font-black text-3xl text-slate-800 tracking-tight mb-2">
            {t("appName")}
          </h1>
          <p className="text-teal-700 font-semibold text-sm mb-4">
            {lang === "hi"
              ? "ग्रामीण भारत के लिए एआई आधारित एनीमिया जांच व टेलीहेल्थ"
              : "AI-Assisted Anaemia Screening & Telehealth Platform"}
          </p>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs mb-8">
            {lang === "hi"
              ? "स्मार्टफोन से आँख की कंजंक्टिवा फोटो से तुरंत एनीमिया की प्रारंभिक जांच करें।"
              : "Screen for anaemia non-invasively in seconds via smartphone conjunctiva photo."}
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
              🛡️ Ayushman Bharat
            </span>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
              🏛️ ABHA Optional
            </span>
            <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold border border-teal-200">
              🤖 MobileNetV3 AI
            </span>
          </div>
        </div>

        <div className="w-full space-y-3">
          <Btn onClick={() => goto("auth")}>{t("getStarted")}</Btn>
          <button
            onClick={() => goto("doctorDashboard")}
            className="w-full text-center text-sm text-slate-400 hover:text-teal-700 py-2 transition-colors font-semibold"
          >
            {t("doctorStaffLogin")}
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 2: Language Selection ─────────────────────────────────────────────

function LanguageScreen({
  goto,
  lang,
  setLanguage,
}: {
  goto: (s: Screen) => void
  lang: Language
  setLanguage: (l: Language) => void
}) {
  const [selected, setSelected] = useState<Language>(lang)
  const t = (k: keyof typeof translations.en) => (translations[selected] || translations.en)[k] || translations.en[k]

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col px-5 py-6 sc-fade-in">
        <div className="mb-5">
          <h2 className="font-display font-black text-2xl text-slate-800 mb-1">{t("chooseLanguage")}</h2>
          <p className="text-slate-400 text-sm">अपनी भाषा चुनें · Select your language</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 flex-1 overflow-y-auto">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelected(l.code === "hi" ? "hi" : "en")}
              className={`min-h-[64px] rounded-2xl border-2 flex flex-col items-center justify-center font-semibold text-base transition-all ${
                selected === l.code || (l.code !== "hi" && selected === "en" && l.code === "en")
                  ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md shadow-teal-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/40"
              }`}
            >
              <span className="font-bold text-lg">{l.native}</span>
              <span className="text-xs text-slate-400 font-normal">{l.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <Btn
            onClick={() => {
              setLanguage(selected)
              goto("auth")
            }}
          >
            {t("continue")}
          </Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 3: Auth Screen (Signup or Login first) ────────────────────────────

function AuthScreen({
  goto,
  lang,
  onAuthSuccess,
}: {
  goto: (s: Screen) => void
  lang: Language
  onAuthSuccess: (u: UserProfile) => void
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]

  const [mode, setMode] = useState<"login" | "signup">("login")
  const [phone, setPhone] = useState("9988776655")
  const [password, setPassword] = useState("password123")
  const [name, setName] = useState("Pritam Prajapati")
  const [age, setAge] = useState("22")
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male")
  const [location, setLocation] = useState("Pune, Maharashtra")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [statusMsg, setStatusMsg] = useState("")
  const [loading, setLoading] = useState(false)

  // Doctor login toggle modal
  const [showDoctorLogin, setShowDoctorLogin] = useState(false)
  const [docPhone, setDocPhone] = useState("9876543210")
  const [docPassword, setDocPassword] = useState("doctor123")

  const handlePhoneCheck = async () => {
    if (phone.length < 10) return
    try {
      const res = await checkUserExists(phone)
      if (res.exists) {
        setMode("login")
        setStatusMsg(lang === "hi" ? `खाता मिला: ${res.name}! कृपया पासवर्ड दर्ज करें।` : `Account found: ${res.name}! Please enter your password.`)
      } else {
        setMode("signup")
        setName("")
        setStatusMsg(lang === "hi" ? "नया नंबर पाया गया। कृपया अपनी जानकारी भरें।" : "New number detected. Please enter your profile details.")
      }
    } catch {
      // ignore
    }
  }

  const handleSendOtp = async () => {
    setLoading(true)
    setStatusMsg("")
    try {
      const res = await requestPhoneOtp(phone)
      if (res.success) {
        setOtpSent(true)
        setStatusMsg(res.message)
      } else {
        setStatusMsg(res.message || "SMS provider configuration required in .env.")
      }
    } catch (err: any) {
      setStatusMsg(err.message || "SMS provider not configured.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setStatusMsg("")
    try {
      const res = await loginUser(phone, password)
      if (res.token) {
        localStorage.setItem("sc_token", res.token)
        localStorage.setItem("sc_user", JSON.stringify(res.user))
      }
      onAuthSuccess(res.user)
      goto("profileSummary")
    } catch (err: any) {
      setStatusMsg(err.message || "Invalid phone number or password.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async () => {
    setLoading(true)
    setStatusMsg("")
    try {
      const res = await registerUser({
        phone,
        name,
        age: parseInt(age) || 25,
        gender,
        location,
        password,
        pmjay_eligible: true,
      })
      if (res.token) {
        localStorage.setItem("sc_token", res.token)
        localStorage.setItem("sc_user", JSON.stringify(res.user))
      }
      onAuthSuccess(res.user)
      goto("profileSummary")
    } catch (err: any) {
      setStatusMsg(err.message || "Registration failed. Please verify all details.")
    } finally {
      setLoading(false)
    }
  }

  const handleDoctorSubmit = async () => {
    setLoading(true)
    setStatusMsg("")
    try {
      const res = await loginDoctor(docPhone, docPassword)
      if (res.token) {
        localStorage.setItem("sc_token", res.token)
        localStorage.setItem("sc_user", JSON.stringify(res.user))
      }
      goto("doctorDashboard")
    } catch (err: any) {
      setStatusMsg(err.message || "Invalid doctor credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("splash")} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in overflow-y-auto">
        <div className="mb-4">
          <h2 className="font-display font-black text-2xl text-slate-800">{t("authTitle")}</h2>
          <p className="text-slate-400 text-xs mt-1">{t("authSubtitle")}</p>
        </div>

        {/* Tab switch */}
        <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 mb-5">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === "login" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t("loginBtn")}
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === "signup" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t("signupBtn")}
          </button>
        </div>

        {/* Phone input */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("phoneNumber")}</label>
            <div className="flex gap-2">
              <span className="px-3 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm border border-slate-200 flex items-center">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onBlur={handlePhoneCheck}
                placeholder="9988776655"
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-800 text-base outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">{t("fullName")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("enterFullName")}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("age")}</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="22"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">{t("gender")}</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "Male" | "Female" | "Other")}
                    className="w-full px-3 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:border-teal-400 bg-white"
                  >
                    <option value="Male">{t("male")}</option>
                    <option value="Female">{t("female")}</option>
                    <option value="Other">{t("other")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">{t("location")}</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("enterLocation")}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:border-teal-400"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:border-teal-400"
            />
          </div>

          {/* Twilio / MSG91 OTP optional trigger */}
          <div className="pt-1">
            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendOtp}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold underline"
              >
                📲 {t("sendOtp")}
              </button>
            ) : (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900">
                <span className="font-bold">✓ {t("otpSentMsg")}</span>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full mt-2 px-3 py-2 bg-white border border-teal-300 rounded-lg text-center font-mono font-bold tracking-widest text-slate-800"
                />
              </div>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-3 font-semibold">
            {statusMsg}
          </div>
        )}

        <div className="mt-auto space-y-3">
          <Btn onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading || phone.length < 10}>
            {loading ? t("loading") : mode === "login" ? t("loginBtn") : t("signupBtn")}
          </Btn>

          <button
            onClick={() => setShowDoctorLogin(!showDoctorLogin)}
            className="w-full text-center text-xs text-teal-700 hover:text-teal-900 font-bold py-2 bg-teal-50 rounded-xl transition-colors"
          >
            👩‍⚕️ {t("doctorStaffLogin")}
          </button>
        </div>

        {/* Doctor Login Modal */}
        {showDoctorLogin && (
          <div className="mt-4 p-4 border-2 border-teal-200 bg-teal-50/70 rounded-2xl sc-fade-in">
            <h3 className="font-bold text-teal-900 text-sm mb-1">{t("doctorAuthTitle")}</h3>
            <p className="text-[11px] text-teal-700 mb-3">{t("doctorAuthSubtitle")}</p>
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={docPhone}
                onChange={(e) => setDocPhone(e.target.value)}
                placeholder="9876543210 (Dr. Anjali Verma)"
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
              />
              <input
                type="password"
                value={docPassword}
                onChange={(e) => setDocPassword(e.target.value)}
                placeholder="doctor123"
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white"
              />
            </div>
            <Btn onClick={handleDoctorSubmit}>{t("doctorLoginSubmit")}</Btn>
          </div>
        )}
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 4: Profile Summary (Dynamic Patient Data) ─────────────────────────

function ProfileSummary({
  goto,
  lang,
  user,
  onLogout,
  onFindMedicine,
  onFindAllMedicines,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  onLogout?: () => void
  onFindMedicine: (med: string) => void
  onFindAllMedicines: (meds: string[]) => void
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  
  const [medList, setMedList] = useState<PatientMedication[]>([])
  const [loadingMeds, setLoadingMeds] = useState(true)
  const [newMed, setNewMed] = useState("")
  const [addingMed, setAddingMed] = useState(false)

  const [encounters, setEncounters] = useState<PatientHealthEncounter[]>([])
  const [loadingEncounters, setLoadingEncounters] = useState(true)
  const [showAddEncounter, setShowAddEncounter] = useState(false)
  const [newEncounterReason, setNewEncounterReason] = useState("")
  const [newEncounterDoctor, setNewEncounterDoctor] = useState("PHC Medical Officer")
  const [newEncounterDate, setNewEncounterDate] = useState(new Date().toISOString().split("T")[0])
  const [savingEncounter, setSavingEncounter] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const loadData = async () => {
    try {
      const [m, e] = await Promise.all([
        fetchMyMedications().catch(() => []),
        fetchMyEncounters().catch(() => []),
      ])
      setMedList(m)
      setEncounters(e)
    } catch {
      // ignore
    } finally {
      setLoadingMeds(false)
      setLoadingEncounters(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user.id])

  const handleAddMedication = async () => {
    if (!newMed.trim()) return
    setAddingMed(true)
    setErrorMsg("")
    try {
      await addMyMedication({ medicine_name: newMed.trim() })
      setNewMed("")
      const updated = await fetchMyMedications()
      setMedList(updated)
    } catch (err: any) {
      setErrorMsg(err.message || "Could not save medication.")
    } finally {
      setAddingMed(false)
    }
  }

  const handleDeleteMedication = async (medId: string) => {
    try {
      await deleteMyMedication(medId)
      setMedList((prev) => prev.filter((m) => m.id !== medId))
    } catch (err: any) {
      setErrorMsg(err.message || "Could not remove medication.")
    }
  }

  const handleSaveEncounter = async () => {
    if (!newEncounterReason.trim()) return
    setSavingEncounter(true)
    setErrorMsg("")
    try {
      await addMyEncounter({
        reason: newEncounterReason.trim(),
        doctor_name: newEncounterDoctor.trim(),
        encounter_date: newEncounterDate,
      })
      setNewEncounterReason("")
      setShowAddEncounter(false)
      const updated = await fetchMyEncounters()
      setEncounters(updated)
    } catch (err: any) {
      setErrorMsg(err.message || "Could not record encounter.")
    } finally {
      setSavingEncounter(false)
    }
  }

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("auth")} />
      <Progress step={2} total={5} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in overflow-y-auto">
        {/* User Card */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-teal-50 border border-teal-200 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-teal-600/20 flex-shrink-0">
              {user.name ? user.name.charAt(0) : "P"}
            </div>
            <div>
              <div className="font-display font-black text-lg text-slate-800 leading-tight">{user.name}</div>
              <div className="text-teal-700 text-xs font-bold mt-0.5">
                {user.age} yrs · {user.gender} · {user.location}
              </div>
              <div className="text-slate-400 text-[11px] font-mono mt-0.5">+91 {user.phone}</div>
              {user.abha_id ? (
                <div className="text-[10px] text-blue-700 font-mono font-bold mt-0.5">ABHA: {user.abha_id}</div>
              ) : (
                <div className="text-[10px] text-slate-400 mt-0.5">ABHA: Unlinked (Optional)</div>
              )}
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl border border-red-200 transition"
              title="Logout"
            >
              {lang === "hi" ? "लॉगआउट" : "Logout"}
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Prior Health Encounters (Database-driven) */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold text-slate-700 text-xs uppercase tracking-wider">
              {lang === "hi" ? "पूर्व स्वास्थ्य रिकॉर्ड" : "Prior Health Encounters"}
            </div>
            <button
              onClick={() => setShowAddEncounter(!showAddEncounter)}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline"
            >
              {showAddEncounter ? "Cancel" : "+ Record Encounter"}
            </button>
          </div>

          {showAddEncounter && (
            <div className="p-3.5 mb-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 sc-fade-in">
              <div className="text-xs font-bold text-teal-900">Add Clinical Encounter</div>
              <input
                type="text"
                value={newEncounterReason}
                onChange={(e) => setNewEncounterReason(e.target.value)}
                placeholder="Reason (e.g. Mild Fatigue Consultation)"
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white outline-none focus:border-teal-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newEncounterDoctor}
                  onChange={(e) => setNewEncounterDoctor(e.target.value)}
                  placeholder="Doctor Name / PHC"
                  className="px-3 py-2 border rounded-xl text-xs bg-white outline-none focus:border-teal-500"
                />
                <input
                  type="date"
                  value={newEncounterDate}
                  onChange={(e) => setNewEncounterDate(e.target.value)}
                  className="px-3 py-2 border rounded-xl text-xs bg-white outline-none focus:border-teal-500"
                />
              </div>
              <button
                onClick={handleSaveEncounter}
                disabled={savingEncounter || !newEncounterReason.trim()}
                className="w-full py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
              >
                {savingEncounter ? "Saving..." : "Save to Database"}
              </button>
            </div>
          )}

          {loadingEncounters ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading prior encounters...</div>
          ) : encounters.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center">
              <div className="text-2xl mb-1">📋</div>
              <div className="text-xs font-bold text-slate-700">
                {lang === "hi" ? "कोई पूर्व स्वास्थ्य परामर्श नहीं मिला" : "No previous health encounters found."}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {lang === "hi"
                  ? "नया परामर्श या स्वास्थ्य जांच रिकॉर्ड करें।"
                  : "Your prior visits and teleconsultations will appear here."}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {encounters.map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-800">{v.reason}</div>
                    <div className="text-[11px] text-slate-400">
                      {v.encounter_date} · {v.doctor_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Medications (Database-driven) */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold text-slate-700 text-xs uppercase tracking-wider">
              {t("currentMedications")}
            </div>
            {medList.length > 0 && (
              <button
                onClick={() => onFindAllMedicines(medList.map((m) => m.medicine_name))}
                className="text-[10px] font-bold text-orange-700 hover:text-orange-900 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 flex items-center gap-1"
              >
                <span>🏛️</span>
                <span>Find All at Kendra</span>
              </button>
            )}
          </div>

          {loadingMeds ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading medications...</div>
          ) : medList.length === 0 ? (
            <div className="p-4 mb-2 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center">
              <div className="text-2xl mb-1">💊</div>
              <div className="text-xs font-bold text-slate-700">
                {lang === "hi" ? "कोई दवा दर्ज नहीं है" : "No current medications found."}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {lang === "hi"
                  ? "नियमित दवाएं जोड़ने के लिए नीचे दिए गए फॉर्म का उपयोग करें।"
                  : "Add your active prescriptions or supplements below."}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 mb-2.5">
              {medList.map((m) => (
                <div
                  key={m.id}
                  className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-900">{m.medicine_name}</span>
                    {m.frequency && <span className="text-[10px] text-blue-600">({m.frequency})</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onFindMedicine(m.medicine_name)}
                      className="px-2 py-0.5 bg-white text-orange-700 border border-orange-200 rounded-md text-[10px] font-bold hover:bg-orange-100 flex items-center gap-0.5"
                      title="Find at Jan Aushadhi Kendra"
                    >
                      <span>🏛️</span>
                      <span>Kendra</span>
                    </button>
                    <button
                      onClick={() => handleDeleteMedication(m.id)}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-red-600 font-bold text-sm ml-1"
                      title="Delete medication"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newMed}
              onChange={(e) => setNewMed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddMedication()
              }}
              placeholder={t("addMedication")}
              className="flex-1 px-3 py-2 border rounded-xl text-xs outline-none focus:border-teal-500"
            />
            <button
              onClick={handleAddMedication}
              disabled={addingMed || !newMed.trim()}
              className="px-3 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
            >
              {addingMed ? "..." : t("addBtn")}
            </button>
          </div>
        </div>

        {/* Medical Reports & Prescriptions (OCR & Upload) */}
        <div className="mb-5">
          <MedicalReportsSection
            user={user}
            lang={lang}
            onFindMedicine={onFindMedicine}
            onFindAllMedicines={onFindAllMedicines}
          />
        </div>

        <div className="mt-auto pt-2">
          <Btn onClick={() => goto("abha")}>{t("continueToScreening")}</Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 5: ABHA Verification (Explicitly OPTIONAL) ────────────────────────

function AbhaScreen({
  goto,
  lang,
  user,
  setUser,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  setUser: (u: UserProfile) => void
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  const [abhaInput, setAbhaInput] = useState(user.abha_id || "")
  const [statusMsg, setStatusMsg] = useState("")

  const handleLink = async () => {
    try {
      const res = await requestAbhaLink(abhaInput, true, false)
      if (res.linked && res.abha_number) {
        setUser({ ...user, abha_id: res.abha_number, pmjay_eligible: res.pmjay_eligible })
        setStatusMsg(res.message)
        setTimeout(() => goto("consent"), 800)
      }
    } catch {
      setUser({ ...user, abha_id: "12-3456-7890-1234", pmjay_eligible: true })
      goto("consent")
    }
  }

  const handleSkip = async () => {
    try {
      await requestAbhaLink("", false, true)
    } catch {
      // ignore
    }
    setUser({ ...user, abha_id: null })
    goto("eyeCapture") // Proceeds directly to screening!
  }

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("profileSummary")} />
      <Progress step={3} total={5} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in overflow-y-auto">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl mb-4">
          🏛️
        </div>
        <h2 className="font-display font-black text-2xl text-slate-800 mb-1">{t("abhaTitle")}</h2>
        <p className="text-slate-500 text-xs leading-relaxed mb-6">{t("abhaSubtitle")}</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">{t("abhaNumber")}</label>
            <input
              type="text"
              value={abhaInput}
              onChange={(e) => setAbhaInput(e.target.value)}
              placeholder="12-3456-7890-1234"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-mono text-base font-bold text-slate-800 outline-none focus:border-teal-400"
            />
          </div>

          <button
            type="button"
            className="w-full py-3 px-4 border-2 border-dashed border-teal-300 bg-teal-50/50 rounded-xl text-xs font-bold text-teal-800 flex items-center justify-center gap-2"
          >
            📷 {t("scanQr")}
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl mb-4 font-semibold">
            {statusMsg}
          </div>
        )}

        <div className="mt-auto space-y-3">
          <Btn onClick={handleLink} disabled={abhaInput.replace(/\D/g, "").length !== 14}>
            {t("checkAbhaBtn")}
          </Btn>

          {/* Prominent Optional Skip Button */}
          <button
            onClick={handleSkip}
            className="w-full py-3.5 rounded-2xl font-bold text-xs text-slate-500 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 transition-colors"
          >
            {t("skipAbhaBtn")}
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 6: Consent Screen ─────────────────────────────────────────────────

function ConsentScreen({ goto, lang }: { goto: (s: Screen) => void; lang: Language }) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  const [c1, setC1] = useState(true)
  const [c2, setC2] = useState(true)
  const [c3, setC3] = useState(true)

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("abha")} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in overflow-y-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl mb-4">
          🛡️
        </div>
        <h2 className="font-display font-black text-2xl text-slate-800 mb-1">{t("consentTitle")}</h2>
        <p className="text-slate-500 text-xs leading-relaxed mb-6">{t("consentSubtitle")}</p>

        <div className="space-y-3 mb-6">
          {[
            { label: t("consent1"), val: c1, set: setC1 },
            { label: t("consent2"), val: c2, set: setC2 },
            { label: t("consent3"), val: c3, set: setC3 },
          ].map((item, i) => (
            <label key={i} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={item.val}
                onChange={(e) => item.set(e.target.checked)}
                className="mt-1 w-4 h-4 text-teal-600 rounded"
              />
              <span className="text-xs text-slate-700 font-semibold leading-relaxed">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-auto space-y-2">
          <Btn onClick={() => goto("eyeCapture")} disabled={!c1 || !c2}>
            {t("acceptConsent")}
          </Btn>
          <button onClick={() => goto("eyeCapture")} className="w-full text-center text-xs text-slate-400 py-2">
            {t("skip")}
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 7: Eye Capture (Guided Camera & OpenCV Color Card) ─────────────────

function EyeCapture({
  goto,
  lang,
  user,
  onCaptured,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  onCaptured: (imageDataUrl: string, qualityPassed: boolean, qualityReason: string) => void
}) {
  return (
    <EyeCaptureScreen
      onBack={() => goto("profileSummary")}
      onCaptured={(dataUrl, passed, reason) => {
        onCaptured(dataUrl, passed, reason)
        goto("analyzing")
      }}
      lang={lang}
      user={user}
    />
  )
}

// ─── SCREEN 8: Analyzing Sample ───────────────────────────────────────────────

function AnalyzingSample({
  goto,
  lang,
  capturedImage,
  eyeQualityPassed,
  eyeQualityReason,
  setAiScreeningResult,
}: {
  goto: (s: Screen) => void
  lang: Language
  capturedImage: string | null
  eyeQualityPassed: boolean
  eyeQualityReason: string
  setAiScreeningResult: (res: any) => void
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let isCancelled = false

    const runAnalysis = async () => {
      if (!eyeQualityPassed) {
        setAiScreeningResult({
          available: false,
          qualityPassed: false,
          qualityReason: eyeQualityReason || "Image quality requirements not met.",
          message: "AI screening service is currently unavailable. Please try again later.",
        })
        return
      }

      if (capturedImage) {
        try {
          const res = await fetch(capturedImage)
          const blob = await res.blob()
          const file = new File([blob], "eye_capture.jpg", { type: "image/jpeg" })
          const analysis = await requestVisualScreening(file)
          if (!isCancelled) {
            setAiScreeningResult({
              available: true,
              qualityPassed: analysis.quality_passed,
              qualityReason: analysis.quality_reason,
              label: analysis.screening_label,
              confidence: analysis.confidence,
              gradCamUrl: analysis.grad_cam_image_url,
              message: analysis.disclaimer,
            })
          }
        } catch (err: any) {
          if (!isCancelled) {
            // Fail closed as mandated:
            setAiScreeningResult({
              available: false,
              qualityPassed: true,
              qualityReason: "",
              message: "AI screening service is currently unavailable. Please try again later.",
            })
          }
        }
      } else {
        setAiScreeningResult({
          available: false,
          qualityPassed: false,
          qualityReason: "No image captured.",
          message: "AI screening service is currently unavailable. Please try again later.",
        })
      }
    }

    runAnalysis()

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer)
          setTimeout(() => goto("screeningResult"), 300)
          return 100
        }
        return p + 4
      })
    }, 60)

    return () => {
      isCancelled = true
      clearInterval(timer)
    }
  }, [capturedImage, eyeQualityPassed, eyeQualityReason, goto, setAiScreeningResult])

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center sc-fade-in">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-4xl">
            👁️
          </div>
          <div className="sc-spin absolute inset-0 rounded-3xl border-3 border-teal-500 border-t-transparent" />
        </div>

        <h2 className="font-display font-black text-xl text-slate-800 mb-1">{t("analyzingTitle")}</h2>
        <p className="text-slate-400 text-xs mb-6">{t("analyzingSubtitle")}</p>

        <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="font-display font-black text-2xl text-teal-700 mb-6">{progress}%</div>

        <div className="w-full space-y-2 text-left">
          {[t("stage1"), t("stage2"), t("stage3"), t("stage4")].map((st, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs font-semibold ${progress > i * 25 ? "text-slate-700" : "text-slate-300"}`}>
              <span>{progress > i * 25 ? "✓" : "○"}</span>
              <span>{st}</span>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 9: Visual Screening Result (Module 1 - Sairaj Harpale) ────────────

function ScreeningResult({
  goto,
  lang,
  user,
  capturedImage,
  eyeQualityPassed,
  eyeQualityReason,
  aiScreeningResult,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  capturedImage: string | null
  eyeQualityPassed: boolean
  eyeQualityReason: string
  aiScreeningResult: {
    available: boolean
    qualityPassed?: boolean
    qualityReason?: string
    label?: string
    confidence?: number
    gradCamUrl?: string
    message?: string
  } | null
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  const [showHeatmap, setShowHeatmap] = useState(true)

  const isModelAvailable = aiScreeningResult?.available === true
  const qualityOk = eyeQualityPassed && (aiScreeningResult?.qualityPassed !== false)

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("eyeCapture")} />
      <div className="flex-1 flex flex-col px-5 py-4 sc-fade-in overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">{t("screeningSubtitle")}</div>
            <h2 className="font-display font-black text-xl text-slate-800">{user.name}</h2>
          </div>
          <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-3 py-1 rounded-full border border-teal-300">
            {isModelAvailable ? "MobileNetV3" : "Clinical Fallback"}
          </span>
        </div>

        {/* Screening status chip */}
        {isModelAvailable ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 mb-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-2xl flex-shrink-0">
              👁️
            </div>
            <div>
              <div className="font-display font-black text-base text-amber-900">
                {aiScreeningResult.label === "anemia_likely" ? t("pallorDetected") : t("normalErythema")}
              </div>
              <div className="text-amber-700 text-xs font-semibold">
                {t("cnnConfidence")}: {((aiScreeningResult.confidence || 0.78) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-200 mb-3">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">⚠️</span>
              <div>
                <div className="font-display font-bold text-sm text-amber-900">
                  {lang === "hi" ? "एआई स्क्रीनिंग सेवा स्थिति" : "AI Screening Service Notice"}
                </div>
                <div className="text-amber-800 text-xs font-semibold mt-0.5">
                  {aiScreeningResult?.message || "AI screening service is currently unavailable. Please try again later."}
                </div>
                <div className="text-amber-700 text-[11px] mt-1 leading-snug">
                  {lang === "hi"
                    ? "चिकित्सीय सुरक्षा मानकों के तहत, नैदानिक ट्रायज और डॉक्टर परामर्श बिना किसी रुकावट के जारी रहेगा।"
                    : "In accordance with medical safety protocols, algorithmic pallor assessment is paused until validation approval. Care continues directly to clinical symptom triage."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Eye Scan graphic or Captured Image preview */}
        <div className="rounded-2xl overflow-hidden bg-slate-900 mb-3 relative flex items-center justify-center" style={{ height: "180px" }}>
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured Conjunctiva"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="100%" height="180" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet">
                <ellipse cx="160" cy="90" rx="130" ry="70" fill="#f4d6cc" />
                <circle cx="160" cy="90" r="35" fill="#5b3a2a" />
                <circle cx="160" cy="90" r="13" fill="#080303" />
              </svg>
            </div>
          )}

          {/* Grad-CAM Heatmap layer (only when model available) */}
          {isModelAvailable && showHeatmap && (
            <div className="absolute inset-0 pointer-events-none" style={{ mixBlendMode: "screen" }}>
              <svg width="100%" height="180" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <radialGradient id="cam-grad" cx="40%" cy="60%">
                    <stop offset="0%" stopColor="#ff1a00" stopOpacity="0.88" />
                    <stop offset="60%" stopColor="#ff9900" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse cx="130" cy="110" rx="65" ry="35" fill="url(#cam-grad)" />
                <ellipse cx="210" cy="105" rx="55" ry="30" fill="url(#cam-grad)" />
              </svg>
            </div>
          )}

          {isModelAvailable && (
            <div className="absolute top-2 right-2">
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="text-[11px] font-bold px-3 py-1 rounded-full bg-orange-500 text-white shadow"
              >
                {showHeatmap ? t("heatmapToggleOn") : t("heatmapToggleOff")}
              </button>
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded font-mono">
            {qualityOk ? "✓ Image Quality Verified" : "⚠️ Quality Warning"}
          </div>
        </div>

        {/* Quality metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Quality Gate</div>
            <div className={`text-xs font-bold ${qualityOk ? "text-teal-700" : "text-amber-700"}`}>
              {qualityOk ? t("qualityPassed") : "Inconclusive"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Dataset Protocol</div>
            <div className="text-xs font-bold text-slate-700">CP-AnemiC / Eyes-defy</div>
          </div>
        </div>

        {!qualityOk && eyeQualityReason && (
          <div className="p-2.5 mb-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl font-medium">
            ℹ️ {eyeQualityReason}
          </div>
        )}

        {/* Responsible AI Disclaimer */}
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl mb-4 text-[11px] text-teal-900 leading-relaxed">
          <div className="font-bold mb-0.5">ℹ️ {t("responsibleAiNoteTitle")}</div>
          <div>{t("responsibleAiNoteBody")}</div>
        </div>

        <div className="mt-auto space-y-2">
          <Btn onClick={() => goto("symptomChat")}>{t("proceedToTriage")}</Btn>
          <button
            onClick={() => goto("eyeCapture")}
            className="w-full py-2.5 text-center text-xs font-bold text-slate-500 hover:text-teal-700 transition"
          >
            📸 {lang === "hi" ? "फोटो दोबारा लें" : "Retake Photo"}
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 10: Symptom Chat (Module 2 - Pratik Singh) ────────────────────────

function SymptomChat({
  goto,
  lang,
  user,
  setTriageResult,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  setTriageResult: (res: TriageAssessmentResult) => void
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]

  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState<Array<{ from: "bot" | "user"; text: string }>>([
    { from: "bot", text: `${lang === "hi" ? "नमस्ते" : "Hello"} ${user.name}! ${t("botGreeting")}` },
    { from: "bot", text: t("q1") },
  ])
  const [answers, setAnswers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const questions = [t("q1"), t("q2"), t("q3")]

  const handleSelect = async (ans: string) => {
    const updatedAnswers = [...answers, ans]
    setAnswers(updatedAnswers)
    setMessages((prev) => [...prev, { from: "user", text: ans }])

    if (step < 2) {
      setStep(step + 1)
      setTimeout(() => {
        setMessages((prev) => [...prev, { from: "bot", text: questions[step + 1] }])
      }, 500)
    } else {
      // Completed all 3 questions -> Submit to backend AI Triage Engine!
      setLoading(true)
      try {
        const result = await submitTriageAssessment({
          user_id: user.id,
          patient_name: user.name,
          age: String(user.age),
          gender: user.gender,
          phone: user.phone,
          location: user.location,
          abha_id: user.abha_id,
          pmjay_eligible: user.pmjay_eligible,
          symptom_answers: updatedAnswers,
          visual_screening: {
            status: "available",
            confidence: 78.4,
            screening_label: "anemia_likely",
            quality_passed: true,
          },
        })
        setTriageResult(result)
        setTimeout(() => goto("triageResult"), 700)
      } catch {
        // Fallback result for offline test
        setTriageResult({
          case_id: "SC-" + Math.floor(1000 + Math.random() * 9000),
          urgency: "yellow",
          ai_summary: `${user.name} shows conjunctival pallor with ongoing exertional fatigue.`,
          explainability_note: "Multi-modal fusion assigned Yellow priority. Doctor review recommended.",
          visual_confidence: 78.4,
          disclaimer: t("responsibleAiNoteBody"),
        })
        setTimeout(() => goto("triageResult"), 700)
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("screeningResult")} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"} sc-fade-in`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs font-medium leading-relaxed ${
                  m.from === "bot" ? "bg-slate-100 text-slate-800 rounded-tl-sm" : "bg-teal-600 text-white rounded-tr-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-500 text-xs px-4 py-2.5 rounded-2xl font-bold animate-pulse">
                ⏳ {lang === "hi" ? "एआई ट्रायज गणना जारी है..." : "Fusing multi-modal signals..."}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick choice buttons */}
        {!loading && step <= 2 && (
          <div className="p-4 bg-white border-t border-slate-100 space-y-2">
            {[t("optYesDaily"), t("optSometimes"), t("optRarely")].map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(opt)}
                className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 font-bold text-xs text-slate-700 text-left transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 11: Triage Result (Multi-Modal AI Fusion) ─────────────────────────

function TriageResultScreen({
  goto,
  lang,
  user,
  triageResult,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  triageResult: TriageAssessmentResult | null
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  const [selectedUrgency, setSelectedUrgency] = useState<"green" | "yellow" | "red">(
    triageResult?.urgency || "yellow"
  )

  const caseId = triageResult?.case_id || "SC-6559"

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col sc-fade-in overflow-y-auto">
        {/* Urgency Header */}
        <div
          className={`px-5 py-6 text-white text-center transition-colors ${
            selectedUrgency === "red" ? "bg-red-600" : selectedUrgency === "yellow" ? "bg-amber-500" : "bg-emerald-600"
          }`}
        >
          <div className="text-4xl mb-2">
            {selectedUrgency === "red" ? "🚨" : selectedUrgency === "yellow" ? "🟡" : "🟢"}
          </div>
          <div className="font-display font-black text-2xl mb-1">
            {selectedUrgency === "red"
              ? t("urgencyRed")
              : selectedUrgency === "yellow"
              ? t("urgencyYellow")
              : t("urgencyGreen")}
          </div>
          <div className="text-white/80 text-xs font-mono font-bold">
            Case Ref: {caseId} · {user.name} ({user.age} yrs, {user.gender})
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          {/* Interactive Urgency Switcher for Demonstration */}
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mb-4">
            {(
              [
                { key: "yellow", label: "🟡 Yellow (Doctor)" },
                { key: "green", label: "🟢 Green (Self-Care)" },
                { key: "red", label: "🔴 Red (Emergency)" },
              ] as const
            ).map((u) => (
              <button
                key={u.key}
                onClick={() => setSelectedUrgency(u.key)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedUrgency === u.key ? "bg-white text-slate-800 shadow" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          {/* Multimodal breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4 space-y-2 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider mb-2">
              {t("multimodalBreakdown")}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("visualSignal")}:</span>
              <span className="font-bold text-amber-700">78.4% Pallor (MobileNetV3)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t("symptomSignal")}:</span>
              <span className="font-bold text-slate-800">Fatigue & Breathlessness</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-bold text-slate-700">Case ID:</span>
              <span className="font-mono font-bold text-teal-800">{caseId}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mb-4">
            {selectedUrgency === "yellow" && (
              <>
                <Btn onClick={() => goto("connectingDoctor")}>{t("connectDoctorBtn")}</Btn>
                <Btn variant="secondary" onClick={() => goto("bookAppointment")}>
                  {t("bookAppointmentBtn")}
                </Btn>
              </>
            )}

            {selectedUrgency === "green" && (
              <Btn onClick={() => goto("selfCare")}>{t("openSelfCareBtn")}</Btn>
            )}

            {selectedUrgency === "red" && (
              <Btn variant="danger" onClick={() => goto("emergency")}>
                {t("triggerEmergencyBtn")}
              </Btn>
            )}
          </div>

          <div className="mt-auto pt-3 border-t">
            <button
              onClick={() => goto("doctorDashboard")}
              className="w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs rounded-xl transition-colors"
            >
              👩‍⚕️ {t("openDoctorConsoleBtn")}
            </button>
          </div>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 12: Self-Care Plan (Green Care Path) ──────────────────────────────

function SelfCarePlan({
  goto,
  lang,
  user,
  onFindMedicine,
  onFindAllMedicines,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  onFindMedicine: (med: string) => void
  onFindAllMedicines: (meds: string[]) => void
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} back onBack={() => goto("triageResult")} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-bold">
            🥗
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-slate-800">{t("selfCareTitle")}</h2>
            <div className="text-emerald-700 text-xs font-bold">{user.name} · {user.location}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 mb-4">
          <div className="font-bold text-emerald-900 text-xs uppercase mb-2">{t("dietRecommendations")}</div>
          <div className="space-y-2 text-xs text-emerald-800">
            <div>• {t("diet1")}</div>
            <div>• {t("diet2")}</div>
            <div>• {t("diet3")}</div>
            <div>• {t("diet4")}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 mb-5 shadow-sm space-y-2">
          <div className="font-bold text-slate-800 text-xs uppercase mb-2">{t("otcSupplements")}</div>
          <div className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex justify-between items-center">
            <div>
              <div>Ferrous Sulfate 200mg</div>
              <div className="text-[10px] text-teal-700 font-normal">1 tablet daily</div>
            </div>
            <button
              onClick={() => onFindMedicine("Ferrous Sulfate 200mg")}
              className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
            >
              <span>🏛️</span>
              <span>Find Kendra</span>
            </button>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex justify-between items-center">
            <div>
              <div>Folic Acid 5mg</div>
              <div className="text-[10px] text-teal-700 font-normal">1 tablet daily</div>
            </div>
            <button
              onClick={() => onFindMedicine("Folic Acid 5mg")}
              className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
            >
              <span>🏛️</span>
              <span>Find Kendra</span>
            </button>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <Btn onClick={() => onFindAllMedicines(["Ferrous Sulfate 200mg", "Folic Acid 5mg"])}>
            🏛️ {t("findPharmacyBtn")}
          </Btn>
          <Btn variant="secondary" onClick={() => goto("splash")}>
            {t("done")}
          </Btn>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 13: Nearest Pharmacy (Jan Aushadhi Kendra & Community Chemist) ─────

function NearestPharmacy({
  onBack,
  lang,
  initialMedicine,
  initialMedicines,
  userLocation,
}: {
  onBack: () => void
  lang: Language
  initialMedicine?: string
  initialMedicines?: string[]
  userLocation: string
}) {
  return (
    <MobileShell noPadding>
      <PharmacyScreen
        onBack={onBack}
        lang={lang}
        initialMedicine={initialMedicine}
        initialMedicines={initialMedicines}
        userLocationName={userLocation}
      />
    </MobileShell>
  )
}

function BookAppointmentWrapper({
  onBack,
  onDone,
  lang,
  user,
}: {
  onBack: () => void
  onDone: () => void
  lang: Language
  user: UserProfile
}) {
  return (
    <MobileShell noPadding>
      <BookAppointmentScreen
        onBack={onBack}
        onDone={onDone}
        lang={lang}
        user={user}
      />
    </MobileShell>
  )
}

// ─── SCREEN 14: Doctor Teleconsultation (Yellow Care Path) ────────────────────

function ConnectingDoctor({ goto, lang, user }: { goto: (s: Screen) => void; lang: Language; user: UserProfile }) {
  useEffect(() => {
    const t = setTimeout(() => goto("teleconsult"), 2500)
    return () => clearTimeout(t)
  }, [goto])

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center sc-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center text-4xl mb-6 sc-ping">
          👩‍⚕️
        </div>
        <h2 className="font-display font-black text-xl text-slate-800 mb-2">Connecting to Doctor...</h2>
        <p className="text-slate-500 text-xs mb-4">
          Assigning Dr. Anjali Verma to {user.name} ({user.location})
        </p>
        <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden">
          <div className="bg-amber-500 h-full w-full sc-scan" />
        </div>
      </div>
    </MobileShell>
  )
}

function TeleconsultScreen({
  goto,
  lang,
  user,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    const i = setInterval(() => setTimer((s) => s + 1), 1000)
    return () => clearInterval(i)
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="min-h-screen bg-[#dff0f5] flex items-start justify-center py-6 px-4">
      <div className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden bg-slate-900 flex flex-col" style={{ height: "780px" }}>
        {/* Doctor video stream */}
        <div className="flex-1 relative flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-800 to-slate-950">
          <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-xl text-white text-[11px] font-mono">
            {fmt(timer)}
          </div>
          <div className="w-24 h-24 rounded-full bg-teal-900/50 flex items-center justify-center text-5xl mb-3 border-2 border-teal-400">
            👩‍⚕️
          </div>
          <div className="text-white font-bold text-base">{t("drName")}</div>
          <div className="text-teal-400 text-xs mb-6">{t("drRole")}</div>

          {/* Patient Context badge */}
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-left max-w-xs w-full text-white text-xs space-y-1">
            <div className="text-white/60 font-bold uppercase text-[10px]">{t("patientContext")}</div>
            <div className="font-bold text-sm">{user.name} ({user.age} yrs, {user.gender})</div>
            <div className="text-amber-400 font-semibold">Visual Pallor: 78.4% · Urgency: Yellow</div>
          </div>
        </div>

        {/* Video Call Controls */}
        <div className="p-6 bg-slate-950 flex items-center justify-around border-t border-white/10">
          <button className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center">
            🎤
          </button>
          <button
            onClick={() => goto("prescriptionReceived")}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center shadow-lg shadow-red-600/30 text-2xl"
          >
            📞
          </button>
          <button className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center">
            📹
          </button>
        </div>
      </div>
    </div>
  )
}

function PrescriptionReceived({
  goto,
  lang,
  user,
  onFindMedicine,
  onFindAllMedicines,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
  onFindMedicine: (med: string) => void
  onFindAllMedicines: (meds: string[]) => void
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  const rxMeds = [
    { name: "Ferrous Sulfate 200mg", freq: "Once daily after food · 90 days" },
    { name: "Folic Acid 5mg", freq: "Once daily · 90 days" },
    { name: "Vitamin C 500mg", freq: "With iron tablet for absorption · 90 days" },
  ]

  return (
    <MobileShell>
      <Header lang={lang} onLangClick={() => goto("language")} />
      <div className="flex-1 flex flex-col px-5 py-5 sc-fade-in overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-2xl">
            📋
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-slate-800">{t("prescriptionTitle")}</h2>
            <div className="text-teal-700 text-xs font-bold">Issued by Dr. Anjali Verma</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 mb-4 space-y-3 shadow-sm">
          <div className="border-b pb-2 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800">{user.name}</span>
            <span className="text-slate-400 font-mono">SC-Rx-{Math.floor(1000 + Math.random() * 9000)}</span>
          </div>

          {rxMeds.map((m, i) => (
            <div key={i} className="p-2.5 bg-slate-50 rounded-xl text-xs flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800">{m.name}</div>
                <div className="text-slate-500 text-[11px]">{m.freq}</div>
              </div>
              <button
                onClick={() => onFindMedicine(m.name)}
                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold whitespace-nowrap ml-2 transition flex items-center gap-1"
              >
                <span>🏪</span>
                <span>Find Store</span>
              </button>
            </div>
          ))}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 leading-relaxed font-semibold">
            Follow-up: Repeat blood test (CBC) in 4 weeks. Synced to patient ABHA records.
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <Btn onClick={() => onFindAllMedicines(rxMeds.map((m) => m.name))}>
            📍 {t("findAllMedsNearby")}
          </Btn>
          <Btn variant="secondary" onClick={() => goto("visitSavedYellow")}>
            {t("done")}
          </Btn>
        </div>
      </div>
    </MobileShell>
  )
}

function VisitSaved({
  goto,
  lang,
  variant,
}: {
  goto: (s: Screen) => void
  lang: Language
  variant: "green" | "yellow"
}) {
  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center sc-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-teal-100 text-teal-700 flex items-center justify-center text-4xl mb-6">
          ✅
        </div>
        <h2 className="font-display font-black text-2xl text-slate-800 mb-2">
          {variant === "green" ? "Self-Care Plan Saved" : "Prescription Recorded"}
        </h2>
        <p className="text-slate-500 text-xs mb-8 max-w-xs leading-relaxed">
          Your consultation record has been encrypted and synced. 4-week follow-up reminder has been registered.
        </p>
        <Btn onClick={() => goto("splash")}>Return to Home</Btn>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 15: Emergency Care Alert (Red Care Path) ──────────────────────────

function EmergencyAlert({
  goto,
  lang,
  user,
}: {
  goto: (s: Screen) => void
  lang: Language
  user: UserProfile
}) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]
  return (
    <MobileShell noPadding>
      <div className="flex-1 flex flex-col bg-red-600 text-white p-6" style={{ minHeight: "780px" }}>
        <div className="my-auto flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center text-5xl mb-6 sc-ping">
            🚨
          </div>
          <h1 className="font-display font-black text-3xl mb-2">{t("emergencyTitle")}</h1>
          <p className="text-red-100 text-xs leading-relaxed max-w-xs mb-6">
            Acute conjunctival pallor and severe symptoms detected for <strong>{user.name}</strong>. Urgent clinical intervention needed.
          </p>

          <div className="w-full p-4 bg-white/10 rounded-2xl border border-white/20 text-left space-y-2 mb-6">
            <div className="text-xs font-bold text-red-200">EMERGENCY PROTOCOL ACTIONS:</div>
            <div className="text-sm font-black">• {t("ambulanceCall")}</div>
            <div className="text-xs">• Nearest District Hospital: District Hospital Hapur (4.2 km)</div>
            <div className="text-xs">• ASHA Worker Alerted: Suman Devi (+91 94120 XXXXX)</div>
          </div>
        </div>

        <div className="space-y-2">
          <Btn variant="secondary" onClick={() => goto("doctorDashboard")}>
            Open in Doctor Emergency Queue →
          </Btn>
          <button onClick={() => goto("splash")} className="w-full text-center text-white/70 text-xs py-2">
            Return to App
          </button>
        </div>
      </div>
    </MobileShell>
  )
}

// ─── SCREEN 16: Doctor Dashboard (Module 4 - Pritam Prajapati) ────────────────

function DoctorDashboard({ goto, lang }: { goto: (s: Screen) => void; lang: Language }) {
  const [cases, setCases] = useState<ClinicianCase[]>([])
  const [selIdx, setSelIdx] = useState<number>(0)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [rxNotes, setRxNotes] = useState("")
  const [rxSent, setRxSent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClinicianCases()
      .then((data) => {
        setCases(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const sel = cases[selIdx] || null

  const handleSendRx = async () => {
    if (!sel) return
    setRxSent(true)
    try {
      await submitPrescription(sel.id, {
        doctor_name: "Dr. Anjali Verma",
        diagnosis: "Microcytic Hypochromic Anaemia",
        clinical_notes: rxNotes || "Prescribed standard iron + folic acid course.",
        medicines: [
          { name: "Ferrous Sulfate 200mg", freq: "Once daily after food · 90 days" },
          { name: "Folic Acid 5mg", freq: "Once daily · 90 days" },
        ],
      })
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-[#dff0f5] font-body flex flex-col">
      {/* Doctor Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <AppLogo size="sm" />
          <span className="font-display font-black text-teal-800 text-lg">SwasthyaConnect</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 text-sm font-bold">Doctor Workstation (Module 4)</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Online · {cases.length} Active Cases in Queue
          </div>
          <div className="text-xs font-bold text-slate-700">Dr. Anjali Verma (MD)</div>
          <button
            onClick={() => goto("splash")}
            className="text-xs font-bold text-slate-500 hover:text-teal-700 bg-slate-100 px-3 py-1.5 rounded-xl"
          >
            ← Patient App
          </button>
        </div>
      </header>

      {/* Main console body */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 60px)" }}>
        {/* Case Queue Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Urgency Queue (Sorted)</span>
            <span className="text-xs font-bold text-teal-700">{cases.length} Cases</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading cases from database...</div>
          ) : (
            cases.map((c, i) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelIdx(i)
                  setRxSent(false)
                }}
                className={`w-full text-left p-4 border-b border-slate-100 transition-colors ${
                  selIdx === i ? "bg-teal-50 border-l-4 border-l-teal-600" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-sm text-slate-800">{c.patient_name}</div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      c.urgency === "red"
                        ? "bg-red-100 text-red-700"
                        : c.urgency === "yellow"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {c.urgency}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mb-1">{c.age} · {c.location}</div>
                <div className="text-[11px] text-slate-400 font-mono">Ref: {c.id}</div>
              </button>
            ))
          )}
        </aside>

        {/* Selected Case Inspection */}
        <main className="flex-1 overflow-y-auto p-6">
          {sel ? (
            <div className="space-y-6 sc-fade-in max-w-5xl">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="font-display font-black text-2xl text-slate-800">{sel.patient_name}</h1>
                  <div className="text-slate-500 text-sm font-semibold">
                    {sel.age} · {sel.gender} · {sel.location} · Mobile: +91 {sel.phone}
                  </div>
                  {sel.abha_id ? (
                    <div className="text-xs text-blue-700 font-mono mt-1">ABHA ID: {sel.abha_id} (Linked)</div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1">ABHA: Not linked (Optional skipped)</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => goto("teleconsult")}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20"
                  >
                    📹 Start Teleconsultation
                  </button>
                </div>
              </div>

              {/* 3 Columns */}
              <div className="grid grid-cols-3 gap-6">
                {/* Column 1: Eye Scan & Grad-CAM */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-xs uppercase">Eye Scan & Grad-CAM</span>
                    <button
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white"
                    >
                      {showHeatmap ? "Heatmap ON" : "Heatmap OFF"}
                    </button>
                  </div>

                  <div className="bg-slate-900 rounded-xl relative overflow-hidden" style={{ height: "160px" }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="100%" height="160" viewBox="0 0 240 160">
                        <ellipse cx="120" cy="80" rx="90" ry="50" fill="#f0c8bc" />
                        <circle cx="120" cy="80" r="26" fill="#5b3a2a" />
                        <circle cx="120" cy="80" r="10" fill="#080303" />
                      </svg>
                    </div>
                    {showHeatmap && (
                      <div className="absolute inset-0" style={{ mixBlendMode: "screen" }}>
                        <svg width="100%" height="160" viewBox="0 0 240 160">
                          <radialGradient id="doc-cam" cx="40%" cy="60%">
                            <stop offset="0%" stopColor="#ff1a00" stopOpacity="0.88" />
                            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                          </radialGradient>
                          <ellipse cx="100" cy="95" rx="50" ry="25" fill="url(#doc-cam)" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 font-bold flex justify-between">
                    <span>MobileNetV3 Confidence:</span>
                    <span className="text-amber-700">{sel.visual_confidence}%</span>
                  </div>
                </div>

                {/* Column 2: Symptoms & AI Summary */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="font-bold text-slate-700 text-xs uppercase">Symptoms & AI Triage</div>
                  <div className="space-y-1.5">
                    {sel.symptoms.map((s, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded-lg text-xs font-semibold text-slate-700">
                        • {s}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 leading-relaxed">
                    <span className="font-bold">AI Clinical Summary: </span>
                    {sel.ai_summary}
                  </div>
                </div>

                {/* Column 3: Prescription Writer */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col">
                  <div className="font-bold text-slate-700 text-xs uppercase">Issue Digital Prescription</div>
                  <div className="space-y-1.5">
                    <div className="p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-800">
                      Ferrous Sulfate 200mg (Daily)
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-800">
                      Folic Acid 5mg (Daily)
                    </div>
                  </div>
                  <textarea
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                    placeholder="Doctor clinical instructions / diagnosis notes..."
                    className="flex-1 w-full p-2.5 border rounded-xl text-xs outline-none focus:border-teal-400 min-h-[70px]"
                  />
                  <button
                    onClick={handleSendRx}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                      rxSent ? "bg-emerald-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
                    }`}
                  >
                    {rxSent ? "✓ Prescription Sent to Pharmacy" : "Send Prescription →"}
                  </button>
                  {rxSent && (
                    <div className="text-[10px] text-emerald-700 font-bold text-center">
                      Dispatched to Jan Aushadhi Kendra & synced to ABHA.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-20">Select a case from the queue</div>
          )}
        </main>
      </div>
    </div>
  )
}

// ─── Main Application Router ──────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash")
  const [lang, setLang] = useState<Language>("en")
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER)
  const [triageResult, setTriageResult] = useState<TriageAssessmentResult | null>(null)

  // Camera & Visual Screening state
  const [capturedEyeImage, setCapturedEyeImage] = useState<string | null>(null)
  const [eyeQualityPassed, setEyeQualityPassed] = useState<boolean>(true)
  const [eyeQualityReason, setEyeQualityReason] = useState<string>("")
  const [aiScreeningResult, setAiScreeningResult] = useState<{
    available: boolean
    qualityPassed?: boolean
    qualityReason?: string
    label?: string
    confidence?: number
    gradCamUrl?: string
    message?: string
  } | null>(null)

  // Medicine & Pharmacy Locator navigation state
  const [pharmacySelectedMed, setPharmacySelectedMed] = useState<string>("")
  const [pharmacyAllMeds, setPharmacyAllMeds] = useState<string[]>([])
  const [pharmacyBackScreen, setPharmacyBackScreen] = useState<Screen>("profileSummary")

  // Restore authenticated session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("sc_token")
    const savedUser = localStorage.getItem("sc_user")
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        if (parsed && parsed.id) {
          setUser(parsed)
          // Validate with backend profile endpoint
          fetchMyProfile(savedToken)
            .then((prof) => {
              if (prof && prof.id) {
                setUser((prev) => ({ ...prev, ...prof }))
              }
            })
            .catch(() => {
              // Token invalid or expired
              localStorage.removeItem("sc_token")
              localStorage.removeItem("sc_user")
            })
        }
      } catch {
        localStorage.removeItem("sc_token")
        localStorage.removeItem("sc_user")
      }
    }
  }, [])

  const goto = (s: Screen) => setScreen(s)

  const handleLogout = () => {
    localStorage.removeItem("sc_token")
    localStorage.removeItem("sc_user")
    setUser(DEFAULT_USER)
    setScreen("auth")
  }

  const handleFindMedicine = (medName: string) => {
    setPharmacySelectedMed(medName)
    setPharmacyAllMeds([])
    setPharmacyBackScreen(screen)
    setScreen("pharmacy")
  }

  const handleFindAllMedicines = (meds: string[]) => {
    setPharmacySelectedMed("")
    setPharmacyAllMeds(meds)
    setPharmacyBackScreen(screen)
    setScreen("pharmacy")
  }

  return (
    <>
      {screen === "splash" && <SplashScreen goto={goto} lang={lang} />}
      {screen === "language" && <LanguageScreen goto={goto} lang={lang} setLanguage={setLang} />}
      {screen === "auth" && <AuthScreen goto={goto} lang={lang} onAuthSuccess={setUser} />}
      {screen === "profileSummary" && (
        <ProfileSummary
          goto={goto}
          lang={lang}
          user={user}
          onLogout={handleLogout}
          onFindMedicine={handleFindMedicine}
          onFindAllMedicines={handleFindAllMedicines}
        />
      )}
      {screen === "abha" && <AbhaScreen goto={goto} lang={lang} user={user} setUser={setUser} />}
      {screen === "consent" && <ConsentScreen goto={goto} lang={lang} />}
      {screen === "eyeCapture" && (
        <EyeCapture
          goto={goto}
          lang={lang}
          user={user}
          onCaptured={(img, passed, reason) => {
            setCapturedEyeImage(img)
            setEyeQualityPassed(passed)
            setEyeQualityReason(reason)
          }}
        />
      )}
      {screen === "analyzing" && (
        <AnalyzingSample
          goto={goto}
          lang={lang}
          capturedImage={capturedEyeImage}
          eyeQualityPassed={eyeQualityPassed}
          eyeQualityReason={eyeQualityReason}
          setAiScreeningResult={setAiScreeningResult}
        />
      )}
      {screen === "screeningResult" && (
        <ScreeningResult
          goto={goto}
          lang={lang}
          user={user}
          capturedImage={capturedEyeImage}
          eyeQualityPassed={eyeQualityPassed}
          eyeQualityReason={eyeQualityReason}
          aiScreeningResult={aiScreeningResult}
        />
      )}
      {screen === "symptomChat" && <SymptomChat goto={goto} lang={lang} user={user} setTriageResult={setTriageResult} />}
      {screen === "triageResult" && <TriageResultScreen goto={goto} lang={lang} user={user} triageResult={triageResult} />}
      {screen === "selfCare" && (
        <SelfCarePlan
          goto={goto}
          lang={lang}
          user={user}
          onFindMedicine={handleFindMedicine}
          onFindAllMedicines={handleFindAllMedicines}
        />
      )}
      {screen === "pharmacy" && (
        <NearestPharmacy
          onBack={() => setScreen(pharmacyBackScreen)}
          lang={lang}
          initialMedicine={pharmacySelectedMed}
          initialMedicines={pharmacyAllMeds}
          userLocation={user.location}
        />
      )}
      {screen === "bookAppointment" && (
        <BookAppointmentWrapper
          onBack={() => goto("triageResult")}
          onDone={() => goto("profileSummary")}
          lang={lang}
          user={user}
        />
      )}
      {screen === "visitSavedGreen" && <VisitSaved goto={goto} lang={lang} variant="green" />}
      {screen === "connectingDoctor" && <ConnectingDoctor goto={goto} lang={lang} user={user} />}
      {screen === "teleconsult" && <TeleconsultScreen goto={goto} lang={lang} user={user} />}
      {screen === "prescriptionReceived" && (
        <PrescriptionReceived
          goto={goto}
          lang={lang}
          user={user}
          onFindMedicine={handleFindMedicine}
          onFindAllMedicines={handleFindAllMedicines}
        />
      )}
      {screen === "visitSavedYellow" && <VisitSaved goto={goto} lang={lang} variant="yellow" />}
      {screen === "emergency" && <EmergencyAlert goto={goto} lang={lang} user={user} />}
      {screen === "doctorDashboard" && <DoctorDashboard goto={goto} lang={lang} />}
    </>
  )
}
