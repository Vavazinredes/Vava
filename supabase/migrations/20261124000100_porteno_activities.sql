create table public.porteno_activities (
  owner_id uuid not null references auth.users(id) on delete cascade,
  day date not null check (day between date '2000-01-01' and date '2100-12-31'),
  activity text not null check (activity in ('listening', 'grammar', 'writing', 'speaking', 'video-voseo', 'video-barrios')),
  recorded_at timestamptz not null default now() check (isfinite(recorded_at)),
  source text not null default 'self' check (source in ('self', 'teacher')),
  primary key (owner_id, day, activity)
);

alter table public.porteno_activities enable row level security;
revoke all on public.porteno_activities from public, anon, authenticated;
grant select on public.porteno_activities to authenticated;
grant insert (owner_id, day, activity, recorded_at, source) on public.porteno_activities to authenticated;

create policy read_own_activities on public.porteno_activities
  for select to authenticated using ((select auth.uid()) = owner_id);

create policy append_own_activities on public.porteno_activities
  for insert to authenticated with check (
    (select auth.uid()) = owner_id and source = 'self'
  );
