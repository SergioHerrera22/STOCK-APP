function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

function PendingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      Pendiente
    </span>
  );
}

const DESTINO_LABELS = {
  sucursal_1: "CAPITAL",
  sucursal_2: "RAWSON",
  sucursal_3: "FALUCHO",
};

export default function DispatchPanel({
  pedidos = [],
  isLoading,
  onDispatch,
  dispatchingId,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="font-semibold text-slate-100">Panel de despacho</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Pedidos pendientes desde el depósito central hacia sucursales.
        </p>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-slate-800"
            />
          ))
        ) : pedidos.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-3xl">&#x1F4ED;</p>
            <p className="mt-3 font-medium text-slate-400">
              Sin pedidos pendientes
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Los pedidos de las sucursales aparecerán aquí.
            </p>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 md:flex-row md:items-center"
            >
              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <PendingBadge />
                  <span className="text-xs text-slate-600">
                    {timeAgo(pedido.creado_at)}
                  </span>
                </div>
                <p className="truncate font-semibold text-slate-100">
                  {pedido.productos?.nombre ?? "Producto desconocido"}
                </p>
                {/* Route */}
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Depósito central</span>
                  <span className="text-slate-700">→</span>
                  <span className="font-medium text-violet-400">
                    {DESTINO_LABELS[pedido.destino] ??
                      pedido.destino.replace(/_/g, " ")}
                  </span>
                  <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 font-medium text-slate-300">
                    {pedido.cantidad}&nbsp;
                    {pedido.cantidad === 1 ? "unidad" : "unidades"}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => onDispatch(pedido)}
                disabled={dispatchingId === pedido.id}
                className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {dispatchingId === pedido.id ? "Despachando..." : "Despachar →"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
