"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { navByRole } from "@/components/layout/nav-config";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useAuth } from "@/features/auth/auth-provider";
import { homePathForRole } from "@/lib/auth-storage";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import type { UserRole } from "@/types/user";

/** Signed-in layout. Redirects anyone whose role does not match the area they opened. */
export function AppShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(role === "DOCTOR" ? "/doctor/login" : "/login");
    else if (user.role !== role) router.replace(homePathForRole(user.role));
  }, [ready, user, role, router]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-muted" role="status">
        {t("loading")}
      </div>
    );
  }

  const items = navByRole[role];
  const label = (item: (typeof items)[number]) => (item.translate ? t(item.label as TranslationKey) : item.label);
  const isActive = (href: string) => pathname === href || (href !== "/clinician" && pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href={homePathForRole(role)} className="font-bold text-teal-dark">
            {t("appName")}
          </Link>
          <div className="flex items-center gap-2">
            {role === "PATIENT" ? <LanguageToggle /> : null}
            <p className="hidden max-w-[14rem] truncate text-sm text-muted sm:block">{user.name}</p>
            <button type="button" className="min-h-11 rounded-xl px-3 font-semibold text-teal" onClick={() => void logout()}>
              {t("signOut")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-5 pb-24 md:pb-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav aria-label="Main" className="sticky top-24 flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-xl px-3 font-semibold ${
                  isActive(item.href) ? "bg-teal text-white" : "text-ink hover:bg-teal-soft"
                }`}
              >
                {label(item)}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-elevated md:hidden">
        <ul className="flex overflow-x-auto">
          {items.map((item) => (
            <li key={item.href} className="min-w-[4.5rem] flex-1">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-16 items-center justify-center px-1 text-center text-xs font-semibold ${
                  isActive(item.href) ? "text-teal-dark" : "text-muted"
                }`}
              >
                {label(item)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
