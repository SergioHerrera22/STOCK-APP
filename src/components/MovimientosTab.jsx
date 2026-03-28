const TIPO_STYLES = {
  despacho: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  recepcion: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  ajuste_manual: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

import ExportButton from "./ExportButton";
import PaginationControls from "./PaginationControls";
import { useEffect, useMemo, useState } from "react";

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

export default function MovimientosTab({
  movimientos,
  isLoading,
  onGoToDespacho,
}) {
  const LS_KEY = "robles.historial.filters";

  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { tipo: "", ubicacion: "", fechaDesde: "", fechaHasta: "" };
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Persist filters
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(filters));
    setPage(1);
  }, [filters]);

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const clearFilters = () =>
    setFilters({ tipo: "", ubicacion: "", fechaDesde: "", fechaHasta: "" });

  const hasFilters = Object.values(filters).some(Boolean);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        Cargando historial...
      </div>
    );
  }

  const allRows = movimientos ?? [];

  const rows = useMemo(() => {
    return allRows.filter((mov) => {
      if (filters.tipo && mov.tipo !== filters.tipo) return false;
      if (
        filters.ubicacion &&
        mov.origen !== filters.ubicacion &&
        mov.destino !== filters.ubicacion
      )
        return false;
      if (filters.fechaDesde) {
        const from = new Date(filters.fechaDesde);
        if (new Date(mov.creado_at) < from) return false;
      }
      if (filters.fechaHasta) {
        const to = new Date(filters.fechaHasta);
        to.setHours(23, 59, 59, 999);
        if (new Date(mov.creado_at) > to) return false;
      }
      return true;
    });
  }, [allRows, filters]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = rows.slice(startIndex, endIndex);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-slate-100">
              Historial de movimientos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasFilters
                ? `${rows.length} de ${allRows.length} movimientos (filtrado)`
                : `Últimos ${allRows.length} movimientos`}
            </p>
          </div>
          <ExportButton
            data={rows}
            dataType="movimientos"
            fileName="historial_movimientos"
          />
        </div>

        {/* Filtros */}
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <select
            value={filters.tipo}
            onChange={(e) => setFilter("tipo", e.target.value)}
            className="col-span-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-300 outline-none transition focus:border-sky-500"
          >
            <option value="">Todos los tipos</option>
            <option value="despacho">Despacho</option>
            <option value="recepcion">Recepción</option>
            <option value="ajuste_manual">Ajuste manual</option>
          </select>

          <select
            value={filters.ubicacion}
            onChange={(e) => setFilter("ubicacion", e.target.value)}
            className="col-span-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-300 outline-none transition focus:border-sky-500"
          >
            <option value="">Todas las ubicaciones</option>
            <option value="deposito_central">Depósito</option>
            <option value="sucursal_1">CAPITAL</option>
            <option value="sucursal_2">RAWSON</option>
            <option value="sucursal_3">FALUCHO</option>
          </select>

          <input
            type="date"
            value={filters.fechaDesde}
            onChange={(e) => setFilter("fechaDesde", e.target.value)}
            title="Desde"
            className="col-span-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-300 outline-none transition focus:border-sky-500"
          />

          <div className="col-span-1 flex gap-2">
            <input
              type="date"
              value={filters.fechaHasta}
              onChange={(e) => setFilter("fechaHasta", e.target.value)}
              title="Hasta"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-300 outline-none transition focus:border-sky-500"
            />
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                title="Limpiar filtros"
                className="rounded-lg border border-slate-700 px-2.5 py-2 text-xs text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {allRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
          <span className="text-3xl">📋</span>
          <p className="text-sm">Todavía no hay movimientos registrados.</p>
          <p className="text-xs text-slate-500">
            Despachá o ajustá stock para generar trazabilidad automática.
          </p>
          {onGoToDespacho && (
            <button
              type="button"
              onClick={onGoToDespacho}
              className="mt-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/60 hover:text-orange-300"
            >
              Ir a Despacho
            </button>
          )}
        </div>
      ) : rows.length === 0 && allRows.length > 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
          <span className="text-3xl">🔍</span>
          <p className="text-sm">Sin resultados para los filtros aplicados.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/60 hover:text-orange-300"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            {paginatedRows.map((mov) => (
              <article
                key={`${mov.id}-mobile`}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {formatDate(mov.creado_at)}
                  </p>
                  <span
                    className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                      TIPO_STYLES[mov.tipo] ?? "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {TIPO_LABELS[mov.tipo] ?? mov.tipo}
                  </span>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {mov.productos?.nombre ?? `#${mov.producto_id}`}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2">
                    <p className="text-slate-500">Origen</p>
                    <p className="mt-0.5 text-slate-200">
                      {UBICACION_LABELS[mov.origen] ?? mov.origen ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2">
                    <p className="text-slate-500">Destino</p>
                    <p className="mt-0.5 text-slate-200">
                      {UBICACION_LABELS[mov.destino] ?? mov.destino ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2">
                    <p className="text-slate-500">Cantidad</p>
                    <p className="mt-0.5 font-mono font-semibold text-slate-100">
                      {mov.cantidad}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2">
                    <p className="text-slate-500">Motivo</p>
                    <p className="mt-0.5 text-slate-200">{mov.motivo ?? "—"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
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
                {paginatedRows.map((mov) => (
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

          <PaginationControls
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
            label={`Mostrando ${rows.length === 0 ? 0 : startIndex + 1}-${Math.min(endIndex, rows.length)} de ${rows.length} movimientos`}
          />
        </>
      )}
    </div>
  );
}
