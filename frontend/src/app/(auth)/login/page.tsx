"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout, FormError } from "@/features/auth/AuthLayout";
import { homePathForRole } from "@/lib/auth-storage";
import { useI18n } from "@/lib/i18n";

/** Only same-site relative paths are followed after sign-in (no open redirects). */
function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

function PatientLogin() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(phone, password);
      router.replace(safeNext(search.get("next")) ?? homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t("signIn")}
      footer={
        <>
          <p><Link className="font-semibold text-teal" href="/signup">{t("newUserPrompt")}</Link></p>
          <p><Link className="font-semibold text-teal" href="/doctor/login">{t("clinicianPrompt")}</Link></p>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField label={t("phoneNumber")} name="phone" inputMode="tel" autoComplete="tel" required
                   value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField label={t("password")} name="password" type="password" autoComplete="current-password" required
                   value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={loading}>{loading ? t("loading") : t("signIn")}</Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <PatientLogin />
    </Suspense>
  );
}
