import { isDemoMode } from "@/lib/demoMode";
import { readData, writeData } from "@/lib/demoStore";
import { supabase } from "@/lib/supabase";
import type { ReminderPreferences } from "@/types/domain";

const DEFAULT_PREFS = (userId: string): ReminderPreferences => ({
  user_id: userId,
  enabled: true,
  morning_time: "08:30",
  nudge_times: ["11:00", "14:00", "16:30"],
  workdays_only: true,
  updated_at: new Date().toISOString()
});

export async function getReminderPreferences(userId: string): Promise<ReminderPreferences> {
  if (isDemoMode) {
    return readData().reminder_preferences ?? DEFAULT_PREFS(userId);
  }

  const { data, error } = await supabase.from("reminder_preferences").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data as ReminderPreferences;

  const defaults = DEFAULT_PREFS(userId);
  const { data: inserted, error: insertError } = await supabase
    .from("reminder_preferences")
    .insert(defaults)
    .select("*")
    .single();
  if (insertError) throw insertError;
  return inserted as ReminderPreferences;
}

export async function saveReminderPreferences(
  userId: string,
  patch: Partial<Omit<ReminderPreferences, "user_id" | "updated_at">>
): Promise<ReminderPreferences> {
  const next = {
    ...patch,
    user_id: userId,
    updated_at: new Date().toISOString()
  };

  if (isDemoMode) {
    const data = readData();
    data.reminder_preferences = {
      ...(data.reminder_preferences ?? DEFAULT_PREFS(userId)),
      ...next
    };
    writeData(data);
    return data.reminder_preferences;
  }

  const { data, error } = await supabase
    .from("reminder_preferences")
    .upsert(next, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as ReminderPreferences;
}
