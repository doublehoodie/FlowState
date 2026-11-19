import Link from "next/link";
import { isDemoMode } from "@/lib/demoMode";

export default function HomePage() {
  const startHref = isDemoMode ? "/dashboard" : "/login";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-between px-5 py-10">
      <section className="space-y-6 pt-10">
        <p className="font-brand text-2xl text-clay">FlowState</p>
        <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-bark sm:text-5xl">
          Make your day fit your brain.
        </h1>
        <p className="max-w-md text-base leading-7 text-mist">
          Set a few SMART goals, get gentle nudges, and learn when deep work actually works for you.
        </p>
      </section>

      <section className="space-y-4 border-t border-stone pt-8">
        <p className="text-sm text-mist">
          {isDemoMode
            ? "Demo mode — no account. Sample tasks live in this browser."
            : "Sign in to sync goals, schedule, and feedback."}
        </p>
        <Link className="primary-button inline-flex" href={startHref}>
          {isDemoMode ? "Enter demo" : "Get started"}
        </Link>
      </section>
    </main>
  );
}
