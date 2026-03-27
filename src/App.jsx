import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CsvImport from "./components/CsvImport";
import StockGlobalTable from "./components/StockGlobalTable";
import InternalOrderForm from "./components/InternalOrderForm";
import DispatchPanel from "./components/DispatchPanel";
import { supabase } from "./lib/supabaseClient";

const TABS = [
  { id: "stock", label: "Stock global", icon: "▤" },
  { id: "pedidos", label: "Nuevo pedido", icon: "↑" },
  { id: "despacho", label: "Despacho", icon: "→" },
  { id: "importar", label: "Importar CSV", icon: "⊕" },
];

function StatCard({ label, value, accent }) {
  const styles = {
    sky: "border-sky-500/20    bg-sky-500/5    text-sky-400",
    amber: "border-amber-500/20  bg-amber-500/5  text-amber-400",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[accent]}`}>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-xs opacity-60 font-medium uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-2xl text-sm font-semibold border ${
        isError
          ? "bg-rose-950 border-rose-700 text-rose-200"
          : "bg-emerald-950 border-emerald-700 text-emerald-200"
      }`}
    >
      <span
        className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
          isError ? "bg-rose-500" : "bg-emerald-500"
        }`}
      >
        {isError ? "✕" : "✓"}
      </span>
      {toast.message}
    </div>
  );
}

async function fetchProductos() {
  const { data, error } = await supabase
    .from("productos")
    .select("id,nombre")
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}

async function fetchStockGlobal() {
  const [
    { data: productos, error: productError },
    { data: stock, error: stockError },
  ] = await Promise.all([
    supabase.from("productos").select("id,nombre").order("nombre"),
    supabase.from("stock").select("producto_id,ubicacion,cantidad"),
  ]);

  if (productError) throw productError;
  if (stockError) throw stockError;

  const byProduct = new Map(
    (productos ?? []).map((product) => [
      product.id,
      {
        id: product.id,
        nombre: product.nombre,
        sucursal_1: 0,
        sucursal_2: 0,
        sucursal_3: 0,
        deposito_central: 0,
      },
    ]),
  );

  for (const item of stock ?? []) {
    const row = byProduct.get(item.producto_id);
    if (!row) continue;
    row[item.ubicacion] = item.cantidad;
  }

  return Array.from(byProduct.values());
}

async function fetchPendingTransfers() {
  const { data, error } = await supabase
    .from("transferencias")
    .select(
      "id,producto_id,cantidad,estado,destino,origen,creado_at,productos(nombre)",
    )
    .eq("estado", "pendiente")
    .order("creado_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export default function App() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("stock");
  const [toast, setToast] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const productosQuery = useQuery({
    queryKey: ["productos"],
    queryFn: fetchProductos,
  });
  const stockQuery = useQuery({
    queryKey: ["stock-global"],
    queryFn: fetchStockGlobal,
  });
  const transfersQuery = useQuery({
    queryKey: ["transferencias-pendientes"],
    queryFn: fetchPendingTransfers,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (payload) => {
      const { error } = await supabase.from("transferencias").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      showToast("Pedido generado correctamente.");
      await queryClient.invalidateQueries({
        queryKey: ["transferencias-pendientes"],
      });
    },
    onError: (error) =>
      showToast(`Error al generar pedido: ${error.message}`, "error"),
  });

  const dispatchMutation = useMutation({
    mutationFn: async (pedido) => {
      setDispatchingId(pedido.id);
      const { data, error } = await supabase.rpc("dispatch_transfer", {
        p_transferencia_id: pedido.id,
      });
      if (error) throw error;
      return { pedidoSolicitado: pedido, transferenciaDespachada: data };
    },
    onSuccess: async ({ pedidoSolicitado, transferenciaDespachada }) => {
      const cantidadSolicitada = pedidoSolicitado.cantidad;
      const cantidadDespachada =
        transferenciaDespachada?.cantidad ?? cantidadSolicitada;

      if (cantidadDespachada < cantidadSolicitada) {
        showToast(
          `Stock parcial: se despacharon ${cantidadDespachada} de ${cantidadSolicitada} unidades.`,
        );
      } else {
        showToast("Pedido despachado, ahora está en tránsito.");
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["transferencias-pendientes"],
        }),
        queryClient.invalidateQueries({ queryKey: ["stock-global"] }),
      ]);
    },
    onError: (error) =>
      showToast(`Error al despachar: ${error.message}`, "error"),
    onSettled: () => setDispatchingId(null),
  });

  const pendingCount = transfersQuery.data?.length ?? 0;
  const totalProducts = stockQuery.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-black text-white">
              P
            </div>
            <div className="leading-none">
              <p className="font-bold text-slate-100">Pinturería</p>
              <p className="text-[11px] text-slate-500">Gestión de stock</p>
            </div>
          </div>

          {pendingCount > 0 && (
            <button
              onClick={() => setActiveTab("despacho")}
              className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              {pendingCount} pedido{pendingCount !== 1 ? "s" : ""} pendiente
              {pendingCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* ── Stats ── */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Productos" value={totalProducts} accent="sky" />
          <StatCard
            label="Pedidos pendientes"
            value={pendingCount}
            accent="amber"
          />
          <StatCard label="Sucursales" value="3" accent="violet" />
          <StatCard label="Depósito central" value="1" accent="emerald" />
        </div>

        {/* ── Tabs ── */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-sky-600 text-white shadow"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === "despacho" && pendingCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === "stock" && (
          <StockGlobalTable
            rows={stockQuery.data}
            isLoading={stockQuery.isLoading}
          />
        )}
        {activeTab === "pedidos" && (
          <InternalOrderForm
            productos={productosQuery.data}
            onSubmit={(payload) => createOrderMutation.mutate(payload)}
            isSubmitting={createOrderMutation.isPending}
          />
        )}
        {activeTab === "despacho" && (
          <DispatchPanel
            pedidos={transfersQuery.data}
            isLoading={transfersQuery.isLoading}
            dispatchingId={dispatchingId}
            onDispatch={(pedido) => dispatchMutation.mutate(pedido)}
          />
        )}
        {activeTab === "importar" && (
          <CsvImport
            onImported={() => {
              queryClient.invalidateQueries({ queryKey: ["stock-global"] });
              setActiveTab("stock");
            }}
          />
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
