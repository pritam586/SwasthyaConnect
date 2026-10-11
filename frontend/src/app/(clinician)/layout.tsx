import { AppShell } from "@/components/layout/AppShell";

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="DOCTOR">{children}</AppShell>;
}
