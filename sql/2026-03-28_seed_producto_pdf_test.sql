-- Seed de prueba para watcher PDF
-- Producto: 06010741 (tomado de factura ejemplo)
-- Stock inicial: 3 unidades en sucursal_1

with upsert_producto as (
  insert into public.productos (nombre, marca, categoria, tamaño, codigo_barras)
  values (
    'ZEOFLEX MAS.P/PLAST.0.7KG.',
    'ROBLES',
    'PINTURAS',
    '0.7KG',
    '06010741'
  )
  on conflict (codigo_barras)
  do update set
    nombre = excluded.nombre,
    marca = excluded.marca,
    categoria = excluded.categoria,
    tamaño = excluded.tamaño
  returning id
)
insert into public.stock (producto_id, ubicacion, cantidad)
select id, 'sucursal_1'::public.ubicacion_stock, 3
from upsert_producto
on conflict (producto_id, ubicacion)
do update set cantidad = excluded.cantidad;
