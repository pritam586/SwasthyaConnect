import React, { useState } from "react"
import { translations, Language } from "../../i18n"
import { bookAppointmentSlot } from "../reports/reportsService"
import { UserProfile } from "../auth/authService"

interface BookAppointmentScreenProps {
  onBack: () => void
  onDone: () => void
  lang: Language
  user: UserProfile
}

const AVAILABLE_SLOTS = ["09:30 AM", "11:00 AM", "02:00 PM", "04:30 PM"]

export function BookAppointmentScreen({
  onBack,
  onDone,
  lang,
  user,
}: BookAppointmentScreenProps) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]

  const todayStr = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  const dayAfter = new Date(Date.now() + 172800000).toISOString().split("T")[0]

  const [selectedDate, setSelectedDate] = useState<string>(tomorrow)
  const [selectedSlot, setSelectedSlot] = useState<string>(AVAILABLE_SLOTS[0])
  const [notes, setNotes] = useState<string>("Anaemia screening follow-up & CBC prescription review")
  const [booking, setBooking] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState<{ id: string; msg: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleConfirm = async () => {
    setBooking(true)
    setErrorMsg(null)
    try {
      const res = await bookAppointmentSlot(
        user.id,
        user.name,
        selectedDate,
        selectedSlot,
        notes,
        "doc-001",
        "Dr. Anjali Verma"
      )
      setBookingSuccess({ id: res.appointment_id, msg: res.message })
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to book appointment")
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-full font-body">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M13 15l-5-5 5-5" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="font-display font-black text-base text-slate-800 leading-tight">
              {t("bookAppointment")}
            </h1>
            <p className="text-[11px] text-teal-700 font-semibold">
              Primary Health Centre (PHC) & Teleconsult
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* Doctor Card */}
        <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-teal-600/20">
            👩‍⚕️
          </div>
          <div className="flex-1">
            <h3 className="font-display font-black text-slate-800 text-base">{t("drName")}</h3>
            <div className="text-teal-700 text-xs font-bold">{t("drRole")}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">Community Health Centre · Govt of India</div>
          </div>
        </div>

        {bookingSuccess ? (
          /* Confirmation card */
          <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-3 sc-fade-in shadow-sm">
            <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl mx-auto shadow-md">
              ✓
            </div>
            <h2 className="font-display font-black text-lg text-emerald-950">
              {t("appointmentBookedSuccess")}
            </h2>
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
              {bookingSuccess.msg}
            </p>
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-200 text-xs text-slate-700 font-mono">
              Booking Ref: <span className="font-bold text-emerald-800">{bookingSuccess.id}</span>
            </div>
            <div className="pt-2">
              <button
                onClick={onDone}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                {t("done")} →
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <>
            {/* Date selection */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t("selectDate")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Today", val: todayStr },
                  { label: "Tomorrow", val: tomorrow },
                  { label: "Next Day", val: dayAfter },
                ].map((d) => (
                  <button
                    key={d.val}
                    onClick={() => setSelectedDate(d.val)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                      selectedDate === d.val
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div>{d.label}</div>
                    <div className="text-[10px] opacity-80">{d.val}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot selection */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {t("selectTimeSlot")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition text-center ${
                      selectedSlot === slot
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    ⏰ {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Reason / Clinical Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleConfirm}
                disabled={booking}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-2xl shadow-lg shadow-teal-600/20 transition flex items-center justify-center gap-2"
              >
                {booking ? t("loading") : `✓ ${t("confirmBooking")}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
