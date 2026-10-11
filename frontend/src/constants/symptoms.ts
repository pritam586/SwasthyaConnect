import type { TranslationKey } from "@/lib/i18n";

/*
 * The question text is shown in the patient's language, but the backend triage rules match
 * English keywords, so each answer is sent as a fixed English statement.
 * Option order: [daily, sometimes, rarely].
 */
export const SYMPTOM_QUESTIONS: { question: TranslationKey; statements: [string, string, string] }[] = [
  {
    question: "q1",
    statements: ["fatigue or low energy most days", "fatigue or low energy occasionally", "no tiredness or low energy"],
  },
  {
    question: "q2",
    statements: ["breathless on exertion most days", "breathless on exertion occasionally", "no breathing difficulty on exertion"],
  },
  {
    question: "q3",
    statements: [
      "dizzy, headache or palpitations most days",
      "dizzy, headache or palpitations occasionally",
      "no light-headedness or head pain",
    ],
  },
];

export const ANSWER_OPTIONS: TranslationKey[] = ["optDaily", "optSometimes", "optRarely"];
