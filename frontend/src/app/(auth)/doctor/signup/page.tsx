"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout, FormError } from "@/features/auth/AuthLayout";
import { OtpForm } from "@/features/auth/OtpForm";

const EMPTY = {
  name: "", phone: "", email: "", password: "", specialization: "", qualification: "",
  license_number: "", experience_years: "0", clinic_name: "", location: "",
};

export default function DoctorSignupPage() {
  const { doctorSignup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (field: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await doctorSignup({
        ...form,
        experience_years: Number(form.experience_years || 0),
        clinic_name: form.clinic_name || undefined,
      });
      router.replace("/clinician");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Doctor registration"
      subtitle="Your account can see patient data only after an administrator verifies your medical registration number."
      footer={<p>Already registered? <Link className="font-semibold text-teal" href="/doctor/login">Sign in</Link></p>}
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField label="Full name" name="name" autoComplete="name" required value={form.name} onChange={update("name")} />
        <TextField label="Mobile number" name="phone" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={update("phone")} />
        <OtpForm phone={form.phone} onVerified={() => undefined} />
        <TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update("email")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Specialisation" name="specialization" required value={form.specialization} onChange={update("specialization")} />
          <TextField label="Qualification" name="qualification" required placeholder="e.g. MBBS, MD" value={form.qualification} onChange={update("qualification")} />
          <TextField label="Medical registration number" name="license_number" required value={form.license_number} onChange={update("license_number")} />
          <TextField label="Years of experience" name="experience_years" type="number" min={0} max={70} value={form.experience_years} onChange={update("experience_years")} />
        </div>
        <TextField label="Clinic or hospital (optional)" name="clinic_name" value={form.clinic_name} onChange={update("clinic_name")} />
        <TextField label="City / district" name="location" required value={form.location} onChange={update("location")} />
        <TextField label="Password" name="password" type="password" autoComplete="new-password" required minLength={8}
                   value={form.password} onChange={update("password")} hint="At least 8 characters" />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Registering..." : "Register"}</Button>
      </form>
    </AuthLayout>
  );
}
