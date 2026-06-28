import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { signInWithGoogle } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const hasAccessError = Boolean(error);

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-neutral-950">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-400">
            Farsha Studio
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Admin sign in
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Masuk dengan akun Google admin yang sudah diizinkan.
          </p>
        </div>

        {hasAccessError ? (
          <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Akun Google ini belum terdaftar sebagai admin Farsha Studio.
          </div>
        ) : null}

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-xs font-bold">
              G
            </span>
            Continue with Google
          </button>
        </form>

        <Link
          href="/"
          className="mt-5 block text-center text-sm font-medium text-neutral-400 transition-colors hover:text-white"
        >
          Back to storefront
        </Link>
      </section>
    </main>
  );
}
