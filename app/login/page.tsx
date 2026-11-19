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
    return <main className="mx-auto flex min-h-screen items-center justify-center px-5 text-mist">Opening demo…</main>;
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
      <section className="mb-10 space-y-2">
        <p className="text-sm text-mist">FlowState</p>
        <h1 className="text-2xl font-medium tracking-tight text-charcoal">Welcome back</h1>
      </section>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="label">Email</span>
          <input className="field" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label className="block space-y-2">
          <span className="label">Password</span>
          <input
            className="field"
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "Working…" : mode === "signin" ? "Log in" : "Create account"}
        </button>
        <button className="text-button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} type="button">
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </form>
    </main>
  );
}
