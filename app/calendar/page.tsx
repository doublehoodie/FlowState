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
    <AppShell title="Week">
      <div className="space-y-6">
        <p className="text-sm text-mist">{rangeLabel}</p>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        {loading ? <p className="text-sm text-mist">Loading…</p> : null}
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
