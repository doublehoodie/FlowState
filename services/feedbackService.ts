import { isDemoMode } from "@/lib/demoMode";
import { dayRangeFromKey, newId, readData, todayRange, withTask, writeData } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import { upsertMetricFromFeedback } from "@/services/metricsService";
import { markScheduleBlockCompleted } from "@/services/scheduleService";
import type { Feedback, ScheduleBlock } from "@/types/domain";

/** Completed schedule blocks for a day that still need a rating. */
export async function listCompletedBlocksForFeedback(userId: string, dateKey?: string): Promise<ScheduleBlock[]> {
  const { start, end } = dateKey ? dayRangeFromKey(dateKey) : todayRange();

  if (isDemoMode) {
    const data = readData();
    const rated = new Set(data.feedback.map((item) => item.schedule_block_id));
    return data.schedule_blocks
      .filter((block) => {
        const t = new Date(block.start_time).getTime();
        return (
          block.user_id === userId &&
          block.completed &&
          !rated.has(block.id) &&
          t >= start.getTime() &&
          t < end.getTime()
        );
      })
      .map((block) => withTask(block, data.tasks))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const { data: blocks, error } = await supabase
    .from("schedule_blocks")
    .select("*, task:tasks(*)")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  if (error) throw error;

  const rows = (blocks ?? []) as ScheduleBlock[];
  if (rows.length === 0) return [];

  const { data: existing, error: feedbackError } = await supabase
    .from("feedback")
    .select("schedule_block_id")
    .in(
      "schedule_block_id",
      rows.map((block) => block.id)
    );

  if (feedbackError) throw feedbackError;
  const rated = new Set((existing ?? []).map((item) => item.schedule_block_id));
  return rows.filter((block) => !rated.has(block.id));
}

export async function submitFeedback(scheduleBlockId: string, focusScore: number, distractionScore: number): Promise<Feedback> {
  if (isDemoMode) {
    const data = readData();
    const raw = data.schedule_blocks.find((block) => block.id === scheduleBlockId);
    if (!raw) throw new Error("Schedule block not found.");
    const block = withTask(raw, data.tasks);
    if (!block.task) throw new Error("Schedule block is missing task context.");

    const feedback: Feedback = {
      id: newId(),
      schedule_block_id: scheduleBlockId,
      focus_score: focusScore,
      distraction_score: distractionScore,
      created_at: new Date().toISOString()
    };
    data.feedback.push(feedback);
    writeData(data);

    await upsertMetricFromFeedback({
      schedule_block_id: scheduleBlockId,
      focus_score: focusScore,
      distraction_score: distractionScore,
      user_id: block.user_id,
      task_type: block.task.type,
      start_time: block.start_time
    });
    await markScheduleBlockCompleted(scheduleBlockId);
    return feedback;
  }

  const { data: block, error: blockError } = await supabase
    .from("schedule_blocks")
    .select("*, task:tasks(*)")
    .eq("id", scheduleBlockId)
    .single();

  if (blockError) throw blockError;
  if (!block.task) throw new Error("Schedule block is missing task context.");

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      schedule_block_id: scheduleBlockId,
      focus_score: focusScore,
      distraction_score: distractionScore
    })
    .select("*")
    .single();

  if (error) throw error;

  await upsertMetricFromFeedback({
    schedule_block_id: scheduleBlockId,
    focus_score: focusScore,
    distraction_score: distractionScore,
    user_id: block.user_id,
    task_type: block.task.type,
    start_time: block.start_time
  });
  await markScheduleBlockCompleted(scheduleBlockId);

  return data;
}
