-- Restringe visibilidad de pedidos por sucursal y mantiene acceso total para admin/deposito.
-- Ejecutar en Supabase SQL Editor.

begin;

create or replace function public.current_user_branch()
returns public.ubicacion_stock
language sql
stable
security definer
set search_path = public
as $$
  select p.sucursal_id
  from public.perfiles p
  where p.id = auth.uid();
$$;

drop policy if exists "authenticated_select_transferencias" on public.transferencias;
create policy "authenticated_select_transferencias"
  on public.transferencias
  for select
  to authenticated
  using (
    public.current_user_role() in ('administrador', 'deposito')
    or (
      public.current_user_role() = 'sucursal'
      and destino = public.current_user_branch()
    )
  );

commit;
