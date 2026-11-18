create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  type text not null check (type in ('deep', 'shallow', 'admin')),
  estimated_duration int not null check (estimated_duration between 15 and 480),
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  placement_mode text default 'auto',
  check (end_time > start_time)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  schedule_block_id uuid not null references public.schedule_blocks(id) on delete cascade,
  focus_score int not null check (focus_score between 1 and 5),
  distraction_score int not null check (distraction_score between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  time_of_day_bucket text not null check (time_of_day_bucket in ('morning', 'afternoon', 'evening')),
  task_type text not null check (task_type in ('deep', 'shallow', 'admin')),
  avg_focus numeric(4, 2) not null default 0,
  avg_distraction numeric(4, 2) not null default 0,
  sample_size int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, time_of_day_bucket, task_type)
);

create index if not exists tasks_user_id_created_at_idx on public.tasks(user_id, created_at desc);
create index if not exists schedule_blocks_user_id_start_time_idx on public.schedule_blocks(user_id, start_time);
create index if not exists feedback_schedule_block_id_idx on public.feedback(schedule_block_id);
create index if not exists performance_metrics_user_id_idx on public.performance_metrics(user_id);

alter table public.tasks enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.feedback enable row level security;
alter table public.performance_metrics enable row level security;

create policy "Users can manage their tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their schedule blocks"
  on public.schedule_blocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage feedback for their blocks"
  on public.feedback for all
  using (
    exists (
      select 1 from public.schedule_blocks
      where schedule_blocks.id = feedback.schedule_block_id
        and schedule_blocks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.schedule_blocks
      where schedule_blocks.id = feedback.schedule_block_id
        and schedule_blocks.user_id = auth.uid()
    )
  );

create policy "Users can manage their performance metrics"
  on public.performance_metrics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
