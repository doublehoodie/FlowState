export type TaskType = "deep" | "shallow" | "admin";
export type TimeOfDayBucket = "morning" | "afternoon" | "evening";
export type SchedulingMode = "auto" | "manual" | "unscheduled";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  type: TaskType;
  estimated_duration: number;
  created_at: string;
};

export type NewTaskInput = {
  title: string;
  type: TaskType;
  estimated_duration: number;
};

export type BlockPlacementMode = "auto" | "manual";

export type ScheduleBlock = {
  id: string;
  user_id: string;
  task_id: string;
  start_time: string;
  end_time: string;
  completed: boolean;
  created_at: string;
  /** How the block was placed: engine/auto slot vs user-picked time */
  placement_mode?: BlockPlacementMode | null;
  task?: Task;
};

export type NewScheduleBlockInput = Omit<ScheduleBlock, "id" | "created_at" | "task">;

export type ManualScheduleInput = {
  start_time: string;
  duration_minutes?: number;
};

export type CreateTaskWithSchedulingInput = NewTaskInput & {
  scheduling_mode?: SchedulingMode;
  manual_schedule?: ManualScheduleInput;
};

export type TaskCreationResult = {
  task: Task;
  schedule_block?: ScheduleBlock;
  scheduling_mode: SchedulingMode;
  unscheduled_reason?: string;
};

export type Feedback = {
  id: string;
  schedule_block_id: string;
  focus_score: number;
  distraction_score: number;
  created_at: string;
};

export type NewFeedbackInput = Omit<Feedback, "id" | "created_at">;

export type PerformanceMetric = {
  id: string;
  user_id: string;
  time_of_day_bucket: TimeOfDayBucket;
  task_type: TaskType;
  avg_focus: number;
  avg_distraction: number;
  sample_size: number;
  updated_at: string;
};

export type FeedbackWithContext = NewFeedbackInput & {
  user_id: string;
  task_type: TaskType;
  start_time: string;
};
