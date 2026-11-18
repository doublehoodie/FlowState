import { endOfDay, startOfDay, toDateKey } from "@/lib/dates";
import { isDemoMode } from "@/lib/demoMode";
import { dayRangeFromKey, newId, readData, todayRange, withTask, writeData } from "@/lib/demoStore";
import { generateDailySchedule } from "@/lib/schedulingEngine";
import { supabase } from "@/lib/supabase";
import { listPerformanceMetrics } from "@/services/metricsService";
import { listTasks } from "@/services/taskService";
import type { ScheduleBlock, Task } from "@/types/domain";

export async function listScheduleInRange(userId: string, start: Date, end: Date): Promise<ScheduleBlock[]> {
  if (isDemoMode) {
    const data = readData();
    return data.schedule_blocks
      .filter((block) => {
        const t = new Date(block.start_time).getTime();
        return block.user_id === userId && t >= start.getTime() && t < end.getTime();
      })
      .map((block) => withTask(block, data.tasks))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

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

export async function listTodaySchedule(userId: string, dateKey?: string): Promise<ScheduleBlock[]> {
  if (dateKey) {
    const { start, end } = dayRangeFromKey(dateKey);
    return listScheduleInRange(userId, start, end);
  }
  const { start, end } = todayRange();
  return listScheduleInRange(userId, start, end);
}

export async function listWeekSchedule(userId: string, weekStart: Date): Promise<ScheduleBlock[]> {
  const start = startOfDay(weekStart);
  const sunday = new Date(start);
  sunday.setDate(sunday.getDate() + 6);
  const end = endOfDay(sunday);
  return listScheduleInRange(userId, start, end);
}

export async function listTodayUnscheduledTasks(userId: string, dateKey?: string): Promise<Task[]> {
  const key = dateKey ?? toDateKey(new Date());
  const [tasks, scheduleBlocks] = await Promise.all([listTasks(userId), listTodaySchedule(userId, key)]);
  const scheduledTaskIds = new Set(scheduleBlocks.map((block) => block.task_id));

  return tasks.filter((task) => !scheduledTaskIds.has(task.id));
}

export async function generateAndSaveDailySchedule(userId: string): Promise<ScheduleBlock[]> {
  const [tasks, metrics] = await Promise.all([listTasks(userId), listPerformanceMetrics(userId)]);
  const blocks = generateDailySchedule(userId, tasks, metrics);

  if (isDemoMode) {
    const { start, end } = todayRange();
    const data = readData();
    data.schedule_blocks = data.schedule_blocks.filter((block) => {
      const t = new Date(block.start_time).getTime();
      return !(block.user_id === userId && t >= start.getTime() && t < end.getTime());
    });

    for (const block of blocks) {
      data.schedule_blocks.push({
        ...block,
        id: newId(),
        created_at: new Date().toISOString(),
        placement_mode: block.placement_mode ?? "auto"
      });
    }

    writeData(data);
    return listTodaySchedule(userId);
  }

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
  if (isDemoMode) {
    const data = readData();
    const block = data.schedule_blocks.find((item) => item.id === blockId);
    if (block) block.completed = true;
    writeData(data);
    return;
  }

  const { error } = await supabase.from("schedule_blocks").update({ completed: true }).eq("id", blockId);
  if (error) throw error;
}
