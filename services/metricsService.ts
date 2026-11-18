import { calculateUpdatedMetric } from "@/lib/learningEngine";
import { getTimeOfDayBucket } from "@/lib/timeBuckets";
import { supabase } from "@/lib/supabase";
import type { FeedbackWithContext, PerformanceMetric, TaskType, TimeOfDayBucket } from "@/types/domain";

export async function listPerformanceMetrics(userId: string): Promise<PerformanceMetric[]> {
  const { data, error } = await supabase
    .from("performance_metrics")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data ?? [];
}

export async function findMetric(
  userId: string,
  bucket: TimeOfDayBucket,
  taskType: TaskType
): Promise<PerformanceMetric | undefined> {
  const { data, error } = await supabase
    .from("performance_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("time_of_day_bucket", bucket)
    .eq("task_type", taskType)
    .maybeSingle();

  if (error) throw error;
  return data ?? undefined;
}

export async function upsertMetricFromFeedback(feedback: FeedbackWithContext): Promise<PerformanceMetric> {
  const bucket = getTimeOfDayBucket(feedback.start_time);
  const existing = await findMetric(feedback.user_id, bucket, feedback.task_type);
  const next = calculateUpdatedMetric(existing, feedback);

  if (existing) {
    const { data, error } = await supabase
      .from("performance_metrics")
      .update({
        avg_focus: next.avg_focus,
        avg_distraction: next.avg_distraction,
        sample_size: next.sample_size,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("performance_metrics")
    .insert(next)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
