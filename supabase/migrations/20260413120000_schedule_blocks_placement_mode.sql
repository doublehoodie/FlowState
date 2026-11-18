-- Run in Supabase SQL editor if not using CLI migrations.
alter table public.schedule_blocks
  add column if not exists placement_mode text default 'auto';

update public.schedule_blocks
set placement_mode = coalesce(placement_mode, 'auto');

alter table public.schedule_blocks
  alter column placement_mode set default 'auto';
