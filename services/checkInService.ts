import { isDemoMode } from "@/lib/demoMode";
import { newId, readData, writeData } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import type { CheckInKind, DailyCheckIn } from "@/types/domain";

export async function listCheckInsForDate(userId: string, dateKey: string): Promise<DailyCheckIn[]> {
  if (isDemoMode) {
    return readData()
      .daily_check_ins.filter((item) => item.user_id === userId && item.check_in_date === dateKey)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const { data, error } = await supabase
    .from("daily_check_ins")
    .select("*")
    .eq("user_id", userId)
    .eq("check_in_date", dateKey)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DailyCheckIn[];
}

export async function submitCheckIn(
  userId: string,
  dateKey: string,
  input: { kind: CheckInKind; flow_score: number; stress_score: number; progress_score: number }
): Promise<DailyCheckIn> {
  if (isDemoMode) {
    const data = readData();
    const row: DailyCheckIn = {
      id: newId(),
      user_id: userId,
      check_in_date: dateKey,
      kind: input.kind,
      flow_score: input.flow_score,
      stress_score: input.stress_score,
      progress_score: input.progress_score,
      created_at: new Date().toISOString()
    };
    data.daily_check_ins.push(row);
    writeData(data);
    return row;
  }

  const { data, error } = await supabase
    .from("daily_check_ins")
    .insert({
      user_id: userId,
      check_in_date: dateKey,
      kind: input.kind,
      flow_score: input.flow_score,
      stress_score: input.stress_score,
      progress_score: input.progress_score
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DailyCheckIn;
}
