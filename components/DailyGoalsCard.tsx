"use client";

import { FormEvent, useState } from "react";
import type { DailyGoal, GoalCategory } from "@/types/domain";

/** Stored values match Weintraub et al. 2021; labels are everyday wording. */
const categories: Array<{ value: GoalCategory; label: string }> = [
  { value: "mastery", label: "Learn" },
  { value: "resource", label: "Get support" },
  { value: "understanding", label: "Figure out" },
  { value: "other", label: "Other" }
];

function categoryLabel(value: GoalCategory) {
  return categories.find((item) => item.value === value)?.label ?? value;
}

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
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="section-title">Goals</h2>
          <p className="section-copy mt-1">Three SMART goals for today.</p>
        </div>
        <button className="text-button" disabled={saving || goals.length > 0} onClick={() => onCarryForward()} type="button">
          Carry over
        </button>
      </div>

      <ul className="divide-y divide-linen border-y border-linen">
        {goals.map((goal, index) => (
          <li className="flex items-start gap-3 py-3" key={goal.id}>
            <button
              aria-label={goal.status === "done" ? "Mark open" : "Mark done"}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                goal.status === "done" ? "border-success bg-success text-[10px] text-white" : "border-linen bg-paper"
              }`}
              onClick={() => onToggleDone(goal)}
              type="button"
            >
              {goal.status === "done" ? "✓" : ""}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${goal.status === "done" ? "text-mist line-through" : "text-charcoal"}`}>
                {index + 1}. {goal.title}
              </p>
              <p className="mt-0.5 text-xs text-mist">
                {categoryLabel(goal.category)}
                {goal.status === "carried" ? " · carried" : ""}
              </p>
            </div>
          </li>
        ))}
        {goals.length === 0 ? <li className="py-3 text-sm text-mist">No goals yet.</li> : null}
      </ul>

      {goals.length < 3 ? (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="label">Add goal {goals.length + 1}</span>
            <input className="field" onChange={(e) => setTitle(e.target.value)} placeholder="Today I will…" required value={title} />
          </label>

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

          {error ? <p className="text-sm text-clay">{error}</p> : null}
          <button className="primary-button" disabled={saving} type="submit">
            Add goal
          </button>
        </form>
      ) : null}
    </section>
  );
}
