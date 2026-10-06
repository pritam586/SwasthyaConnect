import React, { useState, useEffect } from "react"
import { translations, Language } from "../../i18n"
import {
  fetchNearbyPharmacies,
  findAllPrescriptionMedicines,
  PharmacyNearbyResult,
  MedicineAvailability,
} from "./pharmacyService"

interface PharmacyScreenProps {
  onBack: () => void
  lang: Language
  initialMedicine?: string
  initialMedicines?: string[]
  userLocationName?: string
}

const PRESET_LOCATIONS = [
  { name: "Pune, Maharashtra", lat: 18.5204, lon: 73.8567 },
  { name: "Hapur, Uttar Pradesh", lat: 28.7298, lon: 77.7760 },
  { name: "Meerut, Uttar Pradesh", lat: 28.9845, lon: 77.7064 },
]

export function PharmacyScreen({
  onBack,
  lang,
  initialMedicine = "",
  initialMedicines = [],
  userLocationName = "Pune, Maharashtra",
}: PharmacyScreenProps) {
  const t = (k: keyof typeof translations.en) => (translations[lang] || translations.en)[k] || translations.en[k]

  // Default coordinate: match Pune or Hapur based on user location name
  const defaultLoc =
    PRESET_LOCATIONS.find((l) => userLocationName.toLowerCase().includes(l.name.split(",")[0].toLowerCase())) ||
    PRESET_LOCATIONS[0]

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: defaultLoc.lat,
    lon: defaultLoc.lon,
  })
  const [activeLocationLabel, setActiveLocationLabel] = useState<string>(userLocationName)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const [selectedMed, setSelectedMed] = useState<string>(initialMedicine)
  const [multiMeds, setMultiMeds] = useState<string[]>(initialMedicines)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterGovtOnly, setFilterGovtOnly] = useState(false)

  const [pharmacies, setPharmacies] = useState<PharmacyNearbyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activePinId, setActivePinId] = useState<string | null>(null)

  // Geolocation handler
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.")
      return
    }
    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = {
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        }
        setCoords(newCoords)
        setActiveLocationLabel(`GPS: ${newCoords.lat}, ${newCoords.lon}`)
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        setGpsError(`Could not access GPS (${err.message}). Using manual location.`)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  // Load pharmacies whenever coordinates or medicine changes
  useEffect(() => {
    let isCancelled = false
    async function loadData() {
      setLoading(true)
      try {
        let results: PharmacyNearbyResult[] = []
        if (multiMeds.length > 1 && !selectedMed) {
          // Multi-medicine search
          results = await findAllPrescriptionMedicines(coords.lat, coords.lon, multiMeds)
        } else {
          // Single medicine search or general nearby
          const queryMed = selectedMed || searchQuery
          results = await fetchNearbyPharmacies(coords.lat, coords.lon, queryMed)
        }
        if (!isCancelled) {
          setPharmacies(results)
        }
      } catch (e) {
        console.warn("Failed to fetch pharmacies, fallback to local list", e)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      isCancelled = true
    }
  }, [coords, selectedMed, multiMeds, searchQuery])

  const filteredPharmacies = filterGovtOnly
    ? pharmacies.filter((p) => p.is_jan_aushadhi)
    : pharmacies

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
              {t("nearestPharmacyTitle")}
            </h1>
            <p className="text-[11px] text-teal-700 font-semibold">
              {t("janAushadhiKendra")} & Chemist Locator
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Location selector & GPS */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="text-teal-600">📍</span> {activeLocationLabel}
            </span>
            <button
              onClick={handleGetGpsLocation}
              disabled={gpsLoading}
              className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition flex items-center gap-1"
            >
              {gpsLoading ? t("detectingLocation") : `📡 ${t("useCurrentLocation")}`}
            </button>
          </div>

          {gpsError && (
            <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              {gpsError}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <label className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
              {t("manualLocationPrompt")}:
            </label>
            <select
              value={activeLocationLabel}
              onChange={(e) => {
                const sel = PRESET_LOCATIONS.find((l) => l.name === e.target.value)
                if (sel) {
                  setCoords({ lat: sel.lat, lon: sel.lon })
                  setActiveLocationLabel(sel.name)
                }
              }}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-semibold outline-none"
            >
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.name} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Medicine Context Banner & Search */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          {multiMeds.length > 0 && (
            <div className="mb-2">
              <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                {t("findAllMedsNearby")} ({multiMeds.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedMed("")}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    !selectedMed ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  ✓ All Medicines
                </button>
                {multiMeds.map((med) => (
                  <button
                    key={med}
                    onClick={() => setSelectedMed(med)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                      selectedMed === med
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {med}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search medicine (e.g. Ferrous Sulfate, Folic Acid)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-500"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Jan Aushadhi Kendra Filter Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-600 font-medium">Show Govt. Kendra only</span>
            <button
              onClick={() => setFilterGovtOnly(!filterGovtOnly)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                filterGovtOnly ? "bg-orange-500 justify-end" : "bg-slate-300 justify-start"
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
            </button>
          </div>
        </div>

        {/* Visual Map Radar Widget */}
        <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Vicinity Radar (Haversine Grid)
            </div>
            <div className="text-[10px] text-teal-300 font-mono">Radius: 30 km</div>
          </div>

          <div className="relative h-40 bg-teal-950/40 rounded-xl border border-teal-800/40 flex items-center justify-center overflow-hidden">
            {/* Concentric radar circles */}
            <div className="absolute w-32 h-32 rounded-full border border-teal-500/20" />
            <div className="absolute w-20 h-20 rounded-full border border-teal-500/30" />
            <div className="absolute w-10 h-10 rounded-full border border-teal-500/40" />

            {/* User Center Pin */}
            <div className="absolute flex flex-col items-center z-10">
              <div className="w-5 h-5 rounded-full bg-teal-400 border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-teal-950 font-bold">
                📍
              </div>
              <span className="text-[9px] font-bold text-teal-200 mt-0.5 bg-black/60 px-1 rounded">You</span>
            </div>

            {/* Pharmacy Pins rendered dynamically */}
            {filteredPharmacies.slice(0, 5).map((p, idx) => {
              // Map distance & index to coordinates on radar
              const angle = (idx * 72 * Math.PI) / 180
              const distancePx = Math.min(65, Math.max(25, p.distance_km * 18))
              const left = 50 + (Math.cos(angle) * distancePx * 100) / 160
              const top = 50 + (Math.sin(angle) * distancePx * 100) / 160

              return (
                <button
                  key={p.id}
                  onClick={() => setActivePinId(p.id)}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 p-1 rounded-full transition-transform hover:scale-125 z-10 flex flex-col items-center ${
                    activePinId === p.id ? "scale-125 ring-2 ring-white" : ""
                  }`}
                  title={`${p.name} (${p.distance_km} km)`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md ${
                      p.is_jan_aushadhi ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
                    }`}
                  >
                    {p.is_jan_aushadhi ? "🏛️" : "💊"}
                  </div>
                  <span className="text-[8px] font-bold text-white bg-black/70 px-1 rounded whitespace-nowrap mt-0.5">
                    {p.distance_km}km
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-2.5 text-[10px] text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Govt Kendra
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Retail Chemist
            </span>
            <span className="font-semibold text-teal-300">{filteredPharmacies.length} pharmacies found</span>
          </div>
        </div>

        {/* Pharmacy Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs text-slate-500 font-medium">{t("loading")}</div>
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="text-3xl">🏬</div>
              <div className="font-bold text-slate-700 text-sm">No pharmacies found in this radius</div>
              <p className="text-xs text-slate-400">Try changing your location or selecting another district.</p>
            </div>
          ) : (
            filteredPharmacies.map((pharmacy) => {
              const isHighlighted = activePinId === pharmacy.id
              const hasVerifiedStock =
                pharmacy.availability_status === "AVAILABLE" ||
                pharmacy.matched_medicines.some((m) => m.status === "AVAILABLE")

              return (
                <div
                  key={pharmacy.id}
                  className={`bg-white rounded-2xl border-2 p-4 transition-all shadow-sm ${
                    isHighlighted ? "border-teal-500 ring-2 ring-teal-200" : "border-slate-200 hover:border-teal-300"
                  }`}
                >
                  {/* Top row: Name & Kendra Badge */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pharmacy.is_jan_aushadhi ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                            🏛️ {t("janAushadhiKendra")}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                            💊 {t("retailPharmacy")}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          ⭐ {pharmacy.rating}
                        </span>
                      </div>
                      <h3 className="font-display font-black text-sm text-slate-800 mt-1">{pharmacy.name}</h3>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{pharmacy.address}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200">
                        {pharmacy.distance_km} km
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">{pharmacy.open_hours}</div>
                    </div>
                  </div>

                  {/* Stock Availability Breakdown (Strict Safety Rule Compliance) */}
                  <div className="my-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                    {pharmacy.matched_medicines.length > 0 ? (
                      pharmacy.matched_medicines.map((med, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div className="flex-1">
                            <span className="font-bold text-slate-700">{med.medicine_name}</span>
                            {med.is_jan_aushadhi && med.jan_aushadhi_price_inr && (
                              <span className="text-[10px] text-emerald-700 font-bold ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded">
                                ₹{med.jan_aushadhi_price_inr} (Govt Subsidized)
                              </span>
                            )}
                          </div>
                          <div>
                            {med.status === "AVAILABLE" ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                ✓ {t("stockAvailable")} ({med.quantity} in stock)
                              </span>
                            ) : med.status === "OUT_OF_STOCK" ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                                ✗ {t("outOfStock")}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                ⚠️ {t("stockUnknown")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50">
                        <span className="text-slate-600 font-medium">Supplements & General Stock</span>
                        {pharmacy.is_jan_aushadhi ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            ✓ {t("stockAvailable")} (Iron & Folic Acid)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            ⚠️ {t("stockUnknown")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions: Directions & Phone */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={pharmacy.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <span>🗺️</span> {t("getDirections")}
                    </a>

                    {pharmacy.phone && (
                      <a
                        href={`tel:${pharmacy.phone.replace(/[^0-9+]/g, "")}`}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                      >
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
