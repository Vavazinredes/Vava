-- The temporary accounts and records are rolled back.
begin;
insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
insert into public.porteno_activities (owner_id, day, activity)
values ('a0000000-0000-4000-8000-000000000001', '2026-11-24', 'grammar');
insert into public.porteno_activities (owner_id, day, activity)
values ('a0000000-0000-4000-8000-000000000001', '2026-11-24', 'grammar')
on conflict (owner_id, day, activity) do nothing;
do $test$
begin
  if (select count(*) from public.porteno_activities) <> 1 then
    raise exception 'Expected one owned activity after retry';
  end if;
  begin
    insert into public.porteno_activities (owner_id, day, activity)
    values ('b0000000-0000-4000-8000-000000000002', '2026-11-24', 'grammar');
    raise exception 'Cross-account write accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.porteno_activities (owner_id, day, activity, source)
    values ('a0000000-0000-4000-8000-000000000001', '2026-11-24', 'speaking', 'teacher');
    raise exception 'Browser impersonated teacher';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.porteno_activities (owner_id, day, activity)
    values ('a0000000-0000-4000-8000-000000000001', '2026-11-24', 'unknown');
    raise exception 'Unknown activity accepted';
  exception when check_violation then null;
  end;
  begin
    update public.porteno_activities set activity = 'speaking';
    raise exception 'History update accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.porteno_activities;
    raise exception 'History deletion accepted';
  exception when insufficient_privilege then null;
  end;
end $test$;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
do $test$
begin
  if exists (select from public.porteno_activities) then
    raise exception 'Cross-account read accepted';
  end if;
end $test$;
set local role anon;
do $test$
begin
  begin
    perform * from public.porteno_activities;
    raise exception 'Anonymous read accepted';
  exception when insufficient_privilege then null;
  end;
end $test$;
rollback;
