import { useMemo, useEffect, useState } from "react";
import BarcodeScanner from "./BarcodeScanner";

const DESTINOS = [
  { value: "sucursal_1", label: "CAPITAL" },
  { value: "sucursal_2", label: "RAWSON" },
  { value: "sucursal_3", label: "FALUCHO" },
];

export default function InternalOrderForm({
  productos = [],
  pendingOrders = [],
  onSubmit,
  onCancelOrder,
  isSubmitting,
  cancelingOrderId,
}) {
  const [productoId, setProductoId] = useState("");
  const [destino, setDestino] = useState("sucursal_1");
  const [cantidad, setCantidad] = useState(1);
  const [search, setSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  // Keyboard shortcut for scanner (Ctrl+B)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setScannerOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const filteredProductos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return productos;

    return productos.filter((p) =>
      [p.codigo_barras, p.nombre, p.marca, p.categoria, p.tamaño]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [productos, search]);

  const selectedProducto = useMemo(() => {
    if (!productoId) return null;
    return productos.find((p) => Number(p.id) === Number(productoId)) ?? null;
  }, [productos, productoId]);

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

  const pending = pendingOrders.filter((p) => p.estado === "pendiente");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
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
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buscar por código, nombre, marca, categoría o tamaño..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 mb-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition focus:border-sky-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                title="Escanear código (Ctrl+B)"
                className="mt-px mb-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-indigo-600 hover:bg-slate-900 hover:text-indigo-300"
              >
                📷
              </button>
            </div>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 transition focus:border-sky-600 focus:outline-none"
              required
            >
              <option value="">
                {filteredProductos.length
                  ? "Buscá por nombre y elegí un resultado..."
                  : "Sin resultados"}
              </option>
              {filteredProductos.map((p) => (
                <option key={p.id} value={p.id}>
                  {[p.codigo_barras, p.nombre, p.marca, p.categoria, p.tamaño]
                    .filter(Boolean)
                    .join(" | ")}
                </option>
              ))}
            </select>

            {selectedProducto && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300">
                  Codigo: {selectedProducto.codigo_barras || "Sin codigo"}
                </span>
                <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300">
                  Categoria: {selectedProducto.categoria || "-"}
                </span>
                <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                  Tamano: {selectedProducto.tamaño || "-"}
                </span>
              </div>
            )}
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
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Enviando...
            </>
          ) : (
            "Solicitar al depósito"
          )}
        </button>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
          <div className="border-b border-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Pedidos pendientes
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Podés cancelar solo pedidos pendientes indicando un motivo.
            </p>
          </div>

          <div className="divide-y divide-slate-800">
            {pending.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                No hay pedidos pendientes para cancelar.
              </p>
            ) : (
              pending.map((pedido) => {
                const isCanceling = cancelingOrderId === pedido.id;
                return (
                  <div
                    key={pedido.id}
                    className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {pedido.productos?.nombre ?? "Producto desconocido"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        ID #{pedido.id} · Destino:{" "}
                        {DESTINOS.find((d) => d.value === pedido.destino)
                          ?.label ?? pedido.destino}{" "}
                        · Cantidad: {pedido.cantidad}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isCanceling}
                      onClick={() => {
                        const motivo = window.prompt(
                          "Indica el motivo de cancelación (mínimo 3 caracteres):",
                        );
                        if (motivo === null) return;
                        const clean = motivo.trim();
                        if (clean.length < 3) {
                          window.alert(
                            "Debes indicar un motivo de al menos 3 caracteres.",
                          );
                          return;
                        }
                        onCancelOrder?.(pedido, clean);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-700/60 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCanceling ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-200/40 border-t-rose-200" />
                      ) : null}
                      Cancelar pedido
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </form>

      <BarcodeScanner
        isOpen={scannerOpen}
        onScan={(code) => {
          setSearch(code);
          setScannerOpen(false);
        }}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
