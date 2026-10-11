import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">The page you opened does not exist.</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-teal px-5 font-semibold text-white">
        Go to the home page
      </Link>
    </main>
  );
}
