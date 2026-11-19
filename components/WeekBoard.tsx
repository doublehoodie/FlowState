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
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">This week</h2>
          <p className="section-copy mt-1">Open a day to set goals and see the schedule.</p>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button px-3 py-2 text-sm" onClick={() => onShiftWeek(-7)} type="button">
            Prev
          </button>
          <button className="secondary-button px-3 py-2 text-sm" onClick={() => onShiftWeek(7)} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayBlocks = blocks.filter((block) => isSameDay(new Date(block.start_time), day));
          const dayGoals = goals.filter((goal) => goal.goal_date === key);
          const doneGoals = dayGoals.filter((goal) => goal.status === "done").length;

          return (
            <Link
              className={`min-h-[120px] rounded-panel border p-3 transition hover:border-clay/40 ${
                isSameDay(day, new Date()) ? "border-clay/50 bg-clay/5" : "border-stone bg-white/70"
              }`}
              href={`/dashboard?date=${key}`}
              key={key}
            >
              <p className="text-xs font-medium text-mist">{formatDayLabel(day)}</p>
              <p className="mt-2 text-sm font-medium text-bark">
                {dayGoals.length ? `${doneGoals}/${dayGoals.length} goals` : "—"}
              </p>
              <ul className="mt-2 space-y-1">
                {dayBlocks.slice(0, 2).map((block) => (
                  <li className="truncate text-xs text-mist" key={block.id}>
                    {block.task?.title ?? "Block"}
                  </li>
                ))}
              </ul>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
