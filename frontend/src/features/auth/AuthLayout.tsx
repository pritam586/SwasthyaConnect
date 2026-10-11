"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Card } from "@/components/ui/Card";

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-bold text-teal-dark">SwasthyaConnect</Link>
        <LanguageToggle />
      </div>
      <h1 className="mt-6 text-3xl font-bold">{title}</h1>
      {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
      <Card className="mt-6">{children}</Card>
      {footer ? <div className="mt-4 space-y-2">{footer}</div> : null}
    </main>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm font-medium text-red-700" role="alert">{message}</p>;
}
