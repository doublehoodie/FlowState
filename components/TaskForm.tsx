"use client";

import { FormEvent, useMemo, useState } from "react";
import { TIME_BUCKETS } from "@/lib/timeBuckets";
import type { NewTaskInput, SchedulingMode, TaskType } from "@/types/domain";

export type TaskFormValues = NewTaskInput & {
  scheduling_mode: SchedulingMode;
  manual_start_time?: string;
};

const taskTypes: Array<{ value: TaskType; label: string; helper: string; best: string }> = [
  { value: "deep", label: "Deep", helper: "Focus-heavy work", best: "Best in morning" },
  { value: "shallow", label: "Shallow", helper: "Lighter effort", best: "Best in afternoon" },
  { value: "admin", label: "Admin", helper: "Maintenance", best: "Best in evening" }
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
    <form className="card space-y-4" onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black tracking-[-0.04em]">Task details</h2>
        {onCancel ? (
          <button className="text-sm font-bold text-moss underline-offset-4 hover:underline" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-ink">Task title</span>
        <input
          className="field"
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Write product spec"
          required
          value={form.title}
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        {taskTypes.map((type) => (
          <button
            className={`rounded-2xl border p-3 text-left transition ${
              form.type === type.value ? "border-ink bg-ink text-cream" : "border-oat bg-cream/70 text-ink"
            }`}
            key={type.value}
            onClick={() => setForm((current) => ({ ...current, type: type.value }))}
            type="button"
          >
            <span className="block text-sm font-black">{type.label}</span>
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] opacity-90">{type.best}</span>
            <span className="mt-1 block text-[11px] opacity-75">{type.helper}</span>
          </button>
        ))}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-bold text-ink">Estimated duration: {form.estimated_duration} min</span>
        <input
          className="w-full accent-ember"
          max={240}
          min={15}
          onChange={(event) => setForm((current) => ({ ...current, estimated_duration: Number(event.target.value) }))}
          step={15}
          type="range"
          value={form.estimated_duration}
        />
      </label>

      {showScheduling ? (
        <section className="space-y-3 rounded-[1.5rem] border border-oat/80 bg-cream/60 p-3">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-moss">Scheduling</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ["auto", "Auto-schedule", `Places ${form.type} work in ${bucket.label.toLowerCase()} first.`],
              ["manual", "Manual placement", "Choose a start time yourself."],
              ["unscheduled", "Unscheduled", "Save without a time block today."]
            ] as Array<[SchedulingMode, string, string]>).map(([mode, label, helper]) => (
              <button
                className={`rounded-2xl border p-3 text-left transition ${
                  form.scheduling_mode === mode ? "border-ink bg-white text-ink shadow-soft" : "border-oat bg-white/40 text-ink/75"
                }`}
                key={mode}
                onClick={() => setForm((current) => ({ ...current, scheduling_mode: mode }))}
                type="button"
              >
                <span className="block text-sm font-black">{label}</span>
                <span className="mt-1 block text-xs leading-5">{helper}</span>
              </button>
            ))}
          </div>

          {form.scheduling_mode === "auto" ? (
            <div className="rounded-2xl border border-oat/60 bg-white/50 px-4 py-3 text-xs leading-relaxed text-moss">
              <p className="font-bold text-ink/80">Auto-schedule defaults</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Deep work defaults to morning</li>
                <li>Shallow work defaults to afternoon</li>
                <li>Admin tasks default to evening</li>
              </ul>
              <p className="mt-2 text-[11px] text-moss/90">If a bucket is full, FlowState tries the next reasonable slot.</p>
            </div>
          ) : null}

          {form.scheduling_mode === "manual" ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-oat bg-white/40 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-moss">Placement detail (optional)</p>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-ink">Start time</span>
                <input
                  className="field"
                  onChange={(event) => setForm((current) => ({ ...current, manual_start_time: event.target.value }))}
                  type="time"
                  value={form.manual_start_time ?? "09:00"}
                />
              </label>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Quick picks</p>
                <div className="grid grid-cols-3 gap-2">
                  {manualSlots.map((slot) => (
                    <button
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                        form.manual_start_time === slot ? "border-ember bg-ember text-white" : "border-oat bg-white/50 text-ink"
                      }`}
                      key={slot}
                      onClick={() => setForm((current) => ({ ...current, manual_start_time: slot }))}
                      type="button"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <p className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-moss">
                Block from {form.manual_start_time ?? "09:00"} to {manualEndPreview || "end"}.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <button className="primary-button w-full" disabled={saving} type="submit">
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
