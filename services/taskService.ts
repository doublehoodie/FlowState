import { findNextAvailableSlot, hasScheduleOverlap } from "@/lib/schedulingEngine";
import { supabase } from "@/lib/supabase";
import { getTodayAtTime } from "@/lib/timeBuckets";
import type {
  BlockPlacementMode,
  CreateTaskWithSchedulingInput,
  NewTaskInput,
  ScheduleBlock,
  Task,
  TaskCreationResult
} from "@/types/domain";

export async function listTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTask(userId: string, input: NewTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function listTodayBlocksForScheduling(userId: string): Promise<ScheduleBlock[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("*, task:tasks(*)")
    .eq("user_id", userId)
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScheduleBlock[];
}

async function createScheduleBlockForTask(
  userId: string,
  task: Task,
  start: Date,
  end: Date,
  placementMode: BlockPlacementMode
): Promise<ScheduleBlock> {
  const { data, error } = await supabase
    .from("schedule_blocks")
    .insert({
      user_id: userId,
      task_id: task.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      completed: false,
      placement_mode: placementMode
    })
    .select("*, task:tasks(*)")
    .single();

  if (error) throw error;
  return data as ScheduleBlock;
}

export async function createTaskWithScheduling(
  userId: string,
  input: CreateTaskWithSchedulingInput
): Promise<TaskCreationResult> {
  const schedulingMode = input.scheduling_mode ?? "auto";
  const task = await createTask(userId, {
    title: input.title,
    type: input.type,
    estimated_duration: input.estimated_duration
  });

  if (schedulingMode === "unscheduled") {
    return { task, scheduling_mode: schedulingMode, unscheduled_reason: "Task was saved without a scheduled time." };
  }

  const existingBlocks = await listTodayBlocksForScheduling(userId);

  if (schedulingMode === "manual") {
    if (!input.manual_schedule?.start_time) {
      return { task, scheduling_mode: "unscheduled", unscheduled_reason: "Manual scheduling needs a start time." };
    }

    const start = new Date(input.manual_schedule.start_time);
    const duration = input.manual_schedule.duration_minutes ?? input.estimated_duration;
    const end = new Date(start.getTime() + Math.max(15, duration) * 60_000);

    if (hasScheduleOverlap(start, end, existingBlocks)) {
      return { task, scheduling_mode: "unscheduled", unscheduled_reason: "The selected time overlaps another task." };
    }

    const scheduleBlock = await createScheduleBlockForTask(userId, task, start, end, "manual");
    return { task, schedule_block: scheduleBlock, scheduling_mode: schedulingMode };
  }

  const slot = findNextAvailableSlot(task.type, task.estimated_duration, existingBlocks);

  if (!slot) {
    return {
      task,
      scheduling_mode: "unscheduled",
      unscheduled_reason: "Preferred and adjacent focus buckets are full today."
    };
  }

  const scheduleBlock = await createScheduleBlockForTask(userId, task, slot.start, slot.end, "auto");
  return {
    task,
    schedule_block: scheduleBlock,
    scheduling_mode: schedulingMode,
    unscheduled_reason: slot.usedFallback ? "Preferred bucket was full, so the nearest available bucket was used." : undefined
  };
}

export async function createTaskFromForm(
  userId: string,
  input: NewTaskInput & { scheduling_mode?: "auto" | "manual" | "unscheduled"; manual_start_time?: string }
): Promise<TaskCreationResult> {
  return createTaskWithScheduling(userId, {
    ...input,
    manual_schedule: input.manual_start_time
      ? {
          start_time: getTodayAtTime(input.manual_start_time).toISOString(),
          duration_minutes: input.estimated_duration
        }
      : undefined
  });
}

export async function updateTask(taskId: string, input: NewTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}
