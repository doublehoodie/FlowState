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
    setMessage("Saved. Keep FlowState open for browser nudges.");
  }

  async function handlePermission() {
    const result = await onEnableNotifications();
    setMessage(result);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 text-sm text-walnut">
        <input checked={enabled} onChange={(e) => setEnabled(e.target.checked)} type="checkbox" />
        Enable nudges
      </label>

      <label className="block space-y-2">
        <span className="label">Morning goal nudge</span>
        <input className="field" onChange={(e) => setMorning(e.target.value)} type="time" value={morning} />
      </label>

      <label className="block space-y-2">
        <span className="label">Refocus times</span>
        <input className="field" onChange={(e) => setNudges(e.target.value)} placeholder="11:00, 14:00, 16:30" value={nudges} />
      </label>

      <label className="flex items-center gap-3 text-sm text-walnut">
        <input checked={workdaysOnly} onChange={(e) => setWorkdaysOnly(e.target.checked)} type="checkbox" />
        Workdays only
      </label>

      <div className="flex flex-wrap gap-3">
        <button className="secondary-button" onClick={handlePermission} type="button">
          Allow notifications
        </button>
        <button className="primary-button" disabled={saving} onClick={handleSave} type="button">
          Save
        </button>
      </div>
      {message ? <p className="text-sm text-mist">{message}</p> : null}
    </div>
  );
}
