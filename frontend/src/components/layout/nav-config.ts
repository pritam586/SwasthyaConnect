import type { TranslationKey } from "@/lib/i18n";
import type { UserRole } from "@/types/user";

export interface NavItem {
  href: string;
  /** Translation key for patient navigation; plain label for clinician/admin. */
  label: TranslationKey | string;
  translate: boolean;
}

export const navByRole: Record<UserRole, NavItem[]> = {
  PATIENT: [
    { href: "/dashboard", label: "navHome", translate: true },
    { href: "/screening", label: "navScreening", translate: true },
    { href: "/records", label: "navRecords", translate: true },
    { href: "/pharmacies", label: "navPharmacies", translate: true },
    { href: "/doctors", label: "navDoctors", translate: true },
    { href: "/appointments", label: "navAppointments", translate: true },
    { href: "/profile", label: "navProfile", translate: true },
  ],
  DOCTOR: [
    { href: "/clinician", label: "Case queue", translate: false },
    { href: "/clinician/appointments", label: "Appointments", translate: false },
    { href: "/clinician/settings", label: "Availability", translate: false },
  ],
  ADMIN: [{ href: "/admin", label: "Administration", translate: false }],
};
