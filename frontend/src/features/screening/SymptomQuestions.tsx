"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ANSWER_OPTIONS, SYMPTOM_QUESTIONS } from "@/constants/symptoms";
import { useI18n } from "@/lib/i18n";

export function SymptomQuestions({ busy, onSubmit }: { busy: boolean; onSubmit: (statements: string[]) => void }) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<(number | null)[]>(SYMPTOM_QUESTIONS.map(() => null));
  const complete = answers.every((answer) => answer !== null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (complete) onSubmit(answers.map((answer, index) => SYMPTOM_QUESTIONS[index].statements[answer as number]));
      }}
    >
      {SYMPTOM_QUESTIONS.map((item, questionIndex) => (
        <Card key={item.question}>
          <fieldset>
            <legend className="font-semibold">{t(item.question)}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {ANSWER_OPTIONS.map((option, optionIndex) => {
                const selected = answers[questionIndex] === optionIndex;
                return (
                  <label
                    key={option}
                    className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 font-semibold ${
                      selected ? "border-teal bg-teal-soft" : "border-line bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name={item.question}
                      checked={selected}
                      onChange={() => setAnswers((current) => current.map((value, i) => (i === questionIndex ? optionIndex : value)))}
                    />
                    {t(option)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Card>
      ))}
      <Button type="submit" className="w-full" disabled={!complete || busy}>
        {busy ? t("loading") : t("submitTriage")}
      </Button>
    </form>
  );
}
