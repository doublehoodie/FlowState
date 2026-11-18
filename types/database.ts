import type { CheckInKind, GoalCategory, GoalStatus, TaskType, TimeOfDayBucket } from "@/types/domain";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          type: TaskType;
          estimated_duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          type: TaskType;
          estimated_duration: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      schedule_blocks: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          start_time: string;
          end_time: string;
          completed: boolean;
          created_at: string;
          placement_mode?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          start_time: string;
          end_time: string;
          completed?: boolean;
          created_at?: string;
          placement_mode?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_blocks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      feedback: {
        Row: {
          id: string;
          schedule_block_id: string;
          focus_score: number;
          distraction_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          schedule_block_id: string;
          focus_score: number;
          distraction_score: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feedback"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "feedback_schedule_block_id_fkey";
            columns: ["schedule_block_id"];
            isOneToOne: false;
            referencedRelation: "schedule_blocks";
            referencedColumns: ["id"];
          }
        ];
      };
      performance_metrics: {
        Row: {
          id: string;
          user_id: string;
          time_of_day_bucket: TimeOfDayBucket;
          task_type: TaskType;
          avg_focus: number;
          avg_distraction: number;
          sample_size: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          time_of_day_bucket: TimeOfDayBucket;
          task_type: TaskType;
          avg_focus: number;
          avg_distraction: number;
          sample_size?: number;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["performance_metrics"]["Insert"]>;
        Relationships: [];
      };
      daily_goals: {
        Row: {
          id: string;
          user_id: string;
          goal_date: string;
          title: string;
          category: GoalCategory;
          status: GoalStatus;
          sort_order: number;
          linked_task_id: string | null;
          carried_from_goal_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_date: string;
          title: string;
          category?: GoalCategory;
          status?: GoalStatus;
          sort_order?: number;
          linked_task_id?: string | null;
          carried_from_goal_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_goals"]["Insert"]>;
        Relationships: [];
      };
      reminder_preferences: {
        Row: {
          user_id: string;
          enabled: boolean;
          morning_time: string;
          nudge_times: string[];
          workdays_only: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          enabled?: boolean;
          morning_time?: string;
          nudge_times?: string[];
          workdays_only?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_preferences"]["Insert"]>;
        Relationships: [];
      };
      daily_check_ins: {
        Row: {
          id: string;
          user_id: string;
          check_in_date: string;
          kind: CheckInKind;
          flow_score: number;
          stress_score: number;
          progress_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          check_in_date: string;
          kind: CheckInKind;
          flow_score: number;
          stress_score: number;
          progress_score: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_check_ins"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
