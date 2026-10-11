"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout, FormError } from "@/features/auth/AuthLayout";
import { homePathForRole } from "@/lib/auth-storage";

export default function ClinicianLoginPage() {
  const { clinicianLogin } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await clinicianLogin(identifier, password);
      router.replace(homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Clinician sign in"
      subtitle="For registered doctors and administrators."
      footer={
        <>
          <p>New doctor? <Link className="font-semibold text-teal" href="/doctor/signup">Register for verification</Link></p>
          <p><Link className="font-semibold text-teal" href="/login">Patient sign in</Link></p>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <TextField label="Mobile number or email" name="identifier" autoComplete="username" required
                   value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" required
                   value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
      </form>
    </AuthLayout>
  );
}
