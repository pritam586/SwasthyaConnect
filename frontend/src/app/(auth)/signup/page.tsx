"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout, FormError } from "@/features/auth/AuthLayout";
import { OtpForm } from "@/features/auth/OtpForm";
import { useI18n } from "@/lib/i18n";
import type { Gender } from "@/types/user";

export default function SignupPage() {
  const { signup } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", name: "", password: "", age: "", gender: "Female" as Gender, location: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signup({ ...form, age: Number(form.age) });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t("createAccount")}
      footer={<p><Link className="font-semibold text-teal" href="/login">{t("existingUserPrompt")}</Link></p>}
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField label={t("phoneNumber")} name="phone" inputMode="tel" autoComplete="tel" required
                   value={form.phone} onChange={update("phone")} hint="10-digit Indian mobile number" />
        <OtpForm phone={form.phone} onVerified={() => undefined} />
        <TextField label={t("fullName")} name="name" autoComplete="name" required minLength={2}
                   value={form.name} onChange={update("name")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t("age")} name="age" type="number" min={1} max={120} required value={form.age} onChange={update("age")} />
          <SelectField label={t("gender")} name="gender" value={form.gender} onChange={update("gender")}>
            <option value="Female">{t("female")}</option>
            <option value="Male">{t("male")}</option>
            <option value="Other">{t("other")}</option>
          </SelectField>
        </div>
        <TextField label={t("location")} name="location" autoComplete="address-level2" required minLength={2}
                   value={form.location} onChange={update("location")} />
        <TextField label={t("password")} name="password" type="password" autoComplete="new-password" required minLength={8}
                   value={form.password} onChange={update("password")} hint="At least 8 characters" />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={loading}>{loading ? t("loading") : t("createAccount")}</Button>
      </form>
    </AuthLayout>
  );
}
