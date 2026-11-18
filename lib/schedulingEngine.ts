import { getTodayAtHour, TIME_BUCKETS } from "@/lib/timeBuckets";
import type { NewScheduleBlockInput, PerformanceMetric, ScheduleBlock, Task, TaskType, TimeOfDayBucket } from "@/types/domain";

type TaskWithPriority = Task & { preferredBucket: TimeOfDayBucket; bucketScore: number };

const DEFAULT_TASK_BUCKET: Record<TaskType, TimeOfDayBucket> = {
  deep: "morning",
  shallow: "afternoon",
  admin: "evening"
};

const DEFAULT_BUCKET_SCORE: Record<TaskType, Record<TimeOfDayBucket, number>> = {
  deep: { morning: 5, afternoon: 3, evening: 2 },
  shallow: { morning: 3, afternoon: 4, evening: 3 },
  admin: { morning: 2, afternoon: 3, evening: 4 }
};

const FALLBACK_BUCKETS: Record<TimeOfDayBucket, TimeOfDayBucket[]> = {
  morning: ["morning", "afternoon", "evening"],
  afternoon: ["afternoon", "morning", "evening"],
  evening: ["evening", "afternoon", "morning"]
};

export function getDefaultBucketForTaskType(taskType: TaskType): TimeOfDayBucket {
  return DEFAULT_TASK_BUCKET[taskType];
}

function overlaps(start: Date, end: Date, block: Pick<ScheduleBlock, "start_time" | "end_time">): boolean {
  const blockStart = new Date(block.start_time).getTime();
  const blockEnd = new Date(block.end_time).getTime();
  return start.getTime() < blockEnd && end.getTime() > blockStart;
}

export function hasScheduleOverlap(
  start: Date,
  end: Date,
  existingBlocks: Array<Pick<ScheduleBlock, "start_time" | "end_time">>
): boolean {
  return existingBlocks.some((block) => overlaps(start, end, block));
}

export function findNextAvailableSlot(
  taskType: TaskType,
  durationMinutes: number,
  existingBlocks: Array<Pick<ScheduleBlock, "start_time" | "end_time">>
): { start: Date; end: Date; bucket: TimeOfDayBucket; usedFallback: boolean } | undefined {
  const preferredBucket = getDefaultBucketForTaskType(taskType);
  const durationMs = Math.max(15, durationMinutes) * 60_000;

  for (const bucket of FALLBACK_BUCKETS[preferredBucket]) {
    const config = TIME_BUCKETS[bucket];
    const bucketStart = getTodayAtHour(config.startHour);
    const bucketEnd = getTodayAtHour(config.endHour);

    for (let cursor = new Date(bucketStart); cursor.getTime() + durationMs <= bucketEnd.getTime(); cursor = new Date(cursor.getTime() + 15 * 60_000)) {
      const end = new Date(cursor.getTime() + durationMs);
      if (!hasScheduleOverlap(cursor, end, existingBlocks)) {
        return {
          start: cursor,
          end,
          bucket,
          usedFallback: bucket !== preferredBucket
        };
      }
    }
  }

  return undefined;
}

export function rankBucketsForTask(taskType: TaskType, metrics: PerformanceMetric[] = []): TimeOfDayBucket[] {
  const relevantMetrics = metrics.filter((metric) => metric.task_type === taskType && metric.sample_size > 0);

  const scoredBuckets = (Object.keys(TIME_BUCKETS) as TimeOfDayBucket[]).map((bucket) => {
    const metric = relevantMetrics.find((item) => item.time_of_day_bucket === bucket);
    const learnedScore = metric ? metric.avg_focus - metric.avg_distraction * 0.35 : undefined;

    return {
      bucket,
      score: learnedScore ?? DEFAULT_BUCKET_SCORE[taskType][bucket]
    };
  });

  return scoredBuckets.sort((a, b) => b.score - a.score).map((item) => item.bucket);
}

export function generateDailySchedule(
  userId: string,
  tasks: Task[],
  metrics: PerformanceMetric[] = []
): NewScheduleBlockInput[] {
  const remainingCapacity = new Map<TimeOfDayBucket, number>(
    (Object.keys(TIME_BUCKETS) as TimeOfDayBucket[]).map((bucket) => {
      const config = TIME_BUCKETS[bucket];
      return [bucket, (config.endHour - config.startHour) * 60];
    })
  );

  const cursorByBucket = new Map<TimeOfDayBucket, Date>(
    (Object.keys(TIME_BUCKETS) as TimeOfDayBucket[]).map((bucket) => [bucket, getTodayAtHour(TIME_BUCKETS[bucket].startHour)])
  );

  const prioritizedTasks: TaskWithPriority[] = tasks
    .map((task) => {
      const rankedBuckets = rankBucketsForTask(task.type, metrics);
      const preferredBucket = rankedBuckets[0] ?? DEFAULT_TASK_BUCKET[task.type];
      const metric = metrics.find((item) => item.task_type === task.type && item.time_of_day_bucket === preferredBucket);

      return {
        ...task,
        preferredBucket,
        bucketScore: metric ? metric.avg_focus - metric.avg_distraction * 0.35 : DEFAULT_BUCKET_SCORE[task.type][preferredBucket]
      };
    })
    .sort((a, b) => {
      if (a.type !== b.type) {
        const order: Record<TaskType, number> = { deep: 0, shallow: 1, admin: 2 };
        return order[a.type] - order[b.type];
      }

      return b.bucketScore - a.bucketScore || b.estimated_duration - a.estimated_duration;
    });

  const blocks: NewScheduleBlockInput[] = [];

  for (const task of prioritizedTasks) {
    let minutesLeft = Math.max(15, task.estimated_duration);
    const bucketOrder = rankBucketsForTask(task.type, metrics);

    for (const bucket of bucketOrder) {
      const capacity = remainingCapacity.get(bucket) ?? 0;
      if (capacity <= 0 || minutesLeft <= 0) continue;

      const blockMinutes = Math.min(minutesLeft, capacity);
      const start = new Date(cursorByBucket.get(bucket) ?? getTodayAtHour(TIME_BUCKETS[bucket].startHour));
      const end = new Date(start.getTime() + blockMinutes * 60_000);

      blocks.push({
        user_id: userId,
        task_id: task.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        completed: false,
        placement_mode: "auto"
      });

      cursorByBucket.set(bucket, end);
      remainingCapacity.set(bucket, capacity - blockMinutes);
      minutesLeft -= blockMinutes;
    }
  }

  return blocks.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}
