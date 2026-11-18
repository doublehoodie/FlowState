import { isDemoMode } from "@/lib/demoMode";
import { newId, readData, writeData } from "@/lib/demoStore";
import { calculateUpdatedMetric } from "@/lib/learningEngine";
import { getTimeOfDayBucket } from "@/lib/timeBuckets";
import { supabase } from "@/lib/supabase";
import type { FeedbackWithContext, PerformanceMetric, TaskType, TimeOfDayBucket } from "@/types/domain";

export async function listPerformanceMetrics(userId: string): Promise<PerformanceMetric[]> {
  if (isDemoMode) {
    return readData().performance_metrics.filter((metric) => metric.user_id === userId);
  }

  const { data, error } = await supabase.from("performance_metrics").select("*").eq("user_id", userId);

  if (error) throw error;
  return data ?? [];
}

export async function findMetric(
  userId: string,
  bucket: TimeOfDayBucket,
  taskType: TaskType
): Promise<PerformanceMetric | undefined> {
  if (isDemoMode) {
    return readData().performance_metrics.find(
      (metric) => metric.user_id === userId && metric.time_of_day_bucket === bucket && metric.task_type === taskType
    );
  }

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

  if (isDemoMode) {
    const data = readData();
    if (existing) {
      const index = data.performance_metrics.findIndex((metric) => metric.id === existing.id);
      data.performance_metrics[index] = {
        ...existing,
        avg_focus: next.avg_focus,
        avg_distraction: next.avg_distraction,
        sample_size: next.sample_size,
        updated_at: new Date().toISOString()
      };
      writeData(data);
      return data.performance_metrics[index];
    }

    const created: PerformanceMetric = {
      ...next,
      id: newId(),
      updated_at: new Date().toISOString()
    };
    data.performance_metrics.push(created);
    writeData(data);
    return created;
  }

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

  const { data, error } = await supabase.from("performance_metrics").insert(next).select("*").single();

  if (error) throw error;
  return data;
}
