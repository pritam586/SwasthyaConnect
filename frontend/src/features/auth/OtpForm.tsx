"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useI18n } from "@/lib/i18n";
import { authService } from "@/services/auth.service";

const RESEND_SECONDS = 45;

/** Sends an SMS code to `phone` and verifies it. The server remembers a successful check for signup. */
export function OtpForm({ phone, onVerified }: { phone: string; onVerified: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const result = await authService.sendOtp(phone);
      setSent(true);
      setDevCode(result.dev_code);
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await authService.verifyOtp(phone, code.trim());
      setVerified(true);
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The code is incorrect or has expired.");
    } finally {
      setBusy(false);
    }
  }

  if (verified) return <p className="font-semibold text-green-800">✓ Phone number verified.</p>;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-white p-3">
      <Button type="button" variant="secondary" onClick={() => void send()} disabled={busy || phone.length < 10 || seconds > 0}>
        {seconds > 0 ? `${t("sendOtp")} (${seconds}s)` : t("sendOtp")}
      </Button>
      {devCode ? (
        <p className="text-sm text-muted">Development mode: no SMS is sent. Your code is {devCode}.</p>
      ) : null}
      {sent ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField label={t("enterOtp")} name="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8}
                       value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
          <Button type="button" onClick={() => void verify()} disabled={busy || code.length < 4}>
            {t("verifyOtp")}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm font-medium text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
