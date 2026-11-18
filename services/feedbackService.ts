import { isDemoMode } from "@/lib/demoMode";
import { newId, readData, withTask, writeData } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import { upsertMetricFromFeedback } from "@/services/metricsService";
import { markScheduleBlockCompleted } from "@/services/scheduleService";
import type { Feedback } from "@/types/domain";

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
