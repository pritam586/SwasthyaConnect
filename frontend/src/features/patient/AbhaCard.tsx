"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { patientService } from "@/services/patient.service";

/** ABHA linking in sandbox mode: format-checked and saved with consent, not yet verified with ABDM. */
export function AbhaCard({ abhaId, onChange }: { abhaId: string | null; onChange: (abhaId: string | null) => void }) {
  const [number, setNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function link(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const result = await patientService.linkAbha(number, consent);
      if (result.linked) onChange(result.abha_number);
      (result.linked ? setMessage : setError)(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Linking failed.");
    }
  }

  async function unlink() {
    await patientService.unlinkAbha();
    onChange(null);
    setMessage("ABHA number removed.");
  }

  return (
    <Card>
      <h2 className="font-bold">ABHA (Ayushman Bharat Health Account)</h2>
      <p className="mt-1 text-sm text-muted">Optional. Sandbox mode: the number is checked for format only, not yet verified with ABDM.</p>
      {abhaId ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="font-mono text-lg font-semibold">{abhaId}</p>
          <Button type="button" variant="ghost" onClick={() => void unlink()}>Remove</Button>
        </div>
      ) : (
        <form className="mt-3 space-y-3" onSubmit={(e) => void link(e)}>
          <TextField label="ABHA number (14 digits)" name="abha" inputMode="numeric" placeholder="12-3456-7890-1234"
                     value={number} onChange={(e) => setNumber(e.target.value)} />
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I consent to linking my ABHA number to my SwasthyaConnect record.</span>
          </label>
          <Button type="submit" disabled={!consent || number.replace(/\D/g, "").length !== 14}>Link ABHA</Button>
        </form>
      )}
      {message ? <p className="mt-2 text-sm text-green-800" role="status">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-700" role="alert">{error}</p> : null}
    </Card>
  );
}
