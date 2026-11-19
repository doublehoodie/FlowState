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
    <section className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="section-title">This week</h2>
          <p className="section-copy mt-1">Open a day for goals and schedule.</p>
        </div>
        <div className="flex gap-3">
          <button className="text-button" onClick={() => onShiftWeek(-7)} type="button">
            Prev
          </button>
          <button className="text-button" onClick={() => onShiftWeek(7)} type="button">
            Next
          </button>
        </div>
      </div>

      <div className="grid gap-0 divide-y divide-linen border-y border-linen sm:grid-cols-7 sm:divide-x sm:divide-y-0">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayBlocks = blocks.filter((block) => isSameDay(new Date(block.start_time), day));
          const dayGoals = goals.filter((goal) => goal.goal_date === key);
          const doneGoals = dayGoals.filter((goal) => goal.status === "done").length;

          return (
            <Link
              className={`min-h-[110px] p-3 transition hover:bg-linen/40 ${
                isSameDay(day, new Date()) ? "bg-linen/50" : ""
              }`}
              href={`/dashboard?date=${key}`}
              key={key}
            >
              <p className="text-xs text-mist">{formatDayLabel(day)}</p>
              <p className="mt-2 text-sm text-charcoal">
                {dayGoals.length ? `${doneGoals}/${dayGoals.length}` : "—"}
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
