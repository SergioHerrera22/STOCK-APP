// supabase/functions/stock-deduct/index.ts
//
// Supabase Edge Function – Descuento de stock por venta
// =====================================================
// Deploy:
//   supabase functions deploy stock-deduct --no-verify-jwt
//
// Variables de entorno a configurar en Supabase Dashboard
// (Settings → Edge Functions → Secrets):
//   API_SECRET_KEY  →  la misma clave que pusiste en watcher.py

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_UBICACIONES = [
  "sucursal_1",
  "sucursal_2",
  "sucursal_3",
  "deposito_central",
] as const;

type Ubicacion = (typeof ALLOWED_UBICACIONES)[number];

interface RequestBody {
  codigo: string;
  descripcion?: string;
  cantidad: number;
  ubicacion: Ubicacion;
}

Deno.serve(async (req: Request) => {
  // ── Solo POST ──────────────────────────────────────────────────
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  // ── Autenticación por header x-api-key ─────────────────────────
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("API_SECRET_KEY");

  if (!expectedKey) {
    console.error(
      "API_SECRET_KEY no configurada en los secrets de la Edge Function.",
    );
    return json({ error: "Configuración incompleta en el servidor" }, 500);
  }

  if (!apiKey || apiKey !== expectedKey) {
    return json({ error: "No autorizado" }, 401);
  }

  // ── Parseo del body ────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const { codigo, descripcion, cantidad, ubicacion } = body;

  if (!codigo || typeof codigo !== "string" || codigo.trim() === "") {
    return json({ error: "Campo requerido: codigo (string)" }, 422);
  }
  if (
    typeof cantidad !== "number" ||
    !Number.isInteger(cantidad) ||
    cantidad <= 0
  ) {
    return json({ error: "Campo requerido: cantidad (entero positivo)" }, 422);
  }
  if (!ALLOWED_UBICACIONES.includes(ubicacion)) {
    return json(
      {
        error: `ubicacion inválida. Valores válidos: ${ALLOWED_UBICACIONES.join(", ")}`,
      },
      422,
    );
  }

  // ── Cliente Supabase con service_role (bypasea RLS) ───────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Buscar producto por codigo_barras ─────────────────────────
  let producto: {
    id: number;
    nombre: string;
    codigo_barras: string | null;
  } | null = null;

  const { data: productoByCodigo, error: prodCodeError } = await supabase
    .from("productos")
    .select("id, nombre, codigo_barras")
    .eq("codigo_barras", codigo.trim())
    .maybeSingle();

  if (prodCodeError) {
    console.error("Error buscando producto por codigo_barras:", prodCodeError);
  }
  producto = productoByCodigo;

  // Fallback: algunos proveedores usan un código interno distinto al codigo_barras.
  // Si viene descripcion desde el watcher, intentamos resolver por nombre.
  if (!producto && descripcion && descripcion.trim() !== "") {
    const keywords = descripcion
      .trim()
      .split(/[^A-Za-z0-9]+/)
      .filter((t) => t.length >= 4)
      .slice(0, 5);

    if (keywords.length > 0) {
      const orFilter = keywords.map((k) => `nombre.ilike.%${k}%`).join(",");
      const { data: candidatos, error: prodNameError } = await supabase
        .from("productos")
        .select("id, nombre, codigo_barras")
        .or(orFilter)
        .limit(25);

      if (prodNameError) {
        console.error("Error buscando producto por nombre:", prodNameError);
      } else if (candidatos && candidatos.length > 0) {
        const target = normalizeText(descripcion);
        const ranked = candidatos
          .map((c) => {
            const nombreNorm = normalizeText(c.nombre);
            let score = 0;
            for (const kw of keywords) {
              if (nombreNorm.includes(normalizeText(kw))) score += 1;
            }
            if (target.includes(nombreNorm) || nombreNorm.includes(target))
              score += 2;
            return { c, score };
          })
          .sort((a, b) => b.score - a.score);

        if (ranked[0].score > 0) {
          producto = ranked[0].c;
        }
      }
    }
  }

  if (!producto) {
    return json(
      {
        error: `Producto no encontrado con código: ${codigo}`,
        descripcion_recibida: descripcion ?? null,
      },
      404,
    );
  }

  // ── Buscar registro de stock para ese producto + ubicación ────
  const { data: stockRow, error: stockError } = await supabase
    .from("stock")
    .select("id, cantidad")
    .eq("producto_id", producto.id)
    .eq("ubicacion", ubicacion)
    .single();

  if (stockError || !stockRow) {
    return json(
      {
        error: `No hay registro de stock para "${producto.nombre}" en ${ubicacion}`,
      },
      404,
    );
  }

  // ── Validar stock suficiente ───────────────────────────────────
  if (stockRow.cantidad < cantidad) {
    return json(
      {
        error: `Stock insuficiente para "${producto.nombre}" en ${ubicacion}.`,
        stock_disponible: stockRow.cantidad,
        cantidad_solicitada: cantidad,
      },
      409,
    );
  }

  const stock_nuevo = stockRow.cantidad - cantidad;

  // ── Descontar stock ───────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("stock")
    .update({ cantidad: stock_nuevo })
    .eq("id", stockRow.id);

  if (updateError) {
    console.error("Error actualizando stock:", updateError);
    return json({ error: `Error interno: ${updateError.message}` }, 500);
  }

  // ── Registrar en movimientos_stock ───────────────────────────
  await supabase.from("movimientos_stock").insert({
    producto_id: producto.id,
    tipo: "ajuste_manual",
    origen: ubicacion,
    destino: null,
    cantidad,
    motivo: `Venta automática desde factura (código: ${codigo}${descripcion ? `, desc: ${descripcion}` : ""})`,
  });

  return json({
    ok: true,
    producto: producto.nombre,
    ubicacion,
    stock_anterior: stockRow.cantidad,
    stock_nuevo,
  });
});

// ── Helper ────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeText(value: string): string {
  return value
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}
