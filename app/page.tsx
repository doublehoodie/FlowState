import Link from "next/link";
import { isDemoMode } from "@/lib/demoMode";

export default function HomePage() {
  const startHref = isDemoMode ? "/dashboard" : "/login";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-between px-5 py-8">
      <section className="space-y-8 pt-8">
        <div className="inline-flex rounded-full border border-moss/20 bg-white/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-moss">
          {isDemoMode ? "FlowState Demo" : "FlowState MVP"}
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.05em] text-ink sm:text-6xl">
            Make your day fit your brain.
          </h1>
          <p className="max-w-md text-lg leading-8 text-moss">
            Plan deep work when your focus is strongest, collect quick post-task feedback, and adapt tomorrow with structured learning.
          </p>
        </div>
      </section>
      <section className="card space-y-4">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-ember">
          {isDemoMode ? "No account · browser-only data" : "No LLM required yet"}
        </p>
        <p className="text-base leading-7 text-ink/75">
          {isDemoMode
            ? "This demo skips email login. Sample tasks load in your browser; Reset demo clears them."
            : "FlowState stores feedback as metrics so an AI layer can later explain decisions without becoming the source of truth."}
        </p>
        <Link className="primary-button w-full" href={startHref}>
          {isDemoMode ? "Enter demo" : "Start FlowState"}
        </Link>
      </section>
    </main>
  );
}
