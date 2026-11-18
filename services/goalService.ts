import { addDays, toDateKey } from "@/lib/dates";
import { isDemoMode } from "@/lib/demoMode";
import { newId, readData, writeData } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import type { DailyGoal, GoalCategory, GoalStatus, NewDailyGoalInput } from "@/types/domain";

const MAX_DAILY_GOALS = 3;

export async function listGoalsForDate(userId: string, dateKey: string): Promise<DailyGoal[]> {
  if (isDemoMode) {
    return readData()
      .daily_goals.filter((goal) => goal.user_id === userId && goal.goal_date === dateKey)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  }

  const { data, error } = await supabase
    .from("daily_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_date", dateKey)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyGoal[];
}

export async function createGoal(userId: string, dateKey: string, input: NewDailyGoalInput): Promise<DailyGoal> {
  const existing = await listGoalsForDate(userId, dateKey);
  if (existing.length >= MAX_DAILY_GOALS) {
    throw new Error("You already have 3 goals for this day. Mark one done or edit an existing goal.");
  }

  const sort_order = input.sort_order ?? existing.length;
  const category: GoalCategory = input.category ?? "other";

  if (isDemoMode) {
    const data = readData();
    const goal: DailyGoal = {
      id: newId(),
      user_id: userId,
      goal_date: dateKey,
      title: input.title.trim(),
      category,
      status: "open",
      sort_order,
      linked_task_id: null,
      carried_from_goal_id: null,
      created_at: new Date().toISOString()
    };
    data.daily_goals.push(goal);
    writeData(data);
    return goal;
  }

  const { data, error } = await supabase
    .from("daily_goals")
    .insert({
      user_id: userId,
      goal_date: dateKey,
      title: input.title.trim(),
      category,
      status: "open",
      sort_order
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DailyGoal;
}

export async function updateGoalStatus(goalId: string, status: GoalStatus): Promise<DailyGoal> {
  if (isDemoMode) {
    const data = readData();
    const index = data.daily_goals.findIndex((goal) => goal.id === goalId);
    if (index < 0) throw new Error("Goal not found.");
    data.daily_goals[index] = { ...data.daily_goals[index], status };
    writeData(data);
    return data.daily_goals[index];
  }

  const { data, error } = await supabase.from("daily_goals").update({ status }).eq("id", goalId).select("*").single();
  if (error) throw error;
  return data as DailyGoal;
}

export async function updateGoal(
  goalId: string,
  patch: Partial<Pick<DailyGoal, "title" | "category" | "linked_task_id" | "status" | "sort_order">>
): Promise<DailyGoal> {
  if (isDemoMode) {
    const data = readData();
    const index = data.daily_goals.findIndex((goal) => goal.id === goalId);
    if (index < 0) throw new Error("Goal not found.");
    data.daily_goals[index] = { ...data.daily_goals[index], ...patch };
    writeData(data);
    return data.daily_goals[index];
  }

  const { data, error } = await supabase.from("daily_goals").update(patch).eq("id", goalId).select("*").single();
  if (error) throw error;
  return data as DailyGoal;
}

export async function deleteGoal(goalId: string): Promise<void> {
  if (isDemoMode) {
    const data = readData();
    data.daily_goals = data.daily_goals.filter((goal) => goal.id !== goalId);
    writeData(data);
    return;
  }

  const { error } = await supabase.from("daily_goals").delete().eq("id", goalId);
  if (error) throw error;
}

/** Carry open goals from the previous day into today (Weintraub continuity + Phase 2). */
export async function carryOpenGoalsForward(userId: string, targetDateKey: string): Promise<DailyGoal[]> {
  const toDate = new Date(`${targetDateKey}T12:00:00`);
  const fromKey = toDateKey(addDays(toDate, -1));
  const [fromGoals, toGoals] = await Promise.all([
    listGoalsForDate(userId, fromKey),
    listGoalsForDate(userId, targetDateKey)
  ]);

  if (toGoals.length > 0) return toGoals;

  const open = fromGoals.filter((goal) => goal.status === "open");
  const created: DailyGoal[] = [];

  for (const [index, goal] of open.slice(0, MAX_DAILY_GOALS).entries()) {
    if (isDemoMode) {
      const data = readData();
      const next: DailyGoal = {
        id: newId(),
        user_id: userId,
        goal_date: targetDateKey,
        title: goal.title,
        category: goal.category,
        status: "carried",
        sort_order: index,
        linked_task_id: null,
        carried_from_goal_id: goal.id,
        created_at: new Date().toISOString()
      };
      data.daily_goals.push(next);
      writeData(data);
      created.push(next);
      continue;
    }

    const { data, error } = await supabase
      .from("daily_goals")
      .insert({
        user_id: userId,
        goal_date: targetDateKey,
        title: goal.title,
        category: goal.category,
        status: "carried",
        sort_order: index,
        carried_from_goal_id: goal.id
      })
      .select("*")
      .single();
    if (error) throw error;
    created.push(data as DailyGoal);
  }

  return created;
}

export async function listGoalsInRange(userId: string, startKey: string, endKey: string): Promise<DailyGoal[]> {
  if (isDemoMode) {
    return readData()
      .daily_goals.filter((goal) => goal.user_id === userId && goal.goal_date >= startKey && goal.goal_date <= endKey)
      .sort((a, b) => a.goal_date.localeCompare(b.goal_date) || a.sort_order - b.sort_order);
  }

  const { data, error } = await supabase
    .from("daily_goals")
    .select("*")
    .eq("user_id", userId)
    .gte("goal_date", startKey)
    .lte("goal_date", endKey)
    .order("goal_date", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyGoal[];
}
