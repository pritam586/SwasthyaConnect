"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/*
 * English and Hindi strings for the patient-facing flows (carried over from the earlier app).
 * Clinician and admin screens are English only.
 */
const en = {
  appName: "SwasthyaConnect",
  language: "हिंदी",
  signIn: "Sign in",
  signOut: "Sign out",
  createAccount: "Create account",
  phoneNumber: "Mobile number",
  password: "Password",
  fullName: "Full name",
  age: "Age",
  gender: "Gender",
  male: "Male",
  female: "Female",
  other: "Other",
  location: "City / village / district",
  sendOtp: "Send OTP (SMS)",
  verifyOtp: "Verify OTP",
  enterOtp: "Enter the 6-digit code",
  newUserPrompt: "New patient? Create an account",
  existingUserPrompt: "Already have an account? Sign in",
  clinicianPrompt: "Doctor or staff? Use the clinician sign-in",
  navHome: "Home",
  navScreening: "Anaemia check",
  navRecords: "Records",
  navPharmacies: "Pharmacies",
  navDoctors: "Doctors",
  navAppointments: "Appointments",
  navProfile: "Profile",
  startScreening: "Start anaemia check",
  consentTitle: "Before you start",
  consent1: "Share screening details with a doctor for this consultation",
  consent2: "Allow automated analysis of the eye photo for anaemia screening",
  consent3: "Save the visit to my health record",
  acceptConsent: "I agree, continue",
  eyeScanTitle: "Guided eye photo",
  instr1: "Find good light: daylight or a bright room is best.",
  instr2: "Gently pull down your lower eyelid to show the inner lining.",
  instr3: "Hold the phone 15-20 cm away and keep it steady.",
  captureBtn: "Take photo",
  uploadBtn: "Upload photo",
  retake: "Retake photo",
  analyze: "Analyse photo",
  analyzing: "Analysing the photo...",
  screeningResultTitle: "Eye screening result",
  pallorDetected: "Pallor flagged (anaemia possible)",
  normalErythema: "No pallor flagged (anaemia less likely)",
  inconclusive: "Inconclusive: retake the photo",
  confidence: "Model confidence",
  showHeatmap: "Show heatmap",
  hideHeatmap: "Hide heatmap",
  screeningUnavailable: "Photo screening is not available right now. You can continue with the symptom questions.",
  responsibleAiTitle: "Screening, not diagnosis",
  responsibleAiBody: "This result helps doctors prioritise. Only a licensed doctor makes a diagnosis or prescribes medicine.",
  continueToSymptoms: "Continue to symptom questions",
  symptomTitle: "Symptom questions",
  q1: "Do you feel tired or low on energy most days?",
  q2: "Do you get breathless when climbing stairs or walking fast?",
  q3: "Have you had dizziness, headaches or palpitations recently?",
  optDaily: "Yes, almost every day",
  optSometimes: "Sometimes",
  optRarely: "No / rarely",
  submitTriage: "See my result",
  triageTitle: "Your triage result",
  urgencyGreen: "Green: low risk, self-care",
  urgencyYellow: "Yellow: see a doctor soon",
  urgencyRed: "Red: get medical help now",
  emergencyCall: "National ambulance: call 108 or 112",
  connectDoctor: "Consult a doctor now",
  bookAppointment: "Book an appointment",
  findPharmacy: "Find a nearby pharmacy",
  selfCareTitle: "Self-care and nutrition",
  diet1: "Green leafy vegetables: spinach, fenugreek, moringa",
  diet2: "Iron-rich pulses: masoor and moong dal, roasted chana",
  diet3: "Vitamin C fruit with meals: amla, lemon, orange (helps iron absorption)",
  diet4: "Jaggery and roasted peanuts",
  pharmacyTitle: "Nearby pharmacies",
  useMyLocation: "Use my location",
  locationDenied: "Location access was denied. Results are listed by name, not distance. Allow location in your browser settings to sort by distance.",
  locationUnavailable: "Your location could not be found. Results are listed by name, not distance.",
  medicinesToFind: "Medicines to look for (optional)",
  search: "Search",
  janAushadhi: "Jan Aushadhi Kendra",
  directions: "Directions",
  inStock: "In stock",
  partialStock: "Some medicines in stock",
  outOfStock: "Out of stock",
  stockUnknown: "Stock not recorded: call first",
  awayKm: "away",
  loading: "Loading...",
  tryAgain: "Try again",
} as const;

export type TranslationKey = keyof typeof en;

