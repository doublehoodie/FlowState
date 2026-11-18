export type TaskType = "deep" | "shallow" | "admin";
export type TimeOfDayBucket = "morning" | "afternoon" | "evening";
export type SchedulingMode = "auto" | "manual" | "unscheduled";
export type GoalCategory = "mastery" | "resource" | "understanding" | "other";
export type GoalStatus = "open" | "done" | "carried";
export type CheckInKind = "midday" | "eod" | "custom";

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

/** Weintraub-style daily SMART goal */
export type DailyGoal = {
  id: string;
  user_id: string;
  goal_date: string; // YYYY-MM-DD
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  sort_order: number;
  linked_task_id?: string | null;
  carried_from_goal_id?: string | null;
  created_at: string;
};

export type NewDailyGoalInput = {
  title: string;
  category?: GoalCategory;
  sort_order?: number;
};

export type ReminderPreferences = {
  user_id: string;
  enabled: boolean;
  morning_time: string; // HH:MM
  nudge_times: string[]; // HH:MM list for in-day refocus
  workdays_only: boolean;
  updated_at: string;
};

export type DailyCheckIn = {
  id: string;
  user_id: string;
  check_in_date: string; // YYYY-MM-DD
  kind: CheckInKind;
  flow_score: number;
  stress_score: number;
  progress_score: number;
  created_at: string;
};
