"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useI18n } from "@/lib/i18n";

export default function LandingPage() {
  const { t, language } = useI18n();
  const features =
    language === "hi"
      ? [
          ["आपके रिकॉर्ड", "दवाएं, रिपोर्ट और पिछली विज़िट एक ही जगह।"],
          ["पास की दवा दुकानें", "आपके स्थान से दूरी के अनुसार, दवा के स्टॉक के साथ।"],
          ["एनीमिया जांच", "आँख की फोटो से स्क्रीनिंग। यह निदान नहीं है; डॉक्टर ही निदान करते हैं।"],
        ]
      : [
          ["Your records", "Medications, reports and past visits in one place."],
          ["Nearby pharmacies", "Sorted by distance from you, with recorded medicine stock."],
          ["Anaemia check", "Screening from an eye photo. It is not a diagnosis; a doctor decides."],
        ];

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">{t("appName")}</p>
        <LanguageToggle />
      </div>
      <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl">
        {language === "hi" ? "स्वास्थ्य सेवा, आपके घर के पास।" : "Healthcare that meets people where they live."}
      </h1>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-5 font-semibold text-white">
          {t("createAccount")}
        </Link>
        <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 font-semibold">
          {t("signIn")}
        </Link>
        <Link href="/doctor/login" className="inline-flex min-h-12 items-center justify-center px-3 font-semibold text-teal">
          {t("clinicianPrompt")}
        </Link>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {features.map(([title, copy]) => (
          <li key={title} className="rounded-2xl border border-line bg-elevated p-5">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-muted">{copy}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
