-- Usuarios por sucursal + administrador, con permisos por rol.
-- Ejecutar en Supabase SQL Editor.

begin;

-- -------------------------------------------------------------------
-- Helpers de rol
-- -------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.rol
      from public.perfiles p
      where p.id = auth.uid()
    ),
    case
      when lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@robles.com'
        then 'administrador'::public.rol_usuario
      else 'sucursal'::public.rol_usuario
    end
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@robles.com';
$$;

-- -------------------------------------------------------------------
-- Perfiles: cada usuario autenticado puede ver su perfil.
-- Admin puede ver y editar todos.
-- -------------------------------------------------------------------
alter table public.perfiles enable row level security;

drop policy if exists "authenticated_select_own_perfil" on public.perfiles;
create policy "authenticated_select_own_perfil"
  on public.perfiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "admin_insert_perfiles" on public.perfiles;
create policy "admin_insert_perfiles"
  on public.perfiles
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin_update_perfiles" on public.perfiles;
create policy "admin_update_perfiles"
  on public.perfiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_delete_perfiles" on public.perfiles;
create policy "admin_delete_perfiles"
  on public.perfiles
  for delete
  to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------------
-- Productos: lectura para autenticados, escritura solo admin.
-- -------------------------------------------------------------------
drop policy if exists "anon_select_productos" on public.productos;
drop policy if exists "anon_insert_productos" on public.productos;
drop policy if exists "anon_update_productos" on public.productos;
drop policy if exists "anon_delete_productos" on public.productos;

drop policy if exists "authenticated_select_productos" on public.productos;
create policy "authenticated_select_productos"
  on public.productos
  for select
  to authenticated
  using (true);

drop policy if exists "admin_insert_productos" on public.productos;
create policy "admin_insert_productos"
  on public.productos
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admin_update_productos" on public.productos;
create policy "admin_update_productos"
  on public.productos
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_delete_productos" on public.productos;
create policy "admin_delete_productos"
  on public.productos
  for delete
  to authenticated
  using (public.is_admin());

-- -------------------------------------------------------------------
-- Stock: lectura para autenticados, escritura para admin/deposito.
-- -------------------------------------------------------------------
drop policy if exists "anon_select_stock" on public.stock;

drop policy if exists "authenticated_select_stock" on public.stock;
create policy "authenticated_select_stock"
  on public.stock
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_stock" on public.stock;
create policy "authenticated_insert_stock"
  on public.stock
  for insert
  to authenticated
  with check (public.current_user_role() in ('administrador', 'deposito'));

drop policy if exists "authenticated_update_stock" on public.stock;
create policy "authenticated_update_stock"
  on public.stock
  for update
  to authenticated
  using (public.current_user_role() in ('administrador', 'deposito'))
  with check (public.current_user_role() in ('administrador', 'deposito'));

drop policy if exists "authenticated_delete_stock" on public.stock;
create policy "authenticated_delete_stock"
  on public.stock
  for delete
  to authenticated
  using (public.current_user_role() in ('administrador', 'deposito'));

-- -------------------------------------------------------------------
-- Transferencias: lectura/alta para autenticados.
-- Modificación y borrado solo admin/deposito (despacho/recepción).
-- -------------------------------------------------------------------
drop policy if exists "anon_select_transferencias" on public.transferencias;
drop policy if exists "anon_insert_transferencias" on public.transferencias;
drop policy if exists "anon_update_transferencias" on public.transferencias;
drop policy if exists "anon_delete_transferencias" on public.transferencias;

drop policy if exists "authenticated_select_transferencias" on public.transferencias;
create policy "authenticated_select_transferencias"
  on public.transferencias
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated_insert_transferencias" on public.transferencias;
create policy "authenticated_insert_transferencias"
  on public.transferencias
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated_update_transferencias" on public.transferencias;
create policy "authenticated_update_transferencias"
  on public.transferencias
  for update
  to authenticated
  using (public.current_user_role() in ('administrador', 'deposito'))
  with check (public.current_user_role() in ('administrador', 'deposito'));

drop policy if exists "authenticated_delete_transferencias" on public.transferencias;
create policy "authenticated_delete_transferencias"
  on public.transferencias
  for delete
  to authenticated
  using (public.current_user_role() in ('administrador', 'deposito'));

commit;

-- -------------------------------------------------------------------
-- CONFIGURACION ROBLES (usuarios y perfiles)
-- -------------------------------------------------------------------
-- 1) Crear estos usuarios en Supabase Auth > Users > Add user:
--    - rawson@robles.com
--    - capital@robles.com
--    - falucho@robles.com
--    - admin@robles.com
--    IMPORTANTE: no guardar contraseñas reales en archivos del repo.
--    Definir las claves directamente en el panel de Supabase Auth.
--
-- 2) Ejecutar este bloque para asignar rol y sucursal en public.perfiles.

insert into public.perfiles (id, email, rol, sucursal_id)
select id, email, 'administrador'::public.rol_usuario, null
from auth.users
where email = 'admin@robles.com'
on conflict (id) do update
set rol = excluded.rol,
    sucursal_id = excluded.sucursal_id,
    email = excluded.email;

insert into public.perfiles (id, email, rol, sucursal_id)
select id, email, 'sucursal'::public.rol_usuario, 'sucursal_1'::public.ubicacion_stock
from auth.users
where email = 'capital@robles.com'
on conflict (id) do update
set rol = excluded.rol,
    sucursal_id = excluded.sucursal_id,
    email = excluded.email;

insert into public.perfiles (id, email, rol, sucursal_id)
select id, email, 'sucursal'::public.rol_usuario, 'sucursal_2'::public.ubicacion_stock
from auth.users
where email = 'rawson@robles.com'
on conflict (id) do update
set rol = excluded.rol,
    sucursal_id = excluded.sucursal_id,
    email = excluded.email;

insert into public.perfiles (id, email, rol, sucursal_id)
select id, email, 'sucursal'::public.rol_usuario, 'sucursal_3'::public.ubicacion_stock
from auth.users
where email = 'falucho@robles.com'
on conflict (id) do update
set rol = excluded.rol,
    sucursal_id = excluded.sucursal_id,
    email = excluded.email;
