import { combineDateAndTime, toDateKey } from "@/lib/dates";
import { isDemoMode } from "@/lib/demoMode";
import { dayRangeFromKey, newId, readData, todayRange, withTask, writeData } from "@/lib/demoStore";
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
  if (isDemoMode) {
    return readData()
      .tasks.filter((task) => task.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTask(userId: string, input: NewTaskInput): Promise<Task> {
  if (isDemoMode) {
    const data = readData();
    const task: Task = {
      id: newId(),
      user_id: userId,
      title: input.title,
      type: input.type,
      estimated_duration: input.estimated_duration,
      created_at: new Date().toISOString()
    };
    data.tasks.unshift(task);
    writeData(data);
    return task;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function listTodayBlocksForScheduling(userId: string, dateKey?: string): Promise<ScheduleBlock[]> {
  const range = dateKey ? dayRangeFromKey(dateKey) : todayRange();
  if (isDemoMode) {
    const data = readData();
    return data.schedule_blocks
      .filter((block) => {
        const t = new Date(block.start_time).getTime();
        return block.user_id === userId && t >= range.start.getTime() && t < range.end.getTime();
      })
      .map((block) => withTask(block, data.tasks))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("*, task:tasks(*)")
    .eq("user_id", userId)
    .gte("start_time", range.start.toISOString())
    .lt("start_time", range.end.toISOString())
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
  if (isDemoMode) {
    const data = readData();
    const block = {
      id: newId(),
      user_id: userId,
      task_id: task.id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      completed: false,
      created_at: new Date().toISOString(),
      placement_mode: placementMode
    };
    data.schedule_blocks.push(block);
    writeData(data);
    return withTask(block, data.tasks);
  }

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
  input: CreateTaskWithSchedulingInput & { schedule_date?: string }
): Promise<TaskCreationResult> {
  const schedulingMode = input.scheduling_mode ?? "auto";
  const scheduleDate = input.schedule_date ?? toDateKey(new Date());
  const task = await createTask(userId, {
    title: input.title,
    type: input.type,
    estimated_duration: input.estimated_duration
  });

  if (schedulingMode === "unscheduled") {
    return { task, scheduling_mode: schedulingMode, unscheduled_reason: "Task was saved without a scheduled time." };
  }

  const existingBlocks = await listTodayBlocksForScheduling(userId, scheduleDate);

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
  input: NewTaskInput & {
    scheduling_mode?: "auto" | "manual" | "unscheduled";
    manual_start_time?: string;
    schedule_date?: string;
  }
): Promise<TaskCreationResult> {
  const scheduleDate = input.schedule_date ?? toDateKey(new Date());
  const startIso = input.manual_start_time
    ? (scheduleDate === toDateKey(new Date())
        ? getTodayAtTime(input.manual_start_time)
        : combineDateAndTime(scheduleDate, input.manual_start_time)
      ).toISOString()
    : undefined;

  return createTaskWithScheduling(userId, {
    ...input,
    schedule_date: scheduleDate,
    manual_schedule: startIso
      ? {
          start_time: startIso,
          duration_minutes: input.estimated_duration
        }
      : undefined
  });
}

export async function updateTask(taskId: string, input: NewTaskInput): Promise<Task> {
  if (isDemoMode) {
    const data = readData();
    const index = data.tasks.findIndex((task) => task.id === taskId);
    if (index < 0) throw new Error("Task not found.");
    data.tasks[index] = { ...data.tasks[index], ...input };
    writeData(data);
    return data.tasks[index];
  }

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
  if (isDemoMode) {
    const data = readData();
    data.tasks = data.tasks.filter((task) => task.id !== taskId);
    data.schedule_blocks = data.schedule_blocks.filter((block) => block.task_id !== taskId);
    writeData(data);
    return;
  }

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}
