"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/common/Field";
import { authService } from "@/services/auth.service";

interface Props {
  phone: string;
  onVerified: (otp: string) => void;
}

const RESEND_SECONDS = 45;

export function OtpForm({ phone, onVerified }: Props) {
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      const result = await authService.sendOtp(phone);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setInfo(result.message);
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification code.");
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    setVerifying(true);
    setError(null);
    try {
      const result = await authService.verifyOtp(phone, otp.trim());
      if (!result.success) {
        setError(result.message || "Invalid or expired verification code.");
        setVerified(false);
        return;
      }
      setVerified(true);
      setInfo("Phone number verified.");
      onVerified(otp.trim());
    } catch (err) {
      setVerified(false);
      setError(err instanceof Error ? err.message : "Invalid or expired verification code.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-base text-muted">
        We will send an SMS code to <strong className="text-ink">{phone}</strong>. Enter it only after it arrives.
        This screen will not mark your phone as verified until the server confirms the code.
      </p>
      <Button type="button" variant="secondary" onClick={() => void sendCode()} disabled={sending || seconds > 0 && info !== null}>
        {sending ? "Sending code…" : info ? (seconds > 0 ? `Resend in ${seconds}s` : "Resend code") : "Send verification code"}
      </Button>
      <TextField
        label="Verification code"
        name="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        maxLength={8}
      />
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {info && !error ? <p className="text-sm text-teal-dark">{info}</p> : null}
      {verified ? <p className="text-sm font-semibold text-green-800">Phone verified by the verification service.</p> : null}
      <Button type="button" onClick={() => void verify()} disabled={verifying || otp.trim().length < 4}>
        {verifying ? "Checking code…" : "Verify phone"}
      </Button>
    </div>
  );
}
