"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clinicianNav, patientMore, patientNav } from "@/components/navigation/nav-config";
import { useAuth } from "@/providers/auth-provider";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 items-center rounded-xl px-3 text-base font-semibold ${
        active ? "bg-teal text-white" : "text-ink hover:bg-teal-soft"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isClinician = user?.role === "DOCTOR" || user?.role === "ADMIN";
  const primary = isClinician ? clinicianNav : patientNav;
  const extra = isClinician ? [] : patientMore;

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-muted">
        Checking your session…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href={isClinician ? "/clinician" : "/dashboard"} className="font-bold text-teal-dark">
            SwasthyaConnect
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <p className="max-w-[14rem] truncate text-sm text-muted">{user.name}</p>
            <button type="button" className="min-h-11 rounded-xl px-3 font-semibold text-teal" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5 pb-24 md:pb-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav aria-label="Main" className="sticky top-24 flex flex-col gap-1">
            {primary.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
            ))}
            {extra.length > 0 ? (
              <p className="mt-4 px-3 text-xs font-bold uppercase tracking-wide text-muted">Care</p>
            ) : null}
            {extra.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
            {user.role === "ADMIN" ? (
              <NavLink href="/admin" label="Admin" active={pathname.startsWith("/admin")} />
            ) : null}
          </nav>
        </aside>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-elevated md:hidden"
      >
        <ul className="grid grid-cols-5">
          {primary.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex min-h-16 flex-col items-center justify-center px-1 text-center text-xs font-semibold ${
                    active ? "text-teal-dark" : "text-muted"
                  }`}
                >
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
