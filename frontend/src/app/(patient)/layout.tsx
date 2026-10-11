import { AppShell } from "@/components/layout/AppShell";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="PATIENT">{children}</AppShell>;
}
