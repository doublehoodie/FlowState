"use client";

import { useState } from "react";
import type { CheckInKind, DailyCheckIn } from "@/types/domain";

const scores = [1, 2, 3, 4, 5];

function ScoreRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{label}</span>
        <span className="text-sm font-black">{value}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {scores.map((score) => (
          <button
            className={`rounded-xl py-2 text-sm font-black ${value === score ? "bg-ember text-white" : "bg-cream text-ink"}`}
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

export function CheckInCard({
  checkIns,
  saving,
  onSubmit
}: {
  checkIns: DailyCheckIn[];
  saving?: boolean;
  onSubmit: (input: { kind: CheckInKind; flow_score: number; stress_score: number; progress_score: number }) => Promise<void>;
}) {
  const [kind, setKind] = useState<CheckInKind>("midday");
  const [flow, setFlow] = useState(3);
  const [stress, setStress] = useState(3);
  const [progress, setProgress] = useState(3);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSave() {
    setNotice(null);
    await onSubmit({ kind, flow_score: flow, stress_score: stress, progress_score: progress });
    setNotice("Check-in saved.");
  }

  return (
    <section className="card space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Experience sampling</p>
        <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Flow check-in</h2>
        <p className="mt-2 text-sm text-moss">Quick pulse on flow, stress, and goal progress — not just post-task focus.</p>
      </div>

      <div className="flex gap-2">
        {(["midday", "eod"] as CheckInKind[]).map((value) => (
          <button
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
              kind === value ? "bg-ink text-cream" : "bg-cream text-ink"
            }`}
            key={value}
            onClick={() => setKind(value)}
            type="button"
          >
            {value === "eod" ? "End of day" : "Midday"}
          </button>
        ))}
      </div>

      <ScoreRow label="Flow" onChange={setFlow} value={flow} />
      <ScoreRow label="Stress" onChange={setStress} value={stress} />
      <ScoreRow label="Goal progress" onChange={setProgress} value={progress} />

      <button className="primary-button w-full" disabled={saving} onClick={handleSave} type="button">
        {saving ? "Saving…" : "Save check-in"}
      </button>
      {notice ? <p className="text-sm text-moss">{notice}</p> : null}

      {checkIns.length > 0 ? (
        <div className="space-y-2 border-t border-oat/70 pt-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Today so far</p>
          {checkIns.map((item) => (
            <p className="text-sm text-ink/80" key={item.id}>
              {item.kind}: flow {item.flow_score}, stress {item.stress_score}, progress {item.progress_score}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
