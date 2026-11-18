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
    <section className="card space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Day view</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Scheduled blocks</h2>
          <p className="mt-2 text-sm text-moss">Tap empty calendar space to add a task for this day.</p>
        </div>
        <span className="w-fit rounded-full bg-cream px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-moss">9 AM - 9 PM</span>
      </div>
      <div className="relative grid min-h-[620px] grid-cols-[4rem_1fr] gap-3 overflow-hidden rounded-[1.5rem] bg-cream/60 p-3">
        <div className="space-y-0">
          {timelineHours.map((hour) => (
            <div className="h-[50px] text-xs font-bold text-moss" key={hour}>
              {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
            </div>
          ))}
        </div>
        <div className="relative cursor-pointer border-l border-oat/80" onClick={handleTimelineClick}>
          {timelineHours.map((hour) => (
            <div className="h-[50px] border-t border-oat/70" key={hour} />
          ))}
          {blocks.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="text-sm font-bold text-moss/90">No tasks scheduled yet. Tap to add one.</p>
            </div>
          ) : null}
          {blocks.map((block) => (
            <Link
              className="absolute left-3 right-1 z-[2] rounded-2xl border border-white/70 bg-ink p-3 text-cream shadow-soft transition hover:-translate-y-0.5 hover:bg-moss"
              data-scheduled-task
              href={`/feedback?block=${block.id}`}
              key={block.id}
              onClick={(e) => e.stopPropagation()}
              style={blockPosition(block)}
            >
              <span className="mb-1 inline-block rounded-full bg-cream/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream/90">
                {placementBadge(block)}
              </span>
              <span className="block truncate text-sm font-black">{block.task?.title ?? "Untitled task"}</span>
              <span className="mt-1 block text-xs text-cream/75">{formatTimeRange(block.start_time, block.end_time)}</span>
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
      setNotice("Day regenerated from tasks and learned performance metrics.");
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
    <AppShell eyebrow="Daily rhythm" title={viewingToday ? "Today" : dayLabel}>
      <NudgeRunner prefs={viewingToday ? prefs : null} />
      <div className="space-y-5">
        <section className="card space-y-4 overflow-hidden relative">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-ember/15" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Progress · {dateKey}</p>
              <p className="mt-2 text-4xl font-black tracking-[-0.05em]">{completion}%</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link className="secondary-button w-full text-center sm:w-auto" href="/calendar">
                Week calendar
              </Link>
              <Link className="primary-button w-full text-center sm:w-auto" href={`/tasks?source=today&date=${dateKey}`}>
                + Add Task
              </Link>
              <button className="secondary-button w-full sm:w-auto" disabled={generating} onClick={handleGenerate} type="button">
                {generating ? "Generating" : "Regenerate Day"}
              </button>
            </div>
          </div>
          <p className="relative text-sm leading-6 text-ink/70">
            Research loop: morning SMART goals → daytime nudges → schedule deep work when your metrics say you’re strongest → check in on flow.
          </p>
        </section>

        {error ? <p className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p> : null}
        {notice ? <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">{notice}</p> : null}
        {loading ? <div className="card text-center text-moss">Loading today...</div> : null}

        {!loading && userId ? (
          <DailyGoalsCard
            goals={goals}
            saving={saving}
            onCarryForward={async () => {
              setSaving(true);
              try {
                const carried = await carryOpenGoalsForward(userId, dateKey);
                setGoals(await listGoalsForDate(userId, dateKey));
                setNotice(carried.length ? `Carried ${carried.length} open goal(s) forward.` : "Nothing to carry (today already has goals, or yesterday was clear).");
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

        {!loading && userId && prefs ? (
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
        ) : null}

        {!loading && userId ? (
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
        ) : null}

        {!loading ? <DayTimeline blocks={blocks} dateKey={dateKey} /> : null}

        {!loading ? (
          <section className="space-y-3">
            {blocks.map((block) => (
              <article className="card" key={block.id}>
                <div className="flex gap-4">
                  <div className="flex w-20 shrink-0 flex-col items-center rounded-3xl bg-cream p-3 text-center">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-moss">{getTimeOfDayBucket(block.start_time)}</span>
                    <span className="mt-2 h-3 w-3 rounded-full bg-ember" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-bold text-moss">{formatTimeRange(block.start_time, block.end_time)}</p>
                      <h2 className="mt-1 text-xl font-black tracking-[-0.035em]">{block.task?.title ?? "Untitled task"}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-sage/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-moss">{block.task?.type}</span>
                      <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-ink/80">{placementBadge(block)}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${block.completed ? "bg-moss text-cream" : "bg-oat/70 text-ink"}`}>
                        {block.completed ? "Complete" : "Ready"}
                      </span>
                    </div>
                    {!block.completed ? (
                      <Link className="primary-button w-full" href={`/feedback?block=${block.id}`}>
                        Start Task
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!loading && pendingTasks.length > 0 ? (
          <section className="card space-y-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-ember">Pending</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Unscheduled tasks</h2>
            </div>
            {pendingTasks.map((task) => (
              <div className="rounded-2xl border border-oat bg-cream/60 p-4" key={task.id}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-ember">{task.type}</p>
                <h3 className="mt-1 text-lg font-black tracking-[-0.03em]">{task.title}</h3>
                <p className="mt-1 text-sm text-moss">{task.estimated_duration} minutes</p>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="card py-10 text-center text-moss">Loading today…</div>}>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
