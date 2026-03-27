import { useState } from "react";

const DESTINOS = [
  { value: "sucursal_1", label: "CAPITAL" },
  { value: "sucursal_2", label: "RAWSON" },
  { value: "sucursal_3", label: "FALUCHO" },
];

export default function InternalOrderForm({
  productos = [],
  onSubmit,
  isSubmitting,
}) {
  const [productoId, setProductoId] = useState("");
  const [destino, setDestino] = useState("sucursal_1");
  const [cantidad, setCantidad] = useState(1);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!productoId || cantidad <= 0) return;

    onSubmit({
      producto_id: Number(productoId),
      origen: "deposito_central",
      destino,
      cantidad: Number(cantidad),
      estado: "pendiente",
    });

    setCantidad(1);
  };

  const currentDestino = DESTINOS.find((d) => d.value === destino);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="font-semibold text-slate-100">Nuevo pedido interno</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Solicitá stock del depósito central para una sucursal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Route visualization */}
        <div className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-sm font-medium text-slate-300">
              Depósito central
            </span>
          </div>
          <div className="flex flex-1 items-center">
            <div className="h-px flex-1 bg-slate-700" />
            <svg
              className="mx-1 h-3 w-3 text-slate-600"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path
                d="M6.5 1.5l4 4.5-4 4.5M0 6h10"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            <span className="text-sm font-medium text-slate-300">
              {currentDestino?.label ?? "..."}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Producto
            </label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 transition focus:border-sky-600 focus:outline-none"
              required
            >
              <option value="">Seleccionar producto...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sucursal destino
            </label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 transition focus:border-sky-600 focus:outline-none"
            >
              {DESTINOS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cantidad
            </label>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 transition focus:border-sky-600 focus:outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !productoId}
          className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Enviando pedido..." : "Solicitar al depósito"}
        </button>
      </form>
    </div>
  );
}
