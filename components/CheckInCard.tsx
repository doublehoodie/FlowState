"use client";

import { useState } from "react";
import type { CheckInKind, DailyCheckIn } from "@/types/domain";

const scores = [1, 2, 3, 4, 5];

function ScoreRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
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
    setNotice("Saved.");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["midday", "eod"] as CheckInKind[]).map((value) => (
          <button
            className={`border px-3 py-1.5 text-sm transition ${
              kind === value ? "border-charcoal bg-charcoal text-paper" : "border-linen text-mist"
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

      <button className="primary-button" disabled={saving} onClick={handleSave} type="button">
        {saving ? "Saving…" : "Save check-in"}
      </button>
      {notice ? <p className="text-sm text-success">{notice}</p> : null}

      {checkIns.length > 0 ? (
        <div className="space-y-1 border-t border-stone pt-3">
          {checkIns.map((item) => (
            <p className="text-sm text-mist" key={item.id}>
              {item.kind}: flow {item.flow_score}, stress {item.stress_score}, progress {item.progress_score}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
