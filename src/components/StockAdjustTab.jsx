import { useState } from "react";

const UBICACIONES = [
  { value: "sucursal_1", label: "CAPITAL" },
  { value: "sucursal_2", label: "RAWSON" },
  { value: "sucursal_3", label: "FALUCHO" },
  { value: "deposito_central", label: "Depósito Central" },
];

export default function StockAdjustTab({ productos, onAdjust, isSubmitting }) {
  const [productoId, setProductoId] = useState("");
  const [ubicacion, setUbicacion] = useState("sucursal_1");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");

  const canSubmit =
    productoId &&
    cantidad !== "" &&
    Number(cantidad) >= 0 &&
    motivo.trim().length >= 3 &&
    !isSubmitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onAdjust({
      p_producto_id: Number(productoId),
      p_ubicacion: ubicacion,
      p_cantidad: Number(cantidad),
      p_motivo: motivo.trim(),
    });
    setCantidad("");
    setMotivo("");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="font-semibold text-slate-100">Ajuste manual de stock</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Establece la cantidad exacta de stock de un producto en una ubicación.
          Se registrará en el historial de movimientos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Producto */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Producto
            </label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              <option value="">Seleccionar producto...</option>
              {(productos ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Ubicación */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ubicación
            </label>
            <select
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              {UBICACIONES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad nueva */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cantidad nueva
            </label>
            <input
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Motivo{" "}
              <span className="normal-case text-slate-600">
                (mín. 3 caracteres)
              </span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Conteo físico, merma, error carga..."
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Ajustando...
              </>
            ) : (
              "Aplicar ajuste"
            )}
          </button>

          {motivo.trim().length > 0 && motivo.trim().length < 3 && (
            <p className="text-xs text-amber-400">
              El motivo debe tener al menos 3 caracteres
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
