create table public.porteno_events (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  event jsonb not null,
  primary key (owner_id, id),
  constraint valid_event check ((
    jsonb_typeof(event) = 'object'
    and event->>'id' = id::text
    and event->>'day' ~ '^\d{4}-\d{2}-\d{2}$'
    and (event->>'day')::date is not null
    and event->>'recordedAt' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    and (event->>'recordedAt')::timestamptz is not null
    and case event->>'kind'
      when 'attendance' then
        event->>'status' in ('present', 'completed', 'incomplete')
        and jsonb_typeof(event->'minutes') = 'number'
        and event->>'minutes' ~ '^\d{1,4}$'
        and (event->>'minutes')::integer between 0 and 1440
        and (event->>'status' <> 'present' or event->>'minutes' = '0')
      when 'assessment' then
        event->>'skill' in ('Gramática', 'Vocabulário', 'Escuta', 'Fala', 'Leitura', 'Escrita')
        and jsonb_typeof(event->'score') = 'number'
        and event->>'score' ~ '^\d{1,3}$'
        and (event->>'score')::integer between 0 and 100
      else false
    end
  ) is true)
);

alter table public.porteno_events enable row level security;
revoke all on public.porteno_events from anon, authenticated;
grant select, insert on public.porteno_events to authenticated;

create policy read_own_events on public.porteno_events
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy append_own_events on public.porteno_events
  for insert to authenticated with check ((select auth.uid()) = owner_id);
