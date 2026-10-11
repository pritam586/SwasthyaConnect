export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-elevated p-4 shadow-[0_8px_24px_rgba(27,42,39,0.04)] sm:p-5 ${className}`}>
      {children}
    </section>
  );
}
