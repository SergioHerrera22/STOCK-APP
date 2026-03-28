-- =====================================================================
-- RLS COMPLETE HARDENING  –  27/03/2026
-- Ejecutar en Supabase SQL Editor con privilegios de service_role.
-- =====================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1.  MOVIMIENTOS_STOCK
-- ──────────────────────────────────────────────────────────────────

-- Habilitar RLS si no está activado
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "movimientos_stock_select" ON movimientos_stock;
DROP POLICY IF EXISTS "movimientos_stock_insert" ON movimientos_stock;
DROP POLICY IF EXISTS "movimientos_stock_update" ON movimientos_stock;
DROP POLICY IF EXISTS "movimientos_stock_delete" ON movimientos_stock;

-- SELECT: usuario autenticado puede leer sus movimientos relevantes
--   · admin/depósito → todos
--   · sucursal       → solo los que tienen origen o destino = su sucursal_id
CREATE POLICY "movimientos_stock_select" ON movimientos_stock
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR current_user_role() = 'deposito'
    OR origen  = current_user_branch()
    OR destino = current_user_branch()
  );

-- INSERT: solo funciones SECURITY DEFINER del backend pueden insertar.
-- Los clientes normales NO insertan directamente en esta tabla.
CREATE POLICY "movimientos_stock_insert" ON movimientos_stock
  FOR INSERT TO authenticated
  WITH CHECK ( false );   -- bloqueado; inserción via función RLS-bypass

-- UPDATE / DELETE: nadie desde el cliente
CREATE POLICY "movimientos_stock_update" ON movimientos_stock
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "movimientos_stock_delete" ON movimientos_stock
  FOR DELETE TO authenticated
  USING (false);

-- ──────────────────────────────────────────────────────────────────
-- 2.  TRANSFERENCIAS  (refuerzo de INSERT)
-- ──────────────────────────────────────────────────────────────────

-- Ya existe SELECT policy del archivo anterior.
-- Agregar/reemplazar INSERT: sucursal solo puede crear pedidos para su propia sucursal.

DROP POLICY IF EXISTS "transferencias_insert" ON transferencias;

CREATE POLICY "transferencias_insert" ON transferencias
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR current_user_role() = 'deposito'
    OR destino = current_user_branch()
  );

-- UPDATE (despacho/recepción): solo deposito/admin puede actualizar estado
DROP POLICY IF EXISTS "transferencias_update" ON transferencias;

CREATE POLICY "transferencias_update" ON transferencias
  FOR UPDATE TO authenticated
  USING (
    is_admin()
    OR current_user_role() = 'deposito'
    -- sucursal puede marcar "recibido" solo los pedidos de su propia sucursal
    OR (destino = current_user_branch() AND estado = 'en_transito')
  )
  WITH CHECK (
    is_admin()
    OR current_user_role() = 'deposito'
    OR (destino = current_user_branch())
  );

-- DELETE: solo admin
DROP POLICY IF EXISTS "transferencias_delete" ON transferencias;

CREATE POLICY "transferencias_delete" ON transferencias
  FOR DELETE TO authenticated
  USING ( is_admin() );

-- ──────────────────────────────────────────────────────────────────
-- 3.  PRODUCTOS
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_select" ON productos;
DROP POLICY IF EXISTS "productos_insert" ON productos;
DROP POLICY IF EXISTS "productos_update" ON productos;
DROP POLICY IF EXISTS "productos_delete" ON productos;

-- Todos los autenticados ven productos
CREATE POLICY "productos_select" ON productos
  FOR SELECT TO authenticated USING (true);

-- Solo admin puede crear/editar/eliminar
CREATE POLICY "productos_insert" ON productos
  FOR INSERT TO authenticated
  WITH CHECK ( is_admin() );

CREATE POLICY "productos_update" ON productos
  FOR UPDATE TO authenticated
  USING ( is_admin() );

CREATE POLICY "productos_delete" ON productos
  FOR DELETE TO authenticated
  USING ( is_admin() );

-- ──────────────────────────────────────────────────────────────────
-- 4.  STOCK
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_select" ON stock;
DROP POLICY IF EXISTS "stock_insert" ON stock;
DROP POLICY IF EXISTS "stock_update" ON stock;
DROP POLICY IF EXISTS "stock_delete" ON stock;

-- Todos los autenticados ven el stock (necesario para alertas y consultas)
CREATE POLICY "stock_select" ON stock
  FOR SELECT TO authenticated USING (true);

-- Solo funciones backend modifican stock (via service_role / SECURITY DEFINER)
CREATE POLICY "stock_insert" ON stock
  FOR INSERT TO authenticated WITH CHECK (false);

CREATE POLICY "stock_update" ON stock
  FOR UPDATE TO authenticated USING (false);

CREATE POLICY "stock_delete" ON stock
  FOR DELETE TO authenticated USING (false);

-- ──────────────────────────────────────────────────────────────────
-- 5.  PERFILES
-- ──────────────────────────────────────────────────────────────────

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
DROP POLICY IF EXISTS "perfiles_select_admin" ON perfiles;
DROP POLICY IF EXISTS "perfiles_update_admin" ON perfiles;

-- Cada usuario puede leer su propio perfil
CREATE POLICY "perfiles_select_own" ON perfiles
  FOR SELECT TO authenticated
  USING ( id = auth.uid() );

-- Admin puede ver todos
CREATE POLICY "perfiles_select_admin" ON perfiles
  FOR SELECT TO authenticated
  USING ( is_admin() );

-- Solo admin puede actualizar perfiles (via RPC admin_set_user_permissions)
-- La RPC usa service_role internamente, así que esta política no bloquea la RPC.
CREATE POLICY "perfiles_update_admin" ON perfiles
  FOR UPDATE TO authenticated
  USING ( is_admin() );
