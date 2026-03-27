-- Migracion segura: escritura de stock solo para autenticados + despacho parcial
-- Ejecutar en Supabase SQL Editor.

begin;

-- 1) Reemplaza la funcion de despacho para:
--    - exigir usuario autenticado
--    - despachar parcialmente si no alcanza stock
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
    raise exception 'Debes iniciar sesion para despachar pedidos';
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
    raise exception 'No existe stock en deposito central para este producto';
  end if;

  if v_stock_disponible <= 0 then
    raise exception 'Sin stock en deposito central';
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

-- 2) Ajusta politicas de stock para que solo authenticated pueda escribir
-- Limpia politicas previas (si existen)
drop policy if exists "anon_insert_stock" on public.stock;
drop policy if exists "anon_update_stock" on public.stock;
drop policy if exists "anon_delete_stock" on public.stock;

drop policy if exists "authenticated_insert_stock" on public.stock;
drop policy if exists "authenticated_update_stock" on public.stock;
drop policy if exists "authenticated_delete_stock" on public.stock;

-- Mantiene lectura abierta (si no existe, la crea)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock'
      and policyname = 'anon_select_stock'
  ) then
    create policy "anon_select_stock"
      on public.stock
      for select
      using (true);
  end if;
end;
$$;

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

commit;
