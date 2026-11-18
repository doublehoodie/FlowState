"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { submitFeedback } from "@/services/feedbackService";

const scores = [1, 2, 3, 4, 5];

function ScorePicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-[0.16em] text-moss">{label}</span>
        <span className="rounded-full bg-ink px-3 py-1 text-sm font-black text-cream">{value}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {scores.map((score) => (
          <button
            className={`aspect-square rounded-2xl text-xl font-black transition ${
              value === score ? "bg-ember text-white shadow-soft" : "bg-cream text-ink hover:bg-oat"
            }`}
            key={score}
            onClick={() => onChange(score)}
            type="button"
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const blockId = searchParams.get("block");
  const [focus, setFocus] = useState(4);
  const [distraction, setDistraction] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!blockId) return;
    setSaving(true);
    setError(null);

    try {
      await submitFeedback(blockId, focus, distraction);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell eyebrow="Two taps" title="Feedback">
      {!blockId ? (
        <section className="card space-y-4 text-center">
          <h2 className="text-2xl font-black tracking-[-0.04em]">Pick a task first</h2>
          <p className="text-moss">Feedback attaches to a scheduled block so FlowState can learn the right task type and time bucket.</p>
          <Link className="primary-button w-full" href="/dashboard">
            Go to schedule
          </Link>
        </section>
      ) : (
        <section className="card space-y-6">
          <p className="text-base leading-7 text-ink/75">
            Quick pulse check. Higher focus and lower distraction will make this kind of task more likely in this time bucket.
          </p>
          <ScorePicker label="Focus" onChange={setFocus} value={focus} />
          <ScorePicker label="Distraction" onChange={setDistraction} value={distraction} />
          {error ? <p className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p> : null}
          <button className="primary-button w-full" disabled={saving} onClick={handleSubmit} type="button">
            {saving ? "Learning..." : "Save feedback"}
          </button>
        </section>
      )}
    </AppShell>
  );
}

export function FeedbackClient() {
  return (
    <AuthGuard>
      <FeedbackContent />
    </AuthGuard>
  );
}
