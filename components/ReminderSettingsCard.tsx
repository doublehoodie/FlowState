"use client";

import { useState } from "react";
import type { ReminderPreferences } from "@/types/domain";

export function ReminderSettingsCard({
  prefs,
  saving,
  onSave,
  onEnableNotifications
}: {
  prefs: ReminderPreferences;
  saving?: boolean;
  onSave: (patch: Partial<ReminderPreferences>) => Promise<void>;
  onEnableNotifications: () => Promise<string>;
}) {
  const [enabled, setEnabled] = useState(prefs.enabled);
  const [morning, setMorning] = useState(prefs.morning_time);
  const [nudges, setNudges] = useState(prefs.nudge_times.join(", "));
  const [workdaysOnly, setWorkdaysOnly] = useState(prefs.workdays_only);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setMessage(null);
    const nudge_times = nudges
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    await onSave({ enabled, morning_time: morning, nudge_times, workdays_only: workdaysOnly });
    setMessage("Reminder preferences saved. Keep this tab open (or install as PWA later) for browser nudges.");
  }

  async function handlePermission() {
    const result = await onEnableNotifications();
    setMessage(result);
  }

  return (
    <section className="card space-y-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss">Nudges</p>
        <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Reminders through the day</h2>
        <p className="mt-2 text-sm text-moss">
          Morning: set SMART goals. Later: refocus on them. Browser notifications fire while FlowState is open.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm font-bold">
        <input checked={enabled} onChange={(e) => setEnabled(e.target.checked)} type="checkbox" />
        Enable nudges
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-bold">Morning goal nudge</span>
        <input className="field" onChange={(e) => setMorning(e.target.value)} type="time" value={morning} />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-bold">In-day refocus times (comma-separated HH:MM)</span>
        <input className="field" onChange={(e) => setNudges(e.target.value)} value={nudges} />
      </label>

      <label className="flex items-center gap-3 text-sm font-bold">
        <input checked={workdaysOnly} onChange={(e) => setWorkdaysOnly(e.target.checked)} type="checkbox" />
        Workdays only
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="secondary-button w-full" onClick={handlePermission} type="button">
          Allow browser notifications
        </button>
        <button className="primary-button w-full" disabled={saving} onClick={handleSave} type="button">
          Save reminders
        </button>
      </div>
      {message ? <p className="text-sm text-moss">{message}</p> : null}
    </section>
  );
}
