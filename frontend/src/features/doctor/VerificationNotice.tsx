"use client";

import { useAuth } from "@/features/auth/auth-provider";

/** Unverified doctors can sign in but cannot see patient data until an admin verifies them. */
export function useDoctorVerified(): boolean {
  const { user } = useAuth();
  return user?.doctor_verification_status === "VERIFIED";
}

export function VerificationNotice() {
  const { user } = useAuth();
  const status = user?.doctor_verification_status;
  if (status === "VERIFIED") return null;
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status">
      <p className="font-bold">{status === "REJECTED" ? "Registration not approved" : "Awaiting verification"}</p>
      <p className="mt-1">
        {status === "REJECTED"
          ? "An administrator could not verify your medical registration. Contact the SwasthyaConnect administrator."
          : "An administrator is checking your medical registration number. Patient cases appear here once you are verified."}
      </p>
    </div>
  );
}
