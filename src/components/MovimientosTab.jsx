const TIPO_STYLES = {
  despacho: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  recepcion: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ajuste_manual: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

import ExportButton from "./ExportButton";

const TIPO_LABELS = {
  despacho: "Despacho",
  recepcion: "Recepción",
  ajuste_manual: "Ajuste manual",
};

const UBICACION_LABELS = {
  sucursal_1: "CAPITAL",
  sucursal_2: "RAWSON",
  sucursal_3: "FALUCHO",
  deposito_central: "Depósito",
};

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MovimientosTab({ movimientos, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        Cargando historial...
      </div>
    );
  }

  const rows = movimientos ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-100">
              Historial de movimientos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Registro de despachos, recepciones y ajustes manuales. Últimos{" "}
              {rows.length} movimientos.
            </p>
          </div>
          <ExportButton
            data={rows}
            dataType="movimientos"
            fileName="historial_movimientos"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
          <span className="text-3xl">📋</span>
          <p className="text-sm">Todavía no hay movimientos registrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Origen
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Destino
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Cant.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Motivo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-800/30">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDate(mov.creado_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                        TIPO_STYLES[mov.tipo] ?? "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {TIPO_LABELS[mov.tipo] ?? mov.tipo}
                    </span>
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-slate-200">
                    {mov.productos?.nombre ?? `#${mov.producto_id}`}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {UBICACION_LABELS[mov.origen] ?? mov.origen ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {UBICACION_LABELS[mov.destino] ?? mov.destino ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold text-slate-100">
                    {mov.cantidad}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-500">
                    {mov.motivo ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
