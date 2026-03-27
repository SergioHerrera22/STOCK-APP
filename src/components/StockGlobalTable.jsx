import { useEffect, useState, useMemo } from "react";
import ExportButton from "./ExportButton";
import PaginationControls from "./PaginationControls";

const LOCATIONS = [
  { key: "sucursal_1", label: "CAPITAL", accent: "text-violet-400" },
  { key: "sucursal_2", label: "RAWSON", accent: "text-violet-400" },
  { key: "sucursal_3", label: "FALUCHO", accent: "text-violet-400" },
  { key: "deposito_central", label: "Depósito", accent: "text-sky-400" },
];

function StockBadge({ value }) {
  if (value === 0)
    return (
      <span className="inline-flex items-center rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-400">
        Sin stock
      </span>
    );
  if (value <= 5)
    return (
      <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
        {value}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
      {value}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-800/40">
      <td className="px-4 py-3">
        <div className="h-3 w-32 rounded bg-slate-800" />
      </td>
      {[...Array(4)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="ml-auto h-5 w-12 rounded bg-slate-800" />
        </td>
      ))}
    </tr>
  );
}

export default function StockGlobalTable({ rows = [], isLoading }) {
  const [search, setSearch] = useState("");
  const [marca, setMarca] = useState("todas");
  const [categoria, setCategoria] = useState("todas");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const marcas = useMemo(
    () => ["todas", ...new Set(rows.map((r) => r.marca).filter(Boolean))],
    [rows],
  );

  const categorias = useMemo(
    () => ["todas", ...new Set(rows.map((r) => r.categoria).filter(Boolean))],
    [rows],
  );

  const isCriticalRow = (row) =>
    LOCATIONS.some((loc) => (row[loc.key] ?? 0) <= 5);

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return rows.filter((r) => {
      const bySearch =
        !searchTerm ||
        r.nombre.toLowerCase().includes(searchTerm) ||
        (r.marca ?? "").toLowerCase().includes(searchTerm) ||
        (r.categoria ?? "").toLowerCase().includes(searchTerm) ||
        (r.tamaño ?? "").toLowerCase().includes(searchTerm);

      const byMarca = marca === "todas" || r.marca === marca;
      const byCategoria = categoria === "todas" || r.categoria === categoria;
      const byCritical = !criticalOnly || isCriticalRow(r);

      return bySearch && byMarca && byCategoria && byCritical;
    });
  }, [rows, search, marca, categoria, criticalOnly]);

  const hasActiveFilter =
    search || marca !== "todas" || categoria !== "todas" || criticalOnly;

  useEffect(() => {
    setPage(1);
  }, [search, marca, categoria, criticalOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRows = filtered.slice(startIndex, endIndex);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
      {/* Header + filters */}
      <div className="space-y-3 border-b border-slate-800 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-slate-100">Stock global</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {filtered.length !== rows.length
                ? `${filtered.length} de ${rows.length} productos`
                : `${rows.length} producto${rows.length !== 1 ? "s" : ""} en el sistema`}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <ExportButton
              data={filtered}
              dataType="stock"
              fileName="stock_global"
            />
            {hasActiveFilter && (
              <button
                onClick={() => {
                  setSearch("");
                  setMarca("todas");
                  setCategoria("todas");
                  setCriticalOnly(false);
                }}
                className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          {/* Search with icon */}
          <div className="relative md:col-span-2">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar producto, marca o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-600 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
          </div>
          <select
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 transition focus:border-sky-500 focus:outline-none"
          >
            {marcas.map((item) => (
              <option key={item} value={item}>
                {item === "todas" ? "Todas las marcas" : item}
              </option>
            ))}
          </select>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 transition focus:border-sky-500 focus:outline-none"
          >
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item === "todas" ? "Todas las categorías" : item}
              </option>
            ))}
          </select>
        </div>

        {/* Critical toggle */}
        <label
          className={`inline-flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${
            criticalOnly
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={criticalOnly}
            onChange={(e) => setCriticalOnly(e.target.checked)}
            className="sr-only"
          />
          <svg
            className={`h-4 w-4 ${criticalOnly ? "text-amber-400" : "text-slate-600"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Solo con stock crítico</span>
        </label>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/60 bg-slate-950/30 px-5 py-2 text-[11px] text-slate-600">
        <span className="font-medium">Leyenda:</span>
        <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 font-semibold text-rose-400">
          Sin stock
        </span>
        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-400">
          Crítico ≤5
        </span>
        <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-400">
          Normal
        </span>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 p-4 md:hidden">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-800 bg-slate-950/30 p-4"
            >
              <div className="h-4 w-40 rounded bg-slate-800" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[...Array(4)].map((__, j) => (
                  <div key={j} className="h-8 rounded bg-slate-800" />
                ))}
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-2xl">
              {search ? "🔍" : "📦"}
            </div>
            <p className="font-medium text-slate-400">
              {search
                ? `Sin resultados para "${search}"`
                : "No hay productos cargados"}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {search
                ? "Probá con otro término de búsqueda."
                : "Importá un CSV para empezar."}
            </p>
          </div>
        ) : (
          paginatedRows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
            >
              <p className="text-sm font-semibold text-slate-100">
                {row.nombre}
              </p>
              {(row.marca || row.categoria || row.tamaño) && (
                <p className="mt-1 text-xs text-slate-500">
                  {[row.marca, row.categoria, row.tamaño]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {LOCATIONS.map((loc) => (
                  <div
                    key={`${row.id}-${loc.key}-mobile`}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {loc.label}
                    </p>
                    <div className="mt-1">
                      <StockBadge value={row[loc.key] ?? 0} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-800 bg-slate-900">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Producto
              </th>
              {LOCATIONS.map((loc) => (
                <th
                  key={loc.key}
                  className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${loc.accent}`}
                >
                  {loc.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-16 text-center" colSpan={5}>
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-2xl">
                    {search ? "🔍" : "📦"}
                  </div>
                  <p className="font-medium text-slate-400">
                    {search
                      ? `Sin resultados para "${search}"`
                      : "No hay productos cargados"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {search
                      ? "Probá con otro término de búsqueda."
                      : "Importá un CSV para empezar."}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-800/40 transition-colors hover:bg-slate-800/30 ${
                    idx % 2 === 0 ? "" : "bg-slate-950/20"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    <div className="flex flex-col gap-0.5">
                      <span>{row.nombre}</span>
                      {(row.marca || row.categoria || row.tamaño) && (
                        <span className="text-xs text-slate-500">
                          {[row.marca, row.categoria, row.tamaño]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  </td>
                  {LOCATIONS.map((loc) => (
                    <td
                      key={`${row.id}-${loc.key}`}
                      className="px-4 py-3 text-right"
                    >
                      <StockBadge value={row[loc.key] ?? 0} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        label={`Mostrando ${filtered.length === 0 ? 0 : startIndex + 1}-${Math.min(endIndex, filtered.length)} de ${filtered.length} productos`}
      />
    </div>
  );
}
