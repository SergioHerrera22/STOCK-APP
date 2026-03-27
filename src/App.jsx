import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CsvImport from "./components/CsvImport";
import StockGlobalTable from "./components/StockGlobalTable";
import InternalOrderForm from "./components/InternalOrderForm";
import DispatchPanel from "./components/DispatchPanel";
import AuthPanel from "./components/AuthPanel";
import StockAdjustTab from "./components/StockAdjustTab";
import MovimientosTab from "./components/MovimientosTab";
import { mapSupabaseError } from "./lib/errorMapper";
import { supabase } from "./lib/supabaseClient";

const TABS = [
  { id: "stock", label: "Stock global", icon: "▤" },
  { id: "pedidos", label: "Nuevo pedido", icon: "↑", requiresAuth: true },
  { id: "despacho", label: "Despacho", icon: "→", requiresAuth: true },
  { id: "ajustar", label: "Ajustar stock", icon: "✎", requiresAuth: true },
  { id: "historial", label: "Historial", icon: "≡", requiresAuth: true },
  { id: "importar", label: "Importar CSV", icon: "⊕", requiresAuth: true },
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
    supabase
      .from("productos")
      .select("id,nombre,marca,categoria")
      .order("nombre"),
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
        marca: product.marca,
        categoria: product.categoria,
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

async function fetchMovimientos() {
  const { data, error } = await supabase
    .from("movimientos_stock")
    .select(
      "id,creado_at,tipo,origen,destino,cantidad,motivo,actor_id,productos(nombre)",
    )
    .order("creado_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

async function fetchPendingTransfers() {
  const { data, error } = await supabase
    .from("transferencias")
    .select(
      "id,producto_id,cantidad,estado,destino,origen,creado_at,productos(nombre)",
    )
    .in("estado", ["pendiente", "en_transito"])
    .order("creado_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export default function App() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("stock");
  const [toast, setToast] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [receivingId, setReceivingId] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        showToast(`Error al verificar sesión: ${error.message}`, "error");
      }

      if (mounted) {
        setSession(data?.session ?? null);
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const tabRequiereAuth = TABS.find((t) => t.id === activeTab)?.requiresAuth;
    if (tabRequiereAuth && !session) {
      setActiveTab("stock");
    }
  }, [activeTab, session]);

  const handleSignIn = async () => {
    if (!credentials.email || !credentials.password) return;

    setAuthSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    setAuthSubmitting(false);

    if (error) {
      showToast(mapSupabaseError(error, "No se pudo iniciar sesion."), "error");
      return;
    }

    showToast("Sesión iniciada correctamente.");
  };

  const handleSignUp = async () => {
    if (!credentials.email || !credentials.password) return;

    setAuthSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });
    setAuthSubmitting(false);

    if (error) {
      showToast(
        mapSupabaseError(error, "No se pudo crear la cuenta."),
        "error",
      );
      return;
    }

    showToast(
      "Cuenta creada. Revisá tu correo para confirmar si tu proyecto lo requiere.",
    );
  };

  const handleResetPassword = async () => {
    if (!credentials.email) {
      showToast("Ingresa un email para recuperar contrasena.", "error");
      return;
    }

    setAuthSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      credentials.email,
    );
    setAuthSubmitting(false);

    if (error) {
      showToast(
        mapSupabaseError(error, "No se pudo enviar el email de recuperacion."),
        "error",
      );
      return;
    }

    showToast("Email de recuperacion enviado.");
  };

  const handleSignOut = async () => {
    if (!window.confirm("Deseas cerrar la sesion actual?")) return;

    setAuthSubmitting(true);
    const { error } = await supabase.auth.signOut();
    setAuthSubmitting(false);

    if (error) {
      showToast(mapSupabaseError(error, "No se pudo cerrar sesion."), "error");
      return;
    }

    showToast("Sesión cerrada.");
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
  const movimientosQuery = useQuery({
    queryKey: ["movimientos"],
    queryFn: fetchMovimientos,
    enabled: Boolean(session),
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
      showToast(mapSupabaseError(error, "Error al generar pedido."), "error"),
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
      showToast(mapSupabaseError(error, "Error al despachar."), "error"),
    onSettled: () => setDispatchingId(null),
  });

  const adjustMutation = useMutation({
    mutationFn: async (params) => {
      const { error } = await supabase.rpc("adjust_stock_manual", params);
      if (error) throw error;
    },
    onSuccess: async () => {
      showToast("Stock ajustado correctamente.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stock-global"] }),
        queryClient.invalidateQueries({ queryKey: ["movimientos"] }),
      ]);
    },
    onError: (error) =>
      showToast(mapSupabaseError(error, "Error al ajustar stock."), "error"),
  });

  const receiveMutation = useMutation({
    mutationFn: async (pedido) => {
      setReceivingId(pedido.id);
      const { error } = await supabase.rpc("receive_transfer", {
        p_transferencia_id: pedido.id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      showToast("Transferencia recibida y stock acreditado.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["transferencias-pendientes"],
        }),
        queryClient.invalidateQueries({ queryKey: ["stock-global"] }),
      ]);
    },
    onError: (error) =>
      showToast(
        mapSupabaseError(error, "Error al recibir transferencia."),
        "error",
      ),
    onSettled: () => setReceivingId(null),
  });

  const pendingCount = (transfersQuery.data ?? []).filter(
    (item) => item.estado === "pendiente",
  ).length;
  const inTransitCount = (transfersQuery.data ?? []).filter(
    (item) => item.estado === "en_transito",
  ).length;
  const totalProducts = stockQuery.data?.length ?? 0;
  const criticalProducts = (stockQuery.data ?? []).filter((row) =>
    ["sucursal_1", "sucursal_2", "sucursal_3", "deposito_central"].some(
      (key) => (row[key] ?? 0) <= 5,
    ),
  ).length;

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

          {session?.user?.email && (
            <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
              {session.user.email}
            </span>
          )}

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
          <StatCard
            label="Productos criticos"
            value={criticalProducts}
            accent="violet"
          />
          <StatCard
            label="En transito"
            value={inTransitCount}
            accent="emerald"
          />
        </div>

        <AuthPanel
          session={session}
          authLoading={authLoading}
          authSubmitting={authSubmitting}
          credentials={credentials}
          onCredentialsChange={setCredentials}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onResetPassword={handleResetPassword}
          onSignOut={handleSignOut}
        />

        {/* ── Tabs ── */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
          {TABS.map((tab) => {
            const isLocked = Boolean(tab.requiresAuth && !session);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={isLocked}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-sky-600 text-white shadow"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {isLocked && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    login
                  </span>
                )}
                {tab.id === "despacho" && pendingCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
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
            receivingId={receivingId}
            onDispatch={(pedido) => {
              if (!session) {
                showToast("Inicia sesion para despachar pedidos.", "error");
                return;
              }
              if (!window.confirm("Confirmas el despacho de este pedido?"))
                return;
              dispatchMutation.mutate(pedido);
            }}
            onReceive={(pedido) => {
              if (!session) {
                showToast("Inicia sesion para recibir pedidos.", "error");
                return;
              }
              if (!window.confirm("Confirmas la recepcion de este pedido?"))
                return;
              receiveMutation.mutate(pedido);
            }}
          />
        )}
        {activeTab === "ajustar" && (
          <StockAdjustTab
            productos={productosQuery.data}
            onAdjust={(params) => {
              if (!window.confirm("Confirmas el ajuste de stock?")) return;
              adjustMutation.mutate(params);
            }}
            isSubmitting={adjustMutation.isPending}
          />
        )}
        {activeTab === "historial" && (
          <MovimientosTab
            movimientos={movimientosQuery.data}
            isLoading={movimientosQuery.isLoading}
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
