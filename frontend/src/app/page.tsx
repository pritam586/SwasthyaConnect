import Link from "next/link";

export default function LandingPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-bold uppercase tracking-widest text-teal">SwasthyaConnect</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl">
        Healthcare that meets people where they live.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Keep your records, find medicines nearby, book a clinician, and use AI-assisted anaemia screening. Screening
        supports triage. It does not diagnose.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/signup"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal px-5 font-semibold text-white"
        >
          Create a patient account
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 font-semibold"
        >
          Sign in
        </Link>
        <Link href="/login/clinician" className="inline-flex min-h-12 items-center justify-center px-3 font-semibold text-teal">
          Clinician sign in
        </Link>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ["Your records", "Medications, reports, and visits load from your account. Empty until you have real data."],
          ["Nearby pharmacies", "Distance is calculated from your location and pharmacy coordinates."],
          ["Screening with a disclaimer", "Green, yellow, or red screening categories — never presented as a diagnosis."],
        ].map(([title, copy]) => (
          <li key={title} className="rounded-2xl border border-line bg-elevated p-5">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-muted">{copy}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
