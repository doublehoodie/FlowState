"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { CheckInCard } from "@/components/CheckInCard";
import { DailyGoalsCard } from "@/components/DailyGoalsCard";
import { NudgeRunner, requestNotificationPermission } from "@/components/NudgeRunner";
import { ReminderSettingsCard } from "@/components/ReminderSettingsCard";
import { formatDayLabel, parseDateKey, toDateKey } from "@/lib/dates";
import { formatTimeRange, getTimeOfDayBucket } from "@/lib/timeBuckets";
import { getCurrentUser } from "@/services/authService";
import { listCheckInsForDate, submitCheckIn } from "@/services/checkInService";
import { carryOpenGoalsForward, createGoal, listGoalsForDate, updateGoalStatus } from "@/services/goalService";
import { getReminderPreferences, saveReminderPreferences } from "@/services/reminderService";
import { generateAndSaveDailySchedule, listTodaySchedule, listTodayUnscheduledTasks } from "@/services/scheduleService";
import type { DailyCheckIn, DailyGoal, GoalCategory, ReminderPreferences, ScheduleBlock, Task } from "@/types/domain";

const timelineHours = Array.from({ length: 12 }, (_, index) => index + 9);
const timelineStartHour = 9;
const timelineEndHour = 21;
const timelineMinutes = (timelineEndHour - timelineStartHour) * 60;

function blockPosition(block: ScheduleBlock) {
  const start = new Date(block.start_time);
  const end = new Date(block.end_time);
  const startMinutes = Math.max(0, (start.getHours() - timelineStartHour) * 60 + start.getMinutes());
  const endMinutes = Math.min(timelineMinutes, (end.getHours() - timelineStartHour) * 60 + end.getMinutes());
  const top = (startMinutes / timelineMinutes) * 100;
  const height = Math.max(8, ((endMinutes - startMinutes) / timelineMinutes) * 100);
  return { top: `${top}%`, height: `${height}%` };
}

function placementBadge(block: ScheduleBlock) {
  return (block.placement_mode ?? "auto") === "manual" ? "Manual" : "Auto";
}

