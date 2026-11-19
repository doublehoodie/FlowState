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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-sm text-mist">{value}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {scores.map((score) => (
          <button
            className={`rounded-control py-3 text-sm font-medium transition ${
              value === score ? "bg-clay text-white" : "border border-stone bg-paper text-walnut"
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
    <AppShell title="Feedback">
      {!blockId ? (
        <section className="space-y-4">
          <p className="section-copy">Pick a scheduled block first so feedback can update the right time bucket.</p>
          <Link className="primary-button inline-flex" href="/dashboard">
            Go to Today
          </Link>
        </section>
      ) : (
        <section className="space-y-6">
          <p className="section-copy">How was focus and distraction for this block?</p>
          <ScorePicker label="Focus" onChange={setFocus} value={focus} />
          <ScorePicker label="Distraction" onChange={setDistraction} value={distraction} />
          {error ? <p className="rounded-control border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay-deep">{error}</p> : null}
          <button className="primary-button" disabled={saving} onClick={handleSubmit} type="button">
            {saving ? "Saving…" : "Save feedback"}
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
