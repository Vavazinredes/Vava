-- Execute depois da migração em um projeto de desenvolvimento.
-- A transação desfaz todos os dados de teste.
begin;

insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);

insert into public.porteno_events values (
  'a0000000-0000-4000-8000-000000000001',
  '706f7274-656e-8000-8000-000020261124',
  '{"id":"706f7274-656e-8000-8000-000020261124","day":"2026-11-24","recordedAt":"2026-11-24T15:00:00.000Z","kind":"attendance","status":"present","minutes":0}'
);

-- A repetição do evento mantém uma única linha.
insert into public.porteno_events
select * from public.porteno_events
on conflict (owner_id, id) do nothing;

do $$
begin
  if (select count(*) from public.porteno_events) <> 1 then
    raise exception 'Falha na leitura própria ou na idempotência';
  end if;
  begin
    insert into public.porteno_events values (
      'b0000000-0000-4000-8000-000000000002',
      '706f7274-656e-8000-8000-000020261124',
      '{"id":"706f7274-656e-8000-8000-000020261124","day":"2026-11-24","recordedAt":"2026-11-24T15:00:00.000Z","kind":"attendance","status":"present","minutes":0}'
    );
    raise exception 'Escrita em outra conta foi aceita';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.porteno_events;
    raise exception 'Exclusão do histórico foi aceita';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.porteno_events set event = event;
    raise exception 'Alteração do histórico foi aceita';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000002', true);
do $$
begin
  if exists (select 1 from public.porteno_events) then
    raise exception 'Outra conta conseguiu ler os registros';
  end if;
end $$;

set local role anon;
do $$
begin
  begin
    perform * from public.porteno_events;
    raise exception 'Leitura anônima foi aceita';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