function DayTimeline({ blocks, dateKey }: { blocks: ScheduleBlock[]; dateKey: string }) {
  const router = useRouter();

  function handleTimelineClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a[data-scheduled-task]")) return;

    const root = event.currentTarget;
    const rect = root.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const clamped = Math.max(0, Math.min(y / rect.height, 1));
    const rawOffset = clamped * timelineMinutes;
    const snappedOffset = Math.min(Math.round(rawOffset / 30) * 30, timelineMinutes - 15);
    const anchor = parseDateKey(dateKey);
    anchor.setHours(timelineStartHour, 0, 0, 0);
    anchor.setMinutes(anchor.getMinutes() + snappedOffset);
    const hh = String(anchor.getHours()).padStart(2, "0");
    const mm = String(anchor.getMinutes()).padStart(2, "0");
    router.push(`/tasks?source=today&time=${hh}:${mm}&date=${dateKey}`);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Schedule</h2>
          <p className="section-copy mt-1">Tap empty space to add a task.</p>
        </div>
        <span className="chip">9 AM – 9 PM</span>
      </div>

      <div className="relative grid min-h-[560px] grid-cols-[3.25rem_1fr] gap-2 overflow-hidden rounded-panel border border-stone bg-white/70 p-3">
        <div>
          {timelineHours.map((hour) => (
            <div className="h-[46px] text-xs text-mist" key={hour}>
              {hour > 12 ? hour - 12 : hour}
              {hour >= 12 ? "p" : "a"}
            </div>
          ))}
        </div>
        <div className="relative cursor-pointer border-l border-stone" onClick={handleTimelineClick}>
          {timelineHours.map((hour) => (
            <div className="h-[46px] border-t border-stone/70" key={hour} />
          ))}
          {blocks.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="text-sm text-mist">Nothing scheduled yet.</p>
            </div>
          ) : null}
          {blocks.map((block) => (
            <Link
              className="absolute left-2 right-1 z-[2] rounded-control border border-stone bg-walnut px-3 py-2 text-paper transition hover:bg-bark"
              data-scheduled-task
              href={`/feedback?block=${block.id}`}
              key={block.id}
              onClick={(e) => e.stopPropagation()}
              style={blockPosition(block)}
            >
              <span className="mb-1 inline-block text-[10px] text-paper/70">{placementBadge(block)}</span>
              <span className="block truncate text-sm font-medium">{block.task?.title ?? "Untitled"}</span>
              <span className="mt-0.5 block text-xs text-paper/70">{formatTimeRange(block.start_time, block.end_time)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const dateKey = searchParams.get("date") ?? toDateKey(new Date());
  const viewingToday = dateKey === toDateKey(new Date());

  const [userId, setUserId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRhythm, setShowRhythm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh(currentUserId: string, key: string) {
    const [schedule, pending, dayGoals, dayCheckIns, reminderPrefs] = await Promise.all([
      listTodaySchedule(currentUserId, key),
      listTodayUnscheduledTasks(currentUserId, key),
      listGoalsForDate(currentUserId, key),
      listCheckInsForDate(currentUserId, key),
      getReminderPreferences(currentUserId)
    ]);
    setBlocks(schedule);
    setPendingTasks(pending);
    setGoals(dayGoals);
    setCheckIns(dayCheckIns);
    setPrefs(reminderPrefs);
  }

  useEffect(() => {
    setLoading(true);
    getCurrentUser()
      .then(async (user) => {
        if (!user) return;
        setUserId(user.id);
        await refresh(user.id, dateKey);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load schedule."))
      .finally(() => setLoading(false));
  }, [dateKey]);

  async function handleGenerate() {
    if (!userId) return;
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      await generateAndSaveDailySchedule(userId);
      await refresh(userId, dateKey);
      setNotice("Schedule regenerated from your metrics.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate schedule.");
    } finally {
      setGenerating(false);
    }
  }

  const completion = useMemo(() => {
    if (blocks.length === 0) return 0;
    return Math.round((blocks.filter((block) => block.completed).length / blocks.length) * 100);
  }, [blocks]);

  const dayLabel = formatDayLabel(parseDateKey(dateKey));

  return (
    <AppShell title={viewingToday ? "Today" : dayLabel}>
      <NudgeRunner prefs={viewingToday ? prefs : null} />
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mist">
            {dateKey}
            {blocks.length ? ` · ${completion}% complete` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className="text-button" href="/calendar">
              Week
            </Link>
            <Link className="secondary-button px-3 py-2 text-sm" href={`/tasks?source=today&date=${dateKey}`}>
              Add task
            </Link>
            <button className="text-button" disabled={generating} onClick={handleGenerate} type="button">
              {generating ? "Generating…" : "Regenerate"}
            </button>
          </div>
        </div>

        {error ? <p className="rounded-control border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay-deep">{error}</p> : null}
        {notice ? <p className="rounded-control border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">{notice}</p> : null}
        {loading ? <p className="text-sm text-mist">Loading…</p> : null}

        {!loading && userId ? (
          <DailyGoalsCard
            goals={goals}
            saving={saving}
            onCarryForward={async () => {
              setSaving(true);
              try {
                const carried = await carryOpenGoalsForward(userId, dateKey);
                setGoals(await listGoalsForDate(userId, dateKey));
                setNotice(carried.length ? `Carried ${carried.length} open goal(s).` : "Nothing to carry.");
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

        {!loading ? <DayTimeline blocks={blocks} dateKey={dateKey} /> : null}

        {!loading ? (
          <section className="space-y-3">
            {blocks.map((block) => (
              <article className="rounded-panel border border-stone bg-white/70 p-4" key={block.id}>
                <div className="flex gap-4">
                  <div className="w-16 shrink-0 text-center">
                    <p className="text-xs text-mist">{getTimeOfDayBucket(block.start_time)}</p>
                    <div className="mx-auto mt-2 h-2 w-2 rounded-full bg-clay" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-mist">{formatTimeRange(block.start_time, block.end_time)}</p>
                    <h2 className="text-lg font-semibold text-bark">{block.task?.title ?? "Untitled"}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className="chip">{block.task?.type}</span>
                      <span className="chip">{placementBadge(block)}</span>
                      <span className={`chip ${block.completed ? "chip-active" : ""}`}>{block.completed ? "Done" : "Ready"}</span>
                    </div>
                    {!block.completed ? (
                      <Link className="primary-button mt-2 inline-flex" href={`/feedback?block=${block.id}`}>
                        Start
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!loading && pendingTasks.length > 0 ? (
          <section className="space-y-2">
            <h2 className="section-title">Unscheduled</h2>
            {pendingTasks.map((task) => (
              <div className="rounded-panel border border-stone bg-white/70 px-4 py-3" key={task.id}>
                <p className="text-sm font-medium text-bark">{task.title}</p>
                <p className="text-xs text-mist">
                  {task.type} · {task.estimated_duration} min
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {!loading && userId && prefs ? (
          <section className="border-t border-stone pt-4">
            <button className="text-button" onClick={() => setShowRhythm((v) => !v)} type="button">
              {showRhythm ? "Hide reminders & check-ins" : "Reminders & check-ins"}
            </button>
            {showRhythm ? (
              <div className="mt-4 space-y-8 rounded-panel border border-stone bg-white/70 p-4">
                <div>
                  <h3 className="text-base font-semibold text-bark">Reminders</h3>
                  <p className="section-copy mt-1 mb-3">Morning goal nudge and daytime refocus.</p>
                  <ReminderSettingsCard
                    prefs={prefs}
                    saving={saving}
                    onEnableNotifications={requestNotificationPermission}
                    onSave={async (patch) => {
                      setSaving(true);
                      try {
                        const next = await saveReminderPreferences(userId, patch);
                        setPrefs(next);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-bark">Check-in</h3>
                  <p className="section-copy mt-1 mb-3">A quick pulse on flow, stress, and progress.</p>
                  <CheckInCard
                    checkIns={checkIns}
                    saving={saving}
                    onSubmit={async (input) => {
                      setSaving(true);
                      try {
                        await submitCheckIn(userId, dateKey, input);
                        setCheckIns(await listCheckInsForDate(userId, dateKey));
                      } finally {
                        setSaving(false);
                      }
                    }}
                  />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<p className="p-6 text-sm text-mist">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
