import Link from "next/link";
import { isDemoMode } from "@/lib/demoMode";

export default function HomePage() {
  const startHref = isDemoMode ? "/dashboard" : "/login";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-between px-5 py-12">
      <section className="space-y-5 pt-16">
        <p className="text-sm text-mist">FlowState</p>
        <h1 className="max-w-md text-4xl font-medium leading-tight tracking-tight text-charcoal">
          Make your day fit your brain.
        </h1>
        <p className="max-w-sm text-base leading-7 text-mist">
          A few SMART goals, quiet nudges, and a schedule that learns when you focus best.
        </p>
      </section>

      <section className="space-y-4 border-t border-linen pt-8">
        <p className="text-sm text-mist">
          {isDemoMode ? "Demo mode — no account needed." : "Sign in to continue."}
        </p>
        <Link className="primary-button inline-flex" href={startHref}>
          {isDemoMode ? "Enter demo" : "Get started"}
        </Link>
      </section>
    </main>
  );
}
