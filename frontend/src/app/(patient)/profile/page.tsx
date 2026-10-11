"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/auth-provider";
import { AbhaCard } from "@/features/patient/AbhaCard";
import { useAsync } from "@/hooks/use-async";
import { useI18n } from "@/lib/i18n";
import { patientService } from "@/services/patient.service";
import type { PatientProfile, ProfileUpdate } from "@/types/user";

const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const TEXT_FIELDS = ["name", "location", "address", "emergency_contact"] as const;
const LONG_FIELDS = ["allergies", "chronic_conditions", "medical_history"] as const;
const LABELS: Record<string, string> = {
  name: "Full name", location: "City / village / district", address: "Address", emergency_contact: "Emergency contact",
  allergies: "Allergies", chronic_conditions: "Long-term conditions", medical_history: "Medical history",
};

export default function ProfilePage() {
  const { t } = useI18n();
  const { refreshUser } = useAuth();
  const profile = useAsync(() => patientService.profile(), []);
  const [form, setForm] = useState<PatientProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data) setForm(profile.data);
  }, [profile.data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError(null);
    setSaved(false);
    const changes: ProfileUpdate = {
      name: form.name, location: form.location, age: form.age, gender: form.gender,
      date_of_birth: form.date_of_birth || null, blood_group: form.blood_group || null, address: form.address,
      emergency_contact: form.emergency_contact, allergies: form.allergies, chronic_conditions: form.chronic_conditions,
      medical_history: form.medical_history,
    };
    try {
      profile.setData(await patientService.updateProfile(changes));
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  if (profile.status === "loading" || (!form && profile.status !== "error")) return <LoadingState />;
  if (profile.status === "error" || !form) return <ErrorState message={profile.error ?? ""} onRetry={() => void profile.reload()} />;

  const set = (field: keyof PatientProfile, value: string | number | null) => setForm({ ...form, [field]: value });

  return (
    <>
      <PageHeader title={t("navProfile")} description={`${t("phoneNumber")}: ${form.phone}`} />
      <div className="space-y-4">
        <Card>
          <form className="space-y-4" onSubmit={(e) => void save(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              {TEXT_FIELDS.map((field) => (
                <TextField key={field} label={LABELS[field]} name={field} value={form[field] ?? ""} onChange={(e) => set(field, e.target.value)} />
              ))}
              <TextField label={t("age")} name="age" type="number" min={1} max={120} value={form.age ?? ""}
                         onChange={(e) => set("age", e.target.value ? Number(e.target.value) : null)} />
              <SelectField label={t("gender")} name="gender" value={form.gender ?? ""} onChange={(e) => set("gender", e.target.value)}>
                <option value="Female">{t("female")}</option>
                <option value="Male">{t("male")}</option>
                <option value="Other">{t("other")}</option>
              </SelectField>
              <TextField label="Date of birth" name="date_of_birth" type="date" value={form.date_of_birth ?? ""}
                         onChange={(e) => set("date_of_birth", e.target.value)} />
              <SelectField label="Blood group" name="blood_group" value={form.blood_group ?? ""} onChange={(e) => set("blood_group", e.target.value)}>
                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group || "Not known"}</option>)}
              </SelectField>
            </div>
            {LONG_FIELDS.map((field) => (
              <TextAreaField key={field} label={LABELS[field]} name={field} value={form[field] ?? ""} onChange={(e) => set(field, e.target.value)} />
            ))}
            {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
            {saved ? <p className="text-sm text-green-800" role="status">Saved.</p> : null}
            <Button type="submit">Save profile</Button>
          </form>
        </Card>
        <AbhaCard abhaId={form.abha_id} onChange={(abhaId) => setForm({ ...form, abha_id: abhaId })} />
      </div>
    </>
  );
}
