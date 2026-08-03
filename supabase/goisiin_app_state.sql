create table if not exists public.goisiin_app_state (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_goisiin_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_goisiin_app_state_updated_at on public.goisiin_app_state;
create trigger set_goisiin_app_state_updated_at
before update on public.goisiin_app_state
for each row
execute function public.set_goisiin_app_state_updated_at();

alter table public.goisiin_app_state enable row level security;

-- No anon/auth policies are required because the app reads/writes this table
-- through Vercel serverless API using SUPABASE_SERVICE_ROLE_KEY.
