export interface NavItem {
  href: string;
  label: string;
  short: string;
}

export const patientNav: NavItem[] = [
  { href: "/dashboard", label: "Home", short: "Home" },
  { href: "/health-records", label: "Health records", short: "Health" },
  { href: "/pharmacies", label: "Pharmacies", short: "Pharmacy" },
  { href: "/screening", label: "Screening", short: "Screen" },
  { href: "/profile", label: "Profile", short: "Profile" },
];

export const patientMore: NavItem[] = [
  { href: "/medications", label: "Medications", short: "Meds" },
  { href: "/reports", label: "Reports", short: "Reports" },
  { href: "/prescriptions", label: "Prescriptions", short: "Rx" },
  { href: "/appointments", label: "Appointments", short: "Visits" },
  { href: "/doctors", label: "Doctors", short: "Doctors" },
  { href: "/settings", label: "Settings", short: "Settings" },
];

export const clinicianNav: NavItem[] = [
  { href: "/clinician", label: "Queue", short: "Queue" },
  { href: "/clinician/appointments", label: "Appointments", short: "Visits" },
  { href: "/profile", label: "Profile", short: "Profile" },
];
