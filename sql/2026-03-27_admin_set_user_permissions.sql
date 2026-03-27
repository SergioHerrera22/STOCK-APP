-- Permite al admin asignar permisos por email desde la app.
-- Ejecutar en Supabase SQL Editor.

create or replace function public.admin_set_user_permissions(
  p_email text,
  p_rol public.rol_usuario,
  p_sucursal_id public.ubicacion_stock default null
)
returns public.perfiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_result public.perfiles;
  v_email text := lower(trim(p_email));
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion';
  end if;

  if lower(coalesce(auth.jwt() ->> 'email', '')) <> 'admin@robles.com' then
    raise exception 'Solo admin puede asignar permisos';
  end if;

  if v_email is null or v_email = '' then
    raise exception 'Email requerido';
  end if;

  if p_rol = 'sucursal' and p_sucursal_id not in ('sucursal_1', 'sucursal_2', 'sucursal_3') then
    raise exception 'Rol sucursal requiere sucursal_1, sucursal_2 o sucursal_3';
  end if;

  if p_rol in ('administrador', 'deposito') and p_sucursal_id is not null then
    raise exception 'Administrador y deposito no deben tener sucursal_id';
  end if;

  if p_rol = 'administrador' and v_email <> 'admin@robles.com' then
    raise exception 'Solo admin@robles.com puede tener rol administrador';
  end if;

  select id into v_uid
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_uid is null then
    raise exception 'No existe usuario auth para ese email: %', v_email;
  end if;

  insert into public.perfiles (id, email, rol, sucursal_id)
  values (
    v_uid,
    v_email,
    p_rol,
    case when p_rol = 'sucursal' then p_sucursal_id else null end
  )
  on conflict (id) do update
  set email = excluded.email,
      rol = excluded.rol,
      sucursal_id = excluded.sucursal_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_set_user_permissions(text, public.rol_usuario, public.ubicacion_stock) to authenticated;
