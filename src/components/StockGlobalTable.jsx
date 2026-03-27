import { useState, useMemo } from "react";

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
        (r.categoria ?? "").toLowerCase().includes(searchTerm);

      const byMarca = marca === "todas" || r.marca === marca;
      const byCategoria = categoria === "todas" || r.categoria === categoria;
      const byCritical = !criticalOnly || isCriticalRow(r);

      return bySearch && byMarca && byCategoria && byCritical;
    });
  }, [rows, search, marca, categoria, criticalOnly]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-100">Stock global</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {rows.length} producto{rows.length !== 1 ? "s" : ""} en el sistema
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar por producto, marca o categoria"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 transition focus:border-sky-600 focus:outline-none"
          />
          <select
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition focus:border-sky-600 focus:outline-none"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition focus:border-sky-600 focus:outline-none"
          >
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item === "todas" ? "Todas las categorias" : item}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={(e) => setCriticalOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-500"
            />
            Solo criticos
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 border-b border-slate-800/60 bg-slate-950/40 px-5 py-2 text-xs text-slate-600">
        <span>Niveles de stock:</span>
        <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-400">
          Sin stock
        </span>
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">
          Bajo (≤5)
        </span>
        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400">
          Normal
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Producto
              </th>
              {LOCATIONS.map((loc) => (
                <th
                  key={loc.key}
                  className={`px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ${loc.accent}`}
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
                <td
                  className="px-4 py-12 text-center text-slate-500"
                  colSpan={5}
                >
                  {search
                    ? `No se encontró "${search}"`
                    : "No hay productos cargados. Importá un CSV para empezar."}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800/40 transition-colors hover:bg-slate-800/25"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    <div className="flex flex-col">
                      <span>{row.nombre}</span>
                      <span className="text-xs text-slate-500">
                        {row.marca} • {row.categoria}
                      </span>
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
    </div>
  );
}
