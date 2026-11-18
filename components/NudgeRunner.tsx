"use client";

import { useEffect, useRef } from "react";
import type { ReminderPreferences } from "@/types/domain";

function parseTodayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function isWorkday(date = new Date()) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export function NudgeRunner({ prefs }: { prefs: ReminderPreferences | null }) {
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];

    if (!prefs?.enabled) return;
    if (prefs.workdays_only && !isWorkday()) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const schedule = (time: string, title: string, body: string) => {
      const when = parseTodayAt(time);
      const delay = when.getTime() - Date.now();
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
      const id = window.setTimeout(() => {
        try {
          new Notification(title, { body, tag: `flowstate-${time}` });
        } catch {
          // ignore
        }
      }, delay);
      timers.current.push(id);
    };

    schedule(prefs.morning_time, "FlowState · morning nudge", "Set your 3 SMART goals for today.");
    for (const time of prefs.nudge_times) {
      schedule(time, "FlowState · refocus", "What are you working on? Return to your SMART goals.");
    }

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [prefs]);

  return null;
}

export async function requestNotificationPermission(): Promise<string> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "This browser does not support notifications.";
  }
  const result = await Notification.requestPermission();
  if (result === "granted") return "Notifications enabled for this browser.";
  if (result === "denied") return "Notifications blocked. Enable them in browser settings.";
  return "Notification permission was not granted.";
}
