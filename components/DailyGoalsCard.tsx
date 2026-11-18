"use client";

import { FormEvent, useState } from "react";
import type { DailyGoal, GoalCategory } from "@/types/domain";

const categories: Array<{ value: GoalCategory; label: string; hint: string }> = [
  { value: "mastery", label: "Mastery", hint: "Learn / improve a skill" },
  { value: "resource", label: "Resource", hint: "Get time, budget, buy-in" },
  { value: "understanding", label: "Understanding", hint: "Clarify or figure out" },
  { value: "other", label: "Other", hint: "General outcome" }
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
    <section className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-ember">Weintraub loop</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Today’s 3 SMART goals</h2>
          <p className="mt-2 text-sm leading-6 text-moss">
            Specific, measurable, achievable, relevant, time-bound. Example: “Today I will draft 2 pages of the proposal by 2pm.”
          </p>
        </div>
        <button className="secondary-button px-3 py-2 text-xs" disabled={saving || goals.length > 0} onClick={() => onCarryForward()} type="button">
          Carry open from yesterday
        </button>
      </div>

      <div className="space-y-2">
        {goals.map((goal) => (
          <div className="flex items-start gap-3 rounded-2xl border border-oat bg-cream/50 p-3" key={goal.id}>
            <button
              aria-label={goal.status === "done" ? "Mark open" : "Mark done"}
              className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${goal.status === "done" ? "border-moss bg-moss" : "border-ink/40"}`}
              onClick={() => onToggleDone(goal)}
              type="button"
            />
            <div className="min-w-0 flex-1">
              <p className={`font-bold ${goal.status === "done" ? "text-moss line-through" : "text-ink"}`}>{goal.title}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-moss">
                {goal.category}
                {goal.status === "carried" ? " · carried" : ""}
              </p>
            </div>
          </div>
        ))}
        {goals.length === 0 ? <p className="text-sm text-moss">No goals yet — set up to three for today.</p> : null}
      </div>

      {goals.length < 3 ? (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-bold text-ink">Goal {goals.length + 1}</span>
            <input
              className="field"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Today I will…"
              required
              value={title}
            />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {categories.map((item) => (
              <button
                className={`rounded-2xl border p-2 text-left text-xs transition ${
                  category === item.value ? "border-ink bg-ink text-cream" : "border-oat bg-white/50"
                }`}
                key={item.value}
                onClick={() => setCategory(item.value)}
                type="button"
              >
                <span className="block font-black">{item.label}</span>
                <span className="mt-1 block opacity-75">{item.hint}</span>
              </button>
            ))}
          </div>
          {error ? <p className="text-sm text-ember">{error}</p> : null}
          <button className="primary-button w-full" disabled={saving} type="submit">
            Add goal
          </button>
        </form>
      ) : null}
    </section>
  );
}
