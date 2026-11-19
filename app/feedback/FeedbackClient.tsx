"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { toDateKey } from "@/lib/dates";
import { formatTimeRange } from "@/lib/timeBuckets";
import { getCurrentUser } from "@/services/authService";
import { listCompletedBlocksForFeedback, submitFeedback } from "@/services/feedbackService";
import type { ScheduleBlock } from "@/types/domain";

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
            className={`border py-2.5 text-sm transition ${
              value === score ? "border-clay bg-clay text-white" : "border-linen bg-paper text-charcoal"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedBlocks, setCompletedBlocks] = useState<ScheduleBlock[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCurrentUser()
      .then(async (user) => {
        if (!user) return;
        setCompletedBlocks(await listCompletedBlocksForFeedback(user.id, toDateKey(new Date())));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load completed tasks."))
      .finally(() => setLoading(false));
  }, [blockId]);

  const selected = blockId ? completedBlocks.find((block) => block.id === blockId) : undefined;

  async function handleSubmit() {
    if (!blockId) return;
    setSaving(true);
    setError(null);

    try {
      await submitFeedback(blockId, focus, distraction);
      router.replace("/feedback");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Feedback">
      {blockId ? (
        <section className="space-y-6">
          <div>
            <p className="section-copy">How was this block?</p>
            <p className="mt-1 text-sm text-charcoal">{selected?.task?.title ?? "Completed task"}</p>
          </div>
          <ScorePicker label="Focus" onChange={setFocus} value={focus} />
          <ScorePicker label="Distraction" onChange={setDistraction} value={distraction} />
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <div className="flex items-center gap-4">
            <button className="primary-button" disabled={saving} onClick={handleSubmit} type="button">
              {saving ? "Saving…" : "Save feedback"}
            </button>
            <Link className="text-button" href="/feedback">
              Back
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          <p className="section-copy">Rate completed tasks from today.</p>
          {error ? <p className="text-sm text-clay">{error}</p> : null}
          {loading ? <p className="text-sm text-mist">Loading…</p> : null}
          {!loading && completedBlocks.length === 0 ? (
            <p className="text-sm text-mist">No completed tasks waiting for a rating. Mark one done on Today first.</p>
          ) : null}
          {!loading && completedBlocks.length > 0 ? (
            <div className="divide-y divide-linen border-y border-linen">
              {completedBlocks.map((block) => (
                <button
                  className="flex w-full items-start justify-between gap-3 py-4 text-left transition hover:bg-linen/40"
                  key={block.id}
                  onClick={() => router.push(`/feedback?block=${block.id}`)}
                  type="button"
                >
                  <span>
                    <span className="block text-sm text-charcoal">{block.task?.title ?? "Untitled"}</span>
                    <span className="mt-1 block text-xs text-mist">
                      {formatTimeRange(block.start_time, block.end_time)}
                    </span>
                  </span>
                  <span className="text-button shrink-0">Rate →</span>
                </button>
              ))}
            </div>
          ) : null}
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
