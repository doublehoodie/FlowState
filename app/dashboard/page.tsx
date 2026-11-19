"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { CheckInCard } from "@/components/CheckInCard";
import { NudgeRunner, requestNotificationPermission } from "@/components/NudgeRunner";
import { ReminderSettingsCard } from "@/components/ReminderSettingsCard";
import { formatDayLabel, parseDateKey, toDateKey } from "@/lib/dates";
import { formatTimeRange, getTimeOfDayBucket } from "@/lib/timeBuckets";
import { getCurrentUser } from "@/services/authService";
import { listCheckInsForDate, submitCheckIn } from "@/services/checkInService";
import { getReminderPreferences, saveReminderPreferences } from "@/services/reminderService";
import {
  generateAndSaveDailySchedule,
  listTodaySchedule,
  listTodayUnscheduledTasks,
  markScheduleBlockCompleted
} from "@/services/scheduleService";
import type { DailyCheckIn, ReminderPreferences, ScheduleBlock, Task } from "@/types/domain";

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
  const height = Math.max(6, ((endMinutes - startMinutes) / timelineMinutes) * 100);
  return { top: `${top}%`, height: `${height}%` };
}

function placementBadge(block: ScheduleBlock) {
  return (block.placement_mode ?? "auto") === "manual" ? "Manual" : "Auto";
}

function DayTimeline({ blocks, dateKey }: { blocks: ScheduleBlock[]; dateKey: string }) {
  const router = useRouter();

  function handleTimelineClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-scheduled-task]")) return;

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
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="section-title">Schedule</h2>
          <p className="section-copy mt-1">Tap empty space to add a task.</p>
        </div>
        <span className="text-xs text-mist">9a–9p</span>
      </div>

      <div className="relative grid min-h-[520px] grid-cols-[2.75rem_1fr] gap-3">
        <div>
          {timelineHours.map((hour) => (
            <div className="h-[42px] text-xs text-mist" key={hour}>
              {hour > 12 ? hour - 12 : hour}
              {hour >= 12 ? "p" : "a"}
            </div>
          ))}
        </div>
        <div className="relative cursor-pointer border-l border-linen" onClick={handleTimelineClick}>
          {timelineHours.map((hour) => (
            <div className="h-[42px] border-t border-linen" key={hour} />
          ))}
          {blocks.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center">
              <p className="text-sm text-mist">Nothing scheduled. Add a task to start.</p>
            </div>
          ) : null}
          {blocks.map((block) => (
            <div
              className={`absolute left-2 right-0 z-[2] border border-linen px-3 py-2 ${
                block.completed ? "bg-linen text-charcoal" : "bg-charcoal text-paper"
              }`}
              data-scheduled-task
              key={block.id}
              style={blockPosition(block)}
            >
              <span className="block truncate text-sm">{block.task?.title ?? "Untitled"}</span>
              <span className={`mt-0.5 block text-xs ${block.completed ? "text-mist" : "text-paper/70"}`}>
                {placementBadge(block)} · {formatTimeRange(block.start_time, block.end_time)}
                {block.completed ? " · done" : ""}
              </span>
            </div>
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
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRhythm, setShowRhythm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh(currentUserId: string, key: string) {
    const [schedule, pending, dayCheckIns, reminderPrefs] = await Promise.all([
      listTodaySchedule(currentUserId, key),
      listTodayUnscheduledTasks(currentUserId, key),
      listCheckInsForDate(currentUserId, key),
      getReminderPreferences(currentUserId)
    ]);
    setBlocks(schedule);
    setPendingTasks(pending);
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
      setNotice("Schedule regenerated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate schedule.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleMarkDone(blockId: string) {
    setSaving(true);
    setError(null);
    try {
      await markScheduleBlockCompleted(blockId);
      if (userId) await refresh(userId, dateKey);
      setNotice("Marked done. Rate it in Feedback when ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not mark done.");
    } finally {
      setSaving(false);
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
      <div className="space-y-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-mist">
            {dateKey}
            {blocks.length ? ` · ${completion}% done` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link className="primary-button" href={`/tasks?source=today&date=${dateKey}`}>
              Add task
            </Link>
            <button className="text-button" disabled={generating} onClick={handleGenerate} type="button">
              {generating ? "Generating…" : "Regenerate"}
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-clay">{error}</p> : null}
        {notice ? <p className="text-sm text-success">{notice}</p> : null}
        {loading ? <p className="text-sm text-mist">Loading…</p> : null}

        {!loading ? <DayTimeline blocks={blocks} dateKey={dateKey} /> : null}

        {!loading && blocks.length > 0 ? (
          <section className="space-y-0 divide-y divide-linen border-y border-linen">
            {blocks.map((block) => (
              <article className="flex gap-4 py-4" key={block.id}>
                <div className="w-14 shrink-0">
                  <p className="text-xs text-mist">{getTimeOfDayBucket(block.start_time)}</p>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs text-mist">{formatTimeRange(block.start_time, block.end_time)}</p>
                  <h2 className="text-base font-medium text-charcoal">{block.task?.title ?? "Untitled"}</h2>
                  <p className="text-xs text-mist">
                    {block.task?.type} · {placementBadge(block)}
                    {block.completed ? " · done" : ""}
                  </p>
                  {!block.completed ? (
                    <button
                      className="text-button mt-2"
                      disabled={saving}
                      onClick={() => handleMarkDone(block.id)}
                      type="button"
                    >
                      Mark done
                    </button>
                  ) : (
                    <Link className="text-button mt-2 inline-flex" href={`/feedback?block=${block.id}`}>
                      Rate →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : null}

        {!loading && pendingTasks.length > 0 ? (
          <section className="space-y-3">
            <h2 className="section-title">Unscheduled</h2>
            <ul className="divide-y divide-linen border-y border-linen">
              {pendingTasks.map((task) => (
                <li className="py-3" key={task.id}>
                  <p className="text-sm text-charcoal">{task.title}</p>
                  <p className="text-xs text-mist">
                    {task.type} · {task.estimated_duration} min
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && userId && prefs ? (
          <section className="pt-2">
            <button className="text-button" onClick={() => setShowRhythm((v) => !v)} type="button">
              {showRhythm ? "Hide reminders & check-ins" : "Reminders & check-ins"}
            </button>
            {showRhythm ? (
              <div className="mt-6 space-y-10">
                <div>
                  <h3 className="section-title">Reminders</h3>
                  <p className="section-copy mt-1 mb-4">Morning nudge and daytime refocus.</p>
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
                <div className="divider pt-8">
                  <h3 className="section-title">Check-in</h3>
                  <p className="section-copy mt-1 mb-4">Flow, stress, and progress.</p>
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
