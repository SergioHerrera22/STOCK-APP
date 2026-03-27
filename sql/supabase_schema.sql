-- Tipos ENUM
create type public.rol_usuario as enum ('administrador', 'sucursal', 'deposito');
create type public.ubicacion_stock as enum ('sucursal_1', 'sucursal_2', 'sucursal_3', 'deposito_central');
create type public.estado_transferencia as enum ('pendiente', 'en_transito', 'entregado');

-- Perfiles de usuario vinculados a auth.users
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  rol public.rol_usuario not null,
  sucursal_id public.ubicacion_stock,
  creado_at timestamptz not null default now(),
  constraint perfiles_sucursal_valida_chk check (
    (rol = 'sucursal' and sucursal_id in ('sucursal_1', 'sucursal_2', 'sucursal_3'))
    or (rol in ('administrador', 'deposito') and sucursal_id is null)
  )
);

-- Productos
create table if not exists public.productos (
  id bigserial primary key,
  nombre text not null,
  marca text not null,
  categoria text not null,
  tamaño text not null,
  codigo_barras text unique,
  creado_at timestamptz not null default now()
);

-- Stock por ubicación
create table if not exists public.stock (
  id bigserial primary key,
  producto_id bigint not null references public.productos(id) on delete cascade,
  ubicacion public.ubicacion_stock not null,
  cantidad integer not null default 0 check (cantidad >= 0),
  unique (producto_id, ubicacion)
);

-- Transferencias internas
create table if not exists public.transferencias (
  id bigserial primary key,
  producto_id bigint not null references public.productos(id) on delete restrict,
  origen public.ubicacion_stock not null,
  destino public.ubicacion_stock not null,
  cantidad integer not null check (cantidad > 0),
  estado public.estado_transferencia not null default 'pendiente',
  creado_at timestamptz not null default now()
);

create index if not exists idx_stock_producto_ubicacion on public.stock(producto_id, ubicacion);
create index if not exists idx_transferencias_estado on public.transferencias(estado);

-- Función transaccional para despacho desde depósito
create or replace function public.dispatch_transfer(p_transferencia_id bigint)
returns public.transferencias
language plpgsql
security definer
as $$
declare
  v_transferencia public.transferencias;
  v_result public.transferencias;
  v_stock_disponible integer;
  v_cantidad_despachada integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para despachar pedidos';
  end if;

  select *
  into v_transferencia
  from public.transferencias
  where id = p_transferencia_id
  for update;

  if not found then
    raise exception 'Transferencia no encontrada';
  end if;

  if v_transferencia.estado <> 'pendiente' then
    raise exception 'Solo se pueden despachar transferencias pendientes';
  end if;

  if v_transferencia.origen <> 'deposito_central' then
    raise exception 'El origen debe ser deposito_central';
  end if;

  select cantidad
  into v_stock_disponible
  from public.stock
  where producto_id = v_transferencia.producto_id
    and ubicacion = 'deposito_central'
  for update;

  if not found then
    raise exception 'No existe stock en depósito central para este producto';
  end if;

  if v_stock_disponible <= 0 then
    raise exception 'Sin stock en depósito central';
  end if;

  v_cantidad_despachada := least(v_transferencia.cantidad, v_stock_disponible);

  update public.stock
  set cantidad = cantidad - v_cantidad_despachada
  where producto_id = v_transferencia.producto_id
    and ubicacion = 'deposito_central';

  update public.transferencias
  set estado = 'en_transito',
      cantidad = v_cantidad_despachada
  where id = v_transferencia.id
  returning * into v_result;

  return v_result;
end;
$$;

-- RLS habilitado en todas las tablas
alter table public.perfiles       enable row level security;
alter table public.productos      enable row level security;
alter table public.stock          enable row level security;
alter table public.transferencias enable row level security;

-- =========================================================
-- Políticas permisivas para la anon key (sin auth todavía)
-- Cuando implementes autenticación, reemplazá estas políticas
-- por políticas basadas en auth.uid() y roles de perfiles.
-- =========================================================

-- productos
create policy "anon_select_productos"  on public.productos for select using (true);
create policy "anon_insert_productos"  on public.productos for insert with check (true);
create policy "anon_update_productos"  on public.productos for update using (true);
create policy "anon_delete_productos"  on public.productos for delete using (true);

-- stock
create policy "anon_select_stock" on public.stock for select using (true);
create policy "authenticated_insert_stock"
  on public.stock
  for insert
  to authenticated
  with check (true);
create policy "authenticated_update_stock"
  on public.stock
  for update
  to authenticated
  using (true)
  with check (true);
create policy "authenticated_delete_stock"
  on public.stock
  for delete
  to authenticated
  using (true);

-- transferencias
create policy "anon_select_transferencias" on public.transferencias for select using (true);
create policy "anon_insert_transferencias" on public.transferencias for insert with check (true);
create policy "anon_update_transferencias" on public.transferencias for update using (true);
create policy "anon_delete_transferencias" on public.transferencias for delete using (true);
