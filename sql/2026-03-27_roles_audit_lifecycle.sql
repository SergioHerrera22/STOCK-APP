-- Migracion base para roles, auditoria de stock y ciclo completo de transferencias.
-- Ejecutar en Supabase SQL Editor.

begin;

-- 1) Auditoria de movimientos
create table if not exists public.movimientos_stock (
  id bigserial primary key,
  producto_id bigint not null references public.productos(id) on delete restrict,
  transferencia_id bigint references public.transferencias(id) on delete set null,
  origen public.ubicacion_stock,
  destino public.ubicacion_stock,
  cantidad integer not null check (cantidad > 0),
  tipo text not null check (tipo in ('despacho', 'recepcion', 'ajuste_manual')),
  motivo text,
  actor_id uuid,
  creado_at timestamptz not null default now()
);

create index if not exists idx_movimientos_producto_fecha
  on public.movimientos_stock(producto_id, creado_at desc);

create index if not exists idx_movimientos_transferencia
  on public.movimientos_stock(transferencia_id);

-- 2) Funcion para recibir transferencia y cerrar ciclo en_transito -> entregado
create or replace function public.receive_transfer(p_transferencia_id bigint)
returns public.transferencias
language plpgsql
security definer
as $$
declare
  v_transferencia public.transferencias;
  v_result public.transferencias;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para recibir pedidos';
  end if;

  select *
  into v_transferencia
  from public.transferencias
  where id = p_transferencia_id
  for update;

  if not found then
    raise exception 'Transferencia no encontrada';
  end if;

  if v_transferencia.estado <> 'en_transito' then
    raise exception 'Solo se pueden recibir transferencias en transito';
  end if;

  insert into public.stock (producto_id, ubicacion, cantidad)
  values (v_transferencia.producto_id, v_transferencia.destino, v_transferencia.cantidad)
  on conflict (producto_id, ubicacion)
  do update set cantidad = public.stock.cantidad + excluded.cantidad;

  update public.transferencias
  set estado = 'entregado'
  where id = v_transferencia.id
  returning * into v_result;

  insert into public.movimientos_stock (
    producto_id,
    transferencia_id,
    origen,
    destino,
    cantidad,
    tipo,
    motivo,
    actor_id
  )
  values (
    v_result.producto_id,
    v_result.id,
    v_result.origen,
    v_result.destino,
    v_result.cantidad,
    'recepcion',
    'Recepcion de transferencia',
    auth.uid()
  );

  return v_result;
end;
$$;

-- 3) Ajuste manual de stock con motivo obligatorio
create or replace function public.adjust_stock_manual(
  p_producto_id bigint,
  p_ubicacion public.ubicacion_stock,
  p_cantidad integer,
  p_motivo text
)
returns public.stock
language plpgsql
security definer
as $$
declare
  v_result public.stock;
  v_anterior integer;
  v_delta integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion para ajustar stock';
  end if;

  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'Debes indicar un motivo valido para el ajuste';
  end if;

  if p_cantidad < 0 then
    raise exception 'La cantidad no puede ser negativa';
  end if;

  select cantidad
  into v_anterior
  from public.stock
  where producto_id = p_producto_id
    and ubicacion = p_ubicacion
  for update;

  if not found then
    v_anterior := 0;

    insert into public.stock (producto_id, ubicacion, cantidad)
    values (p_producto_id, p_ubicacion, p_cantidad)
    returning * into v_result;
  else
    update public.stock
    set cantidad = p_cantidad
    where producto_id = p_producto_id
      and ubicacion = p_ubicacion
    returning * into v_result;
  end if;

  v_delta := abs(p_cantidad - v_anterior);

  if v_delta > 0 then
    insert into public.movimientos_stock (
      producto_id,
      origen,
      destino,
      cantidad,
      tipo,
      motivo,
      actor_id
    )
    values (
      p_producto_id,
      p_ubicacion,
      p_ubicacion,
      v_delta,
      'ajuste_manual',
      p_motivo,
      auth.uid()
    );
  end if;

  return v_result;
end;
$$;

-- 4) RLS para historial de movimientos
alter table public.movimientos_stock enable row level security;

drop policy if exists "authenticated_select_movimientos_stock" on public.movimientos_stock;
create policy "authenticated_select_movimientos_stock"
  on public.movimientos_stock
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_movimientos_stock" on public.movimientos_stock;
create policy "authenticated_insert_movimientos_stock"
  on public.movimientos_stock
  for insert
  to authenticated
  with check (true);

commit;