const hi: Record<TranslationKey, string> = {
  appName: "स्वास्थ्य कनेक्ट",
  language: "English",
  signIn: "साइन इन करें",
  signOut: "लॉगआउट",
  createAccount: "नया खाता बनाएं",
  phoneNumber: "मोबाइल नंबर",
  password: "पासवर्ड",
  fullName: "पूरा नाम",
  age: "उम्र",
  gender: "लिंग",
  male: "पुरुष",
  female: "महिला",
  other: "अन्य",
  location: "शहर / गाँव / जिला",
  sendOtp: "ओटीपी भेजें (SMS)",
  verifyOtp: "ओटीपी सत्यापित करें",
  enterOtp: "6 अंकों का ओटीपी दर्ज करें",
  newUserPrompt: "नए मरीज हैं? नया खाता बनाएं",
  existingUserPrompt: "पहले से खाता है? साइन इन करें",
  clinicianPrompt: "डॉक्टर या स्टाफ? चिकित्सक लॉगिन करें",
  navHome: "होम",
  navScreening: "एनीमिया जांच",
  navRecords: "रिकॉर्ड",
  navPharmacies: "दवा दुकान",
  navDoctors: "डॉक्टर",
  navAppointments: "अपॉइंटमेंट",
  navProfile: "प्रोफाइल",
  startScreening: "एनीमिया जांच शुरू करें",
  consentTitle: "शुरू करने से पहले",
  consent1: "इस परामर्श के लिए जांच विवरण डॉक्टर के साथ साझा करें",
  consent2: "एनीमिया जांच के लिए आँख की फोटो के स्वचालित विश्लेषण की अनुमति दें",
  consent3: "यह विज़िट मेरे स्वास्थ्य रिकॉर्ड में सुरक्षित रखें",
  acceptConsent: "स्वीकार करें और आगे बढ़ें",
  eyeScanTitle: "मार्गदर्शित आँख फोटो",
  instr1: "अच्छी रोशनी वाली जगह पर जाएं — प्राकृतिक धूप या चमकदार कमरा सबसे अच्छा है।",
  instr2: "अंदरूनी पलक दिखाने के लिए अपनी निचली पलक को धीरे से नीचे खींचें।",
  instr3: "फोन को 15-20 सेमी दूर रखें और स्थिर रखें।",
  captureBtn: "फोटो खींचें",
  uploadBtn: "फोटो अपलोड करें",
  retake: "फोटो दोबारा लें",
  analyze: "फोटो का विश्लेषण करें",
  analyzing: "फोटो का विश्लेषण जारी है...",
  screeningResultTitle: "आँख स्क्रीनिंग परिणाम",
  pallorDetected: "पीलापन पाया गया (एनीमिया की संभावना)",
  normalErythema: "पीलापन नहीं पाया गया (एनीमिया की संभावना कम)",
  inconclusive: "अनिर्णायक: फोटो दोबारा लें",
  confidence: "मॉडल का भरोसा",
  showHeatmap: "हीटमैप दिखाएं",
  hideHeatmap: "हीटमैप छिपाएं",
  screeningUnavailable: "फोटो स्क्रीनिंग अभी उपलब्ध नहीं है। आप लक्षण प्रश्नों के साथ आगे बढ़ सकते हैं।",
  responsibleAiTitle: "स्क्रीनिंग, निदान नहीं",
  responsibleAiBody: "यह परिणाम डॉक्टरों को प्राथमिकता तय करने में मदद करता है। निदान और दवा केवल लाइसेंस प्राप्त डॉक्टर ही तय करते हैं।",
  continueToSymptoms: "लक्षण प्रश्नों की ओर बढ़ें",
  symptomTitle: "लक्षण प्रश्न",
  q1: "क्या आपको अधिकांश दिनों में थकान या ऊर्जा की कमी महसूस होती है?",
  q2: "क्या सीढ़ियाँ चढ़ते या तेज चलते समय आपकी सांस फूलती है?",
  q3: "क्या आपको हाल ही में चक्कर आना, सिरदर्द या घबराहट महसूस हुई है?",
  optDaily: "हाँ, लगभग हर दिन",
  optSometimes: "कभी-कभी",
  optRarely: "नहीं / बहुत कम",
  submitTriage: "मेरा परिणाम देखें",
  triageTitle: "आपका ट्रायज परिणाम",
  urgencyGreen: "ग्रीन: कम जोखिम, स्व-देखभाल",
  urgencyYellow: "येलो: जल्द डॉक्टर से मिलें",
  urgencyRed: "रेड: तुरंत चिकित्सा सहायता लें",
  emergencyCall: "राष्ट्रीय एम्बुलेंस: 108 या 112 पर कॉल करें",
  connectDoctor: "अभी डॉक्टर से परामर्श करें",
  bookAppointment: "अपॉइंटमेंट बुक करें",
  findPharmacy: "पास की दवा दुकान खोजें",
  selfCareTitle: "पोषण एवं स्व-देखभाल",
  diet1: "हरी पत्तेदार सब्जियां: पालक, मेथी, सहजन (मोरिंगा)",
  diet2: "आयरन युक्त दालें: मसूर दाल, मूंग दाल, भुने चने",
  diet3: "भोजन के साथ विटामिन सी फल: आँवला, नींबू, संतरा (आयरन सोखने में सहायक)",
  diet4: "गुड़ और भुनी मूंगफली",
  pharmacyTitle: "पास की दवा दुकानें",
  useMyLocation: "मेरा स्थान उपयोग करें",
  locationDenied: "स्थान की अनुमति नहीं मिली। परिणाम दूरी के बजाय नाम से दिखाए गए हैं। दूरी से क्रम के लिए ब्राउज़र सेटिंग में स्थान की अनुमति दें।",
  locationUnavailable: "आपका स्थान नहीं मिल सका। परिणाम नाम से दिखाए गए हैं।",
  medicinesToFind: "खोजने के लिए दवाएं (वैकल्पिक)",
  search: "खोजें",
  janAushadhi: "जन औषधि केंद्र",
  directions: "रास्ता देखें",
  inStock: "स्टॉक में है",
  partialStock: "कुछ दवाएं स्टॉक में हैं",
  outOfStock: "स्टॉक में नहीं",
  stockUnknown: "स्टॉक दर्ज नहीं: पहले कॉल करें",
  awayKm: "दूर",
  loading: "कृपया प्रतीक्षा करें...",
  tryAgain: "फिर से प्रयास करें",
};

export type Language = "en" | "hi";
const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, hi };
const STORAGE_KEY = "sc_language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "hi" || saved === "en") setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: (key: TranslationKey) => dictionaries[language][key] }),
    [language, setLanguage],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useI18n must be used inside LanguageProvider");
  return context;
}
