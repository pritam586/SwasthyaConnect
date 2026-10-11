"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { TextField } from "@/components/common/Field";
import { homePathForRole, useAuth } from "@/providers/auth-provider";

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
      setError(err instanceof Error ? err.message : "Clinician sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-10">
      <Link href="/login" className="text-sm font-semibold text-teal">
        Patient sign in
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Clinician sign in</h1>
      <p className="mt-2 text-muted">Use the phone or email on your clinician account. No demo credentials are filled in.</p>
      <Card className="mt-6">
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <TextField
            label="Phone or email"
            name="identifier"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <TextField
            label="Password"
            name="password"
            type="password"
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
            {loading ? "Checking…" : "Open workstation"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
