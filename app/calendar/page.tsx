"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { WeekBoard } from "@/components/WeekBoard";
import { addDays, formatWeekRange, startOfWeek, toDateKey } from "@/lib/dates";
import { getCurrentUser } from "@/services/authService";
import { listGoalsInRange } from "@/services/goalService";
import { listWeekSchedule } from "@/services/scheduleService";
import type { DailyGoal, ScheduleBlock } from "@/types/domain";

function CalendarContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeLabel = useMemo(() => formatWeekRange(anchor), [anchor]);

  async function refresh(uid: string, weekAnchor: Date) {
    const start = startOfWeek(weekAnchor);
    const end = addDays(start, 6);
    const [weekBlocks, weekGoals] = await Promise.all([
      listWeekSchedule(uid, start),
      listGoalsInRange(uid, toDateKey(start), toDateKey(end))
    ]);
    setBlocks(weekBlocks);
    setGoals(weekGoals);
  }

  useEffect(() => {
    getCurrentUser()
      .then(async (user) => {
        if (!user) return;
        setUserId(user.id);
        await refresh(user.id, anchor);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load calendar."))
      .finally(() => setLoading(false));
    // intentionally load once for user; week changes handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    refresh(userId, anchor)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load week."))
      .finally(() => setLoading(false));
  }, [anchor, userId]);

  return (
    <AppShell eyebrow="Horizon" title="Calendar">
      <div className="space-y-5">
        <section className="card">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">This week</p>
          <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{rangeLabel}</h2>
          <p className="mt-2 text-sm text-moss">Tap a day to open Today for that date — goals, schedule, and check-ins.</p>
        </section>

        {error ? <p className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p> : null}
        {loading ? <div className="card text-center text-moss">Loading week…</div> : null}

        <WeekBoard
          anchor={anchor}
          blocks={blocks}
          goals={goals}
          onShiftWeek={(delta) => setAnchor((current) => addDays(current, delta))}
        />
      </div>
    </AppShell>
  );
}

export default function CalendarPage() {
  return (
    <AuthGuard>
      <CalendarContent />
    </AuthGuard>
  );
}
