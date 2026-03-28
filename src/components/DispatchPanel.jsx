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

const STATUS = {
  pendiente: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400 animate-pulse",
    label: "Pendiente",
    border: "border-l-amber-500/50",
  },
  en_transito: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    dot: "bg-sky-400",
    label: "En tránsito",
    border: "border-l-sky-500/50",
  },
};

const DESTINO_LABELS = {
  sucursal_1: "CAPITAL",
  sucursal_2: "RAWSON",
  sucursal_3: "FALUCHO",
};

export default function DispatchPanel({
  pedidos = [],
  isLoading,
  onDispatch,
  onReceive,
  dispatchingId,
  receivingId,
  userRole,
}) {
  const canDispatch = userRole === "deposito" || userRole === "administrador";
  const canReceive = userRole === "sucursal" || userRole === "administrador";
  const pending = pedidos.filter((p) => p.estado === "pendiente");
  const inTransit = pedidos.filter((p) => p.estado === "en_transito");

  const renderCard = (pedido) => {
    const s = STATUS[pedido.estado] ?? STATUS.pendiente;
    const isActing = dispatchingId === pedido.id || receivingId === pedido.id;
    const isPending = pedido.estado === "pendiente";
    const showAction = isPending ? canDispatch : canReceive;

    return (
      <div
        key={pedido.id}
        className={`flex flex-col gap-4 rounded-xl border border-l-4 border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 md:flex-row md:items-center ${s.border}`}
      >
        <div className="min-w-0 flex-1 space-y-2">
          {/* Badge + time */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${s.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            <span className="text-xs text-slate-600">
              {timeAgo(pedido.creado_at)}
            </span>
          </div>

          {/* Product name */}
          <p className="truncate font-semibold text-slate-100">
            {pedido.productos?.nombre ?? "Producto desconocido"}
          </p>

          {/* Route */}
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 text-slate-400">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 1a5 5 0 100 10A5 5 0 006 1zM5 6.5v-3a1 1 0 012 0v3l1.5 1.5a1 1 0 11-1.414 1.414L5.293 7.707A1 1 0 015 7V6.5z" />
              </svg>
              Depósito central
            </span>
            <svg
              className="h-3.5 w-3.5 shrink-0 text-slate-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span className="flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-semibold text-violet-400">
              {DESTINO_LABELS[pedido.destino] ??
                pedido.destino?.replace(/_/g, " ")}
            </span>
            <span className="ml-auto rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-300">
              ×{pedido.cantidad}
            </span>
          </div>
        </div>

        {/* Action button */}
        {showAction && (
          <button
            onClick={() => (isPending ? onDispatch(pedido) : onReceive(pedido))}
            disabled={isActing}
            className={`shrink-0 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
              isPending
                ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-500/20"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20"
            }`}
          >
            {isActing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : isPending ? (
              <>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-5h2.038A2 2 0 0116 11.446V15h-.05a2.5 2.5 0 01-4.9 0H9a2 2 0 01-2-2V5a1 1 0 00-1-1H3z" />
                </svg>
                Despachar
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Marcar recibido
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Pendientes */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-100">Pedidos pendientes</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              En espera de ser despachados desde el depósito central.
            </p>
          </div>
          {pending.length > 0 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-sm font-black text-amber-400">
              {pending.length}
            </span>
          )}
        </div>
        <div className="p-4 space-y-3">
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-slate-800"
              />
            ))
          ) : pending.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-2xl">
                📭
              </div>
              <p className="text-sm font-medium text-slate-400">
                Sin pedidos pendientes
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Los nuevos pedidos aparecerán acá.
              </p>
            </div>
          ) : (
            pending.map(renderCard)
          )}
        </div>
      </div>

      {/* En tránsito */}
      {(isLoading || inTransit.length > 0) && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-100">En tránsito</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Despachados, esperando ser recibidos en la sucursal.
              </p>
            </div>
            {inTransit.length > 0 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/15 text-sm font-black text-sky-400">
                {inTransit.length}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {isLoading
              ? [...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl bg-slate-800"
                  />
                ))
              : inTransit.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}
