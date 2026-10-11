"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { TextField } from "@/components/common/Field";
import { homePathForRole, useAuth } from "@/providers/auth-provider";

function LoginForm() {
  const { login } = useAuth();
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
      const next = search.get("next");
      router.replace(next || homePathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-10">
      <Link href="/" className="text-sm font-semibold text-teal">
        Back
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-muted">Use the mobile number and password for your SwasthyaConnect account.</p>
      <Card className="mt-6">
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <TextField
            label="Mobile number"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-base">
        New here?{" "}
        <Link className="font-semibold text-teal" href="/signup">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-base">
        Clinician?{" "}
        <Link className="font-semibold text-teal" href="/login/clinician">
          Open clinician sign in
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading sign in…</p>}>
      <LoginForm />
    </Suspense>
  );
}
