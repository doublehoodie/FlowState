import type { TimeOfDayBucket } from "@/types/domain";

export const TIME_BUCKETS: Record<TimeOfDayBucket, { label: string; startHour: number; endHour: number }> = {
  morning: { label: "Morning", startHour: 9, endHour: 12 },
  afternoon: { label: "Afternoon", startHour: 13, endHour: 16 },
  evening: { label: "Evening", startHour: 17, endHour: 20 }
};

export function getTimeOfDayBucket(dateInput: string | Date): TimeOfDayBucket {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const hour = date.getHours();

  if (hour >= TIME_BUCKETS.morning.startHour && hour < TIME_BUCKETS.morning.endHour) return "morning";
  if (hour >= TIME_BUCKETS.afternoon.startHour && hour < TIME_BUCKETS.afternoon.endHour) return "afternoon";
  return "evening";
}

export function getTodayAtHour(hour: number): Date {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

export function getTodayAtTime(time: string): Date {
  const [hour = 9, minute = 0] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  return `${formatter.format(new Date(startIso))} - ${formatter.format(new Date(endIso))}`;
}
