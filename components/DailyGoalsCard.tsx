"use client";

import { FormEvent, useState } from "react";
import type { DailyGoal, GoalCategory } from "@/types/domain";

const categories: Array<{ value: GoalCategory; label: string }> = [
  { value: "mastery", label: "Mastery" },
  { value: "resource", label: "Resource" },
  { value: "understanding", label: "Understanding" },
  { value: "other", label: "Other" }
];

export function DailyGoalsCard({
  goals,
  saving,
  onCreate,
  onToggleDone,
  onCarryForward
}: {
  goals: DailyGoal[];
  saving?: boolean;
  onCreate: (title: string, category: GoalCategory) => Promise<void>;
  onToggleDone: (goal: DailyGoal) => Promise<void>;
  onCarryForward: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("mastery");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onCreate(title, category);
      setTitle("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save goal.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Today’s goals</h2>
          <p className="section-copy mt-1">Up to three SMART goals. Keep them specific and doable today.</p>
        </div>
        <button className="text-button shrink-0" disabled={saving || goals.length > 0} onClick={() => onCarryForward()} type="button">
          Carry yesterday
        </button>
      </div>

      <div className="space-y-2">
        {goals.map((goal, index) => (
          <div className="flex items-start gap-3 rounded-panel border border-stone bg-white/70 px-3 py-3" key={goal.id}>
            <button
              aria-label={goal.status === "done" ? "Mark open" : "Mark done"}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                goal.status === "done" ? "border-success bg-success text-white" : "border-stone bg-paper"
              }`}
              onClick={() => onToggleDone(goal)}
              type="button"
            >
              {goal.status === "done" ? "✓" : ""}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${goal.status === "done" ? "text-mist line-through" : "text-bark"}`}>
                {index + 1}. {goal.title}
              </p>
              <p className="mt-1 text-xs text-mist">
                {goal.category}
                {goal.status === "carried" ? " · carried" : ""}
              </p>
            </div>
          </div>
        ))}
        {goals.length === 0 ? <p className="text-sm text-mist">No goals yet. Add your first one below.</p> : null}
      </div>

      {goals.length < 3 ? (
        <form className="space-y-3 rounded-panel border border-stone bg-white/70 p-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="label">Goal {goals.length + 1}</span>
            <input className="field" onChange={(e) => setTitle(e.target.value)} placeholder="Today I will…" required value={title} />
          </label>

          <button className="text-button" onClick={() => setShowAdvanced((v) => !v)} type="button">
            {showAdvanced ? "Hide category" : "More options"}
          </button>

          {showAdvanced ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  className={`chip ${category === item.value ? "chip-active" : ""}`}
                  key={item.value}
                  onClick={() => setCategory(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <button className="primary-button" disabled={saving} type="submit">
            Add goal
          </button>
        </form>
      ) : null}
    </section>
  );
}
