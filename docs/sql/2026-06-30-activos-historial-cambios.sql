-- PharmaOps 360 - Perfil individual de activos HVAC
-- GxP / ALCOA+: historial inmutable de cambios y soporte de imagen maestra.

alter table public.activos
  add column if not exists imagen_url text;

create table if not exists public.activos_historial_cambios (
  id uuid primary key default gen_random_uuid(),
  activo_id uuid not null,
  usuario_id uuid not null,
  accion text not null check (accion in ('insert', 'update', 'inactivate')),
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  justificacion_gxp text not null,
  creado_at timestamp with time zone not null default now(),
  constraint fk_activos_historial_cambios_activo_uuid
    foreign key (activo_id)
    references public.activos (uuid)
    on update restrict
    on delete restrict
);

alter table public.activos_historial_cambios enable row level security;

drop policy if exists "activos_historial_select_authenticated"
  on public.activos_historial_cambios;

create policy "activos_historial_select_authenticated"
  on public.activos_historial_cambios
  for select
  to authenticated
  using (true);

drop policy if exists "activos_historial_insert_authenticated"
  on public.activos_historial_cambios;

create policy "activos_historial_insert_authenticated"
  on public.activos_historial_cambios
  for insert
  to authenticated
  with check (auth.uid() = usuario_id);

-- No se crean politicas UPDATE/DELETE. Con RLS activo, ambas operaciones quedan denegadas.

insert into storage.buckets (id, name, public)
values ('activos', 'activos', false)
on conflict (id) do nothing;

drop policy if exists "activos_storage_select_authenticated"
  on storage.objects;

create policy "activos_storage_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'activos');

drop policy if exists "activos_storage_insert_authenticated"
  on storage.objects;

create policy "activos_storage_insert_authenticated"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'activos' and auth.uid() = owner);

select pg_notify('pgrst', 'reload schema');
