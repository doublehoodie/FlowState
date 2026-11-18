import { generateDailySchedule } from "@/lib/schedulingEngine";
import { supabase } from "@/lib/supabase";
import { listPerformanceMetrics } from "@/services/metricsService";
import { listTasks } from "@/services/taskService";
import type { ScheduleBlock, Task } from "@/types/domain";

export async function listTodaySchedule(userId: string): Promise<ScheduleBlock[]> {
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

export async function listTodayUnscheduledTasks(userId: string): Promise<Task[]> {
  const [tasks, scheduleBlocks] = await Promise.all([listTasks(userId), listTodaySchedule(userId)]);
  const scheduledTaskIds = new Set(scheduleBlocks.map((block) => block.task_id));

  // Today renders schedule_blocks for placed work. This pending list closes the sync gap
  // by surfacing tasks that exist but do not yet have a block for the current day.
  return tasks.filter((task) => !scheduledTaskIds.has(task.id));
}

export async function generateAndSaveDailySchedule(userId: string): Promise<ScheduleBlock[]> {
  const [tasks, metrics] = await Promise.all([listTasks(userId), listPerformanceMetrics(userId)]);
  const blocks = generateDailySchedule(userId, tasks, metrics);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { error: deleteError } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("user_id", userId)
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString());

  if (deleteError) throw deleteError;

  if (blocks.length === 0) return [];

  const { error } = await supabase.from("schedule_blocks").insert(blocks);
  if (error) throw error;

  return listTodaySchedule(userId);
}

export async function markScheduleBlockCompleted(blockId: string): Promise<void> {
  const { error } = await supabase.from("schedule_blocks").update({ completed: true }).eq("id", blockId);
  if (error) throw error;
}
