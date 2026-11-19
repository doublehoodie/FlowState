"use client";

import { FormEvent, useMemo, useState } from "react";
import { TIME_BUCKETS } from "@/lib/timeBuckets";
import type { NewTaskInput, SchedulingMode, TaskType } from "@/types/domain";

export type TaskFormValues = NewTaskInput & {
  scheduling_mode: SchedulingMode;
  manual_start_time?: string;
};

const taskTypes: Array<{ value: TaskType; label: string; best: string }> = [
  { value: "deep", label: "Deep", best: "Morning" },
  { value: "shallow", label: "Shallow", best: "Afternoon" },
  { value: "admin", label: "Admin", best: "Evening" }
];

const defaultByType: Record<TaskType, string> = {
  deep: "morning",
  shallow: "afternoon",
  admin: "evening"
};

const manualSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "17:00", "18:00", "19:00"];

export const emptyTaskForm: TaskFormValues = {
  title: "",
  type: "deep",
  estimated_duration: 60,
  scheduling_mode: "auto",
  manual_start_time: "09:00"
};

export function TaskForm({
  initialValue = emptyTaskForm,
  onSubmit,
  saving,
  submitLabel = "Add task",
  showScheduling = true,
  onCancel
}: {
  initialValue?: TaskFormValues;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  saving?: boolean;
  submitLabel?: string;
  showScheduling?: boolean;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<TaskFormValues>(initialValue);
  const bucket = TIME_BUCKETS[defaultByType[form.type] as keyof typeof TIME_BUCKETS];

  const manualEndPreview = useMemo(() => {
    if (!form.manual_start_time) return "";
    const [hour, minute] = form.manual_start_time.split(":").map(Number);
    const start = new Date();
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start.getTime() + form.estimated_duration * 60_000);
    return end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [form.estimated_duration, form.manual_start_time]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
    setForm(emptyTaskForm);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="section-title">New task</h2>
        {onCancel ? (
          <button className="text-button" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>

      <label className="block space-y-2">
        <span className="label">Title</span>
        <input
          className="field"
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Write product spec"
          required
          value={form.title}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {taskTypes.map((type) => (
          <button
            className={`chip ${form.type === type.value ? "chip-active" : ""}`}
            key={type.value}
            onClick={() => setForm((current) => ({ ...current, type: type.value }))}
            type="button"
          >
            {type.label} · {type.best}
          </button>
        ))}
      </div>

      <label className="block space-y-2">
        <span className="label">Duration · {form.estimated_duration} min</span>
        <input
          className="w-full accent-clay"
          max={240}
          min={15}
          onChange={(event) => setForm((current) => ({ ...current, estimated_duration: Number(event.target.value) }))}
          step={15}
          type="range"
          value={form.estimated_duration}
        />
      </label>

      {showScheduling ? (
        <section className="space-y-3 border-t border-linen pt-4">
          <p className="label">Scheduling</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["auto", "Auto"],
                ["manual", "Manual"],
                ["unscheduled", "Later"]
              ] as Array<[SchedulingMode, string]>
            ).map(([mode, label]) => (
              <button
                className={`chip ${form.scheduling_mode === mode ? "chip-active" : ""}`}
                key={mode}
                onClick={() => setForm((current) => ({ ...current, scheduling_mode: mode }))}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {form.scheduling_mode === "auto" ? (
            <p className="text-sm text-mist">Places {form.type} work in the {bucket.label.toLowerCase()} first.</p>
          ) : null}

          {form.scheduling_mode === "manual" ? (
            <div className="space-y-3">
              <label className="block space-y-2">
                <span className="label">Start time</span>
                <input
                  className="field"
                  onChange={(event) => setForm((current) => ({ ...current, manual_start_time: event.target.value }))}
                  type="time"
                  value={form.manual_start_time ?? "09:00"}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {manualSlots.map((slot) => (
                  <button
                    className={`chip ${form.manual_start_time === slot ? "chip-active" : ""}`}
                    key={slot}
                    onClick={() => setForm((current) => ({ ...current, manual_start_time: slot }))}
                    type="button"
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <p className="text-sm text-mist">
                {form.manual_start_time ?? "09:00"} → {manualEndPreview || "end"}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <button className="primary-button" disabled={saving} type="submit">
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
