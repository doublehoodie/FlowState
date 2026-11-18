import { getTimeOfDayBucket } from "@/lib/timeBuckets";
import type { FeedbackWithContext, PerformanceMetric } from "@/types/domain";

type MetricKey = `${string}:${string}`;

function keyFor(metric: Pick<PerformanceMetric, "time_of_day_bucket" | "task_type">): MetricKey {
  return `${metric.time_of_day_bucket}:${metric.task_type}`;
}

export function calculateUpdatedMetric(
  existing: PerformanceMetric | undefined,
  feedback: FeedbackWithContext
): Omit<PerformanceMetric, "id" | "updated_at"> {
  const timeOfDayBucket = getTimeOfDayBucket(feedback.start_time);
  const sampleSize = existing ? existing.sample_size + 1 : 1;
  const previousFocusTotal = existing ? existing.avg_focus * existing.sample_size : 0;
  const previousDistractionTotal = existing ? existing.avg_distraction * existing.sample_size : 0;

  return {
    user_id: feedback.user_id,
    time_of_day_bucket: timeOfDayBucket,
    task_type: feedback.task_type,
    avg_focus: Number(((previousFocusTotal + feedback.focus_score) / sampleSize).toFixed(2)),
    avg_distraction: Number(((previousDistractionTotal + feedback.distraction_score) / sampleSize).toFixed(2)),
    sample_size: sampleSize
  };
}

export function updatePerformanceMetrics(
  feedbackItems: FeedbackWithContext[],
  existingMetrics: PerformanceMetric[] = []
): Array<Omit<PerformanceMetric, "id" | "updated_at">> {
  const metricsByKey = new Map<MetricKey, PerformanceMetric>();

  for (const metric of existingMetrics) {
    metricsByKey.set(keyFor(metric), metric);
  }

  const updated = new Map<MetricKey, Omit<PerformanceMetric, "id" | "updated_at">>();

  for (const feedback of feedbackItems) {
    const timeOfDayBucket = getTimeOfDayBucket(feedback.start_time);
    const key = `${timeOfDayBucket}:${feedback.task_type}` as MetricKey;
    const current = updated.get(key) ?? metricsByKey.get(key);
    const next = calculateUpdatedMetric(current as PerformanceMetric | undefined, feedback);
    updated.set(key, next);
  }

  return Array.from(updated.values());
}
