-- Phase 1–2: daily SMART goals, reminder prefs, check-ins

create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_date date not null,
  title text not null check (char_length(trim(title)) > 0),
  category text not null default 'other' check (category in ('mastery', 'resource', 'understanding', 'other')),
  status text not null default 'open' check (status in ('open', 'done', 'carried')),
  sort_order int not null default 0,
  linked_task_id uuid references public.tasks(id) on delete set null,
  carried_from_goal_id uuid references public.daily_goals(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists daily_goals_user_date_idx on public.daily_goals(user_id, goal_date);

create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  morning_time text not null default '08:30',
  nudge_times text[] not null default array['11:00', '14:00', '16:30'],
  workdays_only boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_date date not null,
  kind text not null check (kind in ('midday', 'eod', 'custom')),
  flow_score int not null check (flow_score between 1 and 5),
  stress_score int not null check (stress_score between 1 and 5),
  progress_score int not null check (progress_score between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists daily_check_ins_user_date_idx on public.daily_check_ins(user_id, check_in_date);

alter table public.daily_goals enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.daily_check_ins enable row level security;

create policy "Users manage their daily goals"
  on public.daily_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their reminder preferences"
  on public.reminder_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their check-ins"
  on public.daily_check_ins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep placement_mode available if earlier migration not applied
alter table public.schedule_blocks
  add column if not exists placement_mode text default 'auto';
