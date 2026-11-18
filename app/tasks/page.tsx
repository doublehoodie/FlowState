"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { emptyTaskForm, TaskForm, type TaskFormValues } from "@/components/TaskForm";
import { getCurrentUser } from "@/services/authService";
import { createTaskFromForm, deleteTask, listTasks, updateTask } from "@/services/taskService";
import type { Task } from "@/types/domain";

function taskFormValuesFromSearchParams(searchParams: URLSearchParams): TaskFormValues {
  const time = searchParams.get("time");
  if (time && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    return {
      ...emptyTaskForm,
      scheduling_mode: "manual",
      manual_start_time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    };
  }
  return { ...emptyTaskForm };
}

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh(currentUserId: string) {
    const nextTasks = await listTasks(currentUserId);
    setTasks(nextTasks);
  }

  useEffect(() => {
    getCurrentUser()
      .then(async (user) => {
        if (!user) return;
        setUserId(user.id);
        await refresh(user.id);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load tasks."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(values: TaskFormValues) {
    if (!userId) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: values.title,
          type: values.type,
          estimated_duration: values.estimated_duration
        });
        setEditingTask(null);
        setNotice("Task updated. Existing schedule placement is unchanged.");
      } else {
        const result = await createTaskFromForm(userId, values);
        setNotice(result.schedule_block ? "Task created and placed on Today." : result.unscheduled_reason ?? "Task created in Today’s pending list.");
        router.replace("/tasks");
      }
      await refresh(userId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(taskId: string) {
    if (!userId) return;
    setError(null);
    setNotice(null);

    try {
      await deleteTask(taskId);
      await refresh(userId);
      setNotice("Task deleted. Any linked schedule blocks were removed by the database cascade.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete task.");
    }
  }

  const initialForm = editingTask
    ? {
        title: editingTask.title,
        type: editingTask.type,
        estimated_duration: editingTask.estimated_duration,
        scheduling_mode: "auto" as const,
        manual_start_time: "09:00"
      }
    : taskFormValuesFromSearchParams(searchParams);

  const formKey = editingTask?.id ?? `new-${searchParams.toString()}`;

  return (
    <AppShell eyebrow="Input queue" title="Tasks">
      <div className="space-y-5">
        <TaskForm
          initialValue={initialForm}
          key={formKey}
          onCancel={editingTask ? () => setEditingTask(null) : undefined}
          onSubmit={handleSubmit}
          saving={saving}
          showScheduling={!editingTask}
          submitLabel={editingTask ? "Save changes" : "Add task"}
        />

        {error ? <p className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p> : null}
        {notice ? <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm text-moss">{notice}</p> : null}
        {loading ? <div className="card text-center text-moss">Loading tasks...</div> : null}

        <section className="space-y-3">
          {tasks.map((task) => (
            <article className="card space-y-3" key={task.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ember">{task.type}</p>
                  <h3 className="mt-1 text-xl font-black tracking-[-0.035em]">{task.title}</h3>
                  <p className="mt-1 text-sm text-moss">{task.estimated_duration} minutes</p>
                </div>
                <div className="flex gap-2">
                  <button className="secondary-button px-3 py-2 text-xs" onClick={() => setEditingTask(task)} type="button">
                    Edit
                  </button>
                  <button className="secondary-button px-3 py-2 text-xs text-ember" onClick={() => handleDelete(task.id)} type="button">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}

export default function TasksPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="card py-10 text-center text-moss">Loading tasks…</div>}>
        <TasksContent />
      </Suspense>
    </AuthGuard>
  );
}
