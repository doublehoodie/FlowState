"use client";

import Link from "next/link";
import { formatDayLabel, isSameDay, toDateKey, weekDays } from "@/lib/dates";
import type { DailyGoal, ScheduleBlock } from "@/types/domain";

export function WeekBoard({
  anchor,
  blocks,
  goals,
  onShiftWeek
}: {
  anchor: Date;
  blocks: ScheduleBlock[];
  goals: DailyGoal[];
  onShiftWeek: (delta: number) => void;
}) {
  const days = weekDays(anchor);

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Long-term calendar</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Week view</h2>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button px-3 py-2 text-xs" onClick={() => onShiftWeek(-7)} type="button">
            Prev
          </button>
          <button className="secondary-button px-3 py-2 text-xs" onClick={() => onShiftWeek(7)} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayBlocks = blocks.filter((block) => isSameDay(new Date(block.start_time), day));
          const dayGoals = goals.filter((goal) => goal.goal_date === key);
          const doneGoals = dayGoals.filter((goal) => goal.status === "done").length;

          return (
            <Link
              className={`min-h-[140px] rounded-2xl border p-3 transition hover:-translate-y-0.5 ${
                isSameDay(day, new Date()) ? "border-ember bg-ember/5" : "border-oat bg-cream/40"
              }`}
              href={`/dashboard?date=${key}`}
              key={key}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-moss">{formatDayLabel(day)}</p>
              <p className="mt-2 text-xs font-bold text-ink">
                {dayGoals.length ? `${doneGoals}/${dayGoals.length} goals` : "No goals"}
              </p>
              <ul className="mt-2 space-y-1">
                {dayBlocks.slice(0, 3).map((block) => (
                  <li className="truncate text-[11px] text-ink/80" key={block.id}>
                    {block.task?.title ?? "Block"}
                  </li>
                ))}
                {dayBlocks.length === 0 ? <li className="text-[11px] text-moss">Open day</li> : null}
              </ul>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
