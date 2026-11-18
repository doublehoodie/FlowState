"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isDemoMode } from "@/lib/demoMode";
import { signInWithEmail, signUpWithEmail } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemoMode) router.replace("/dashboard");
  }, [router]);

  if (isDemoMode) {
    return <main className="mx-auto flex min-h-screen items-center justify-center px-5 text-moss">Opening demo…</main>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
      <section className="mb-8 space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-ember">FlowState</p>
        <h1 className="text-5xl font-black tracking-[-0.055em] text-ink">Welcome back to flow.</h1>
        <p className="text-moss">Use email/password auth through Supabase to keep the MVP straightforward and portable.</p>
      </section>

      <form className="card space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-ink">Email</span>
          <input className="field" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-ink">Password</span>
          <input className="field" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        {error ? <p className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p> : null}
        <button className="primary-button w-full" disabled={loading} type="submit">
          {loading ? "Working..." : mode === "signin" ? "Log in" : "Create account"}
        </button>
        <button
          className="w-full text-center text-sm font-bold text-moss underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          type="button"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </form>
    </main>
  );
}
