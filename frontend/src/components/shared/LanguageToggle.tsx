"use client";

import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLanguage(language === "en" ? "hi" : "en")}
      className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink"
      aria-label={language === "en" ? "हिंदी में देखें" : "View in English"}
    >
      {t("language")}
    </button>
  );
}
