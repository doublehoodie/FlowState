import type { Feedback, PerformanceMetric, ScheduleBlock, Task } from "@/types/domain";

export const DEMO_USER = { id: "demo-user", email: "demo@flowstate.app" };

type DemoData = {
  tasks: Task[];
  schedule_blocks: Omit<ScheduleBlock, "task">[];
  feedback: Feedback[];
  performance_metrics: PerformanceMetric[];
};

const STORAGE_KEY = "flowstate-demo-v1";
let memoryFallback: DemoData | null = null;

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function seed(): DemoData {
  const now = new Date().toISOString();
  const sample: Array<Pick<Task, "title" | "type" | "estimated_duration">> = [
    { title: "Write thesis literature review", type: "deep", estimated_duration: 90 },
    { title: "Draft client proposal", type: "deep", estimated_duration: 60 },
    { title: "Reply to recruiter emails", type: "shallow", estimated_duration: 30 },
    { title: "Review meeting notes", type: "shallow", estimated_duration: 30 },
    { title: "Submit expense report", type: "admin", estimated_duration: 15 }
  ];

  return {
    tasks: sample.map((task) => ({ ...task, id: newId(), user_id: DEMO_USER.id, created_at: now })),
    schedule_blocks: [],
    feedback: [],
    performance_metrics: []
  };
}

export function readData(): DemoData {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as DemoData;
    } catch {
      // private mode / blocked storage
    }
  }

  if (!memoryFallback) {
    memoryFallback = seed();
    writeData(memoryFallback);
  }
  return memoryFallback;
}

export function writeData(data: DemoData): void {
  memoryFallback = data;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // keep memory only
  }
}

export function resetDemoData(): void {
  memoryFallback = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function withTask(block: Omit<ScheduleBlock, "task">, tasks: Task[]): ScheduleBlock {
  return { ...block, task: tasks.find((task) => task.id === block.task_id) };
}

export function todayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
