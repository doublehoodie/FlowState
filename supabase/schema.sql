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
