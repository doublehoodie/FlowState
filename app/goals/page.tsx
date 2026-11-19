"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { DailyGoalsCard } from "@/components/DailyGoalsCard";
import { formatDayLabel, parseDateKey, toDateKey } from "@/lib/dates";
import { getCurrentUser } from "@/services/authService";
import { carryOpenGoalsForward, createGoal, listGoalsForDate, updateGoalStatus } from "@/services/goalService";
import type { DailyGoal, GoalCategory } from "@/types/domain";

function GoalsContent() {
  const searchParams = useSearchParams();
  const dateKey = searchParams.get("date") ?? toDateKey(new Date());
  const viewingToday = dateKey === toDateKey(new Date());

  const [userId, setUserId] = useState<string | null>(null);
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getCurrentUser()
      .then(async (user) => {
        if (!user) return;
        setUserId(user.id);
        setGoals(await listGoalsForDate(user.id, dateKey));
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load goals."))
      .finally(() => setLoading(false));
  }, [dateKey]);

  return (
    <AppShell title={viewingToday ? "Goals" : `Goals · ${formatDayLabel(parseDateKey(dateKey))}`}>
      <div className="space-y-6">
        <p className="section-copy">
          Write up to three goals as “Today I will…” Keep them SMART: Specific, Measurable, Achievable, Relevant, and Time-bound.
        </p>
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        {notice ? <p className="text-sm text-success">{notice}</p> : null}
        {loading ? <p className="text-sm text-mist">Loading…</p> : null}

        {!loading && userId ? (
          <DailyGoalsCard
            goals={goals}
            saving={saving}
            onCarryForward={async () => {
              setSaving(true);
              setNotice(null);
              try {
                const carried = await carryOpenGoalsForward(userId, dateKey);
                setGoals(await listGoalsForDate(userId, dateKey));
                setNotice(carried.length ? `Carried ${carried.length} goal(s).` : "Nothing to carry.");
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Could not carry goals.");
              } finally {
                setSaving(false);
              }
            }}
            onCreate={async (title, category: GoalCategory) => {
              setSaving(true);
              try {
                await createGoal(userId, dateKey, { title, category });
                setGoals(await listGoalsForDate(userId, dateKey));
              } finally {
                setSaving(false);
              }
            }}
            onToggleDone={async (goal) => {
              await updateGoalStatus(goal.id, goal.status === "done" ? "open" : "done");
              setGoals(await listGoalsForDate(userId, dateKey));
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

export default function GoalsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<p className="p-6 text-sm text-mist">Loading…</p>}>
        <GoalsContent />
      </Suspense>
    </AuthGuard>
  );
}
