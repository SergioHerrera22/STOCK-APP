import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CsvImport from "./components/CsvImport";
import StockGlobalTable from "./components/StockGlobalTable";
import InternalOrderForm from "./components/InternalOrderForm";
import DispatchPanel from "./components/DispatchPanel";
import AuthPanel from "./components/AuthPanel";
import StockAdjustTab from "./components/StockAdjustTab";
import MovimientosTab from "./components/MovimientosTab";
import ProductsCrudTab from "./components/ProductsCrudTab";
import StockAlertBanner from "./components/StockAlertBanner";
import ExportButton from "./components/ExportButton";
import { mapSupabaseError } from "./lib/errorMapper";
import { supabase } from "./lib/supabaseClient";

const TABS = [
  { id: "stock", label: "Stock", icon: "stock", requiresAuth: true },
  {
    id: "productos",
    label: "Productos",
    icon: "productos",
    requiresAuth: true,
  },
  { id: "pedidos", label: "Pedido", icon: "pedido", requiresAuth: true },
  { id: "despacho", label: "Despacho", icon: "despacho", requiresAuth: true },
  { id: "ajustar", label: "Ajustar", icon: "ajustar", requiresAuth: true },
  {
    id: "historial",
    label: "Historial",
    icon: "historial",
    requiresAuth: true,
  },
  { id: "importar", label: "Importar", icon: "importar", requiresAuth: true },
];

const ROLE_LABELS = {
  administrador: "Admin",
  sucursal: "Sucursal",
  deposito: "Depósito",
};

const BRANCH_LABELS = {
  sucursal_1: "CAPITAL",
  sucursal_2: "RAWSON",
  sucursal_3: "FALUCHO",
  deposito_central: "Depósito Central",
};

const ROLE_ALLOWED_TABS = {
  administrador: [
    "stock",
    "productos",
    "pedidos",
    "despacho",
    "ajustar",
    "historial",
    "importar",
  ],
  sucursal: ["stock", "pedidos", "despacho", "ajustar"],
  deposito: ["stock", "pedidos", "despacho", "ajustar"],
};

const TAB_ICONS = {
  stock: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
    </svg>
  ),
  productos: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v2H3V5z" />
      <path d="M3 9h14v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path d="M8 12a1 1 0 100 2h4a1 1 0 100-2H8z" />
    </svg>
  ),
  pedido: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  despacho: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-5h2.038A2 2 0 0116 11.446V15h-.05a2.5 2.5 0 01-4.9 0H9a2 2 0 01-2-2V5a1 1 0 00-1-1H3z" />
    </svg>
  ),
  ajustar: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path
        fillRule="evenodd"
        d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        clipRule="evenodd"
      />
    </svg>
  ),
  historial: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  ),
  importar: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

function StatCard({ label, value, accent, icon }) {
  const styles = {
    sky: {
      wrap: "border-sky-500/20 from-sky-500/[0.12] to-sky-500/[0.03]",
      text: "text-sky-300",
      bg: "bg-sky-500/10",
    },
    amber: {
      wrap: "border-amber-500/20 from-amber-500/[0.12] to-amber-500/[0.03]",
      text: "text-amber-300",
      bg: "bg-amber-500/10",
    },
    violet: {
      wrap: "border-violet-500/20 from-violet-500/[0.12] to-violet-500/[0.03]",
      text: "text-violet-300",
      bg: "bg-violet-500/10",
    },
    emerald: {
      wrap: "border-emerald-500/20 from-emerald-500/[0.12] to-emerald-500/[0.03]",
      text: "text-emerald-300",
      bg: "bg-emerald-500/10",
    },
  };
  const s = styles[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 ${s.wrap}`}
    >
      <div className={`absolute right-4 top-4 rounded-xl p-2 ${s.bg}`}>
        <div className={s.text}>{icon}</div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1.5 text-4xl font-black leading-none tracking-tight ${s.text}`}
      >
        {value}
      </p>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl text-sm font-semibold border backdrop-blur-md ${
        isError
          ? "bg-rose-950/90 border-rose-700/60 text-rose-200"
          : "bg-emerald-950/90 border-emerald-700/60 text-emerald-200"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
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
    .select("id,nombre,marca,categoria,tamaño,codigo_barras")
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
      .select("id,nombre,marca,categoria,tamaño")
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
        tamaño: product.tamaño,
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
  const [cancelingOrderId, setCancelingOrderId] = useState(null);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  const userRole = perfil?.rol ?? null;
  const allowedTabs = userRole
    ? (ROLE_ALLOWED_TABS[userRole] ?? ["stock"])
    : ["stock"];

  const canAccessTab = (tabId) => {
    const tab = TABS.find((t) => t.id === tabId);
    if (!tab) return false;
    if (!tab.requiresAuth) return true;
    if (!session || !userRole) return false;
    return allowedTabs.includes(tabId);
  };

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

  useEffect(() => {
    const loadPerfil = async () => {
      if (!session?.user?.id) {
        setPerfil(null);
        return;
      }

      setPerfilLoading(true);
      const { data, error } = await supabase
        .from("perfiles")
        .select("rol,sucursal_id,email")
        .eq("id", session.user.id)
        .maybeSingle();

      setPerfilLoading(false);

      if (error) {
        showToast("No se pudo cargar el perfil de permisos.", "error");
        return;
      }

      if (!data) {
        setPerfil(null);
        showToast(
          "Tu usuario no tiene perfil asignado. Pedí al admin que te habilite.",
          "error",
        );
        return;
      }

      setPerfil(data);
    };

    loadPerfil();
  }, [session]);

  useEffect(() => {
    if (!canAccessTab(activeTab)) {
      setActiveTab("stock");
    }
  }, [activeTab, session, userRole]);

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

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ pedido, motivo }) => {
      setCancelingOrderId(pedido.id);

      const { error: logError } = await supabase
        .from("movimientos_stock")
        .insert({
          producto_id: pedido.producto_id,
          transferencia_id: pedido.id,
          origen: pedido.origen,
          destino: pedido.destino,
          cantidad: pedido.cantidad,
          tipo: "ajuste_manual",
          motivo: `Cancelacion de pedido: ${motivo}`,
          actor_id: session?.user?.id ?? null,
        });

      if (logError) throw logError;

      const { error: deleteError } = await supabase
        .from("transferencias")
        .delete()
        .eq("id", pedido.id)
        .eq("estado", "pendiente");

      if (deleteError) throw deleteError;
    },
    onSuccess: async () => {
      showToast("Pedido cancelado correctamente.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["transferencias-pendientes"],
        }),
        queryClient.invalidateQueries({ queryKey: ["movimientos"] }),
      ]);
    },
    onError: (error) =>
      showToast(
        mapSupabaseError(error, "No se pudo cancelar el pedido."),
        "error",
      ),
    onSettled: () => setCancelingOrderId(null),
  });

  const createProductMutation = useMutation({
    mutationFn: async (payload) => {
      if (userRole !== "administrador") {
        throw new Error("Solo administrador puede crear productos.");
      }

      // Validate duplicate codigo_barras
      if (payload.codigo_barras && payload.codigo_barras.trim()) {
        const existingProduct = (productosQuery.data ?? []).find(
          (p) => p.codigo_barras === payload.codigo_barras.trim(),
        );
        if (existingProduct) {
          throw new Error(
            `El código de barras "${payload.codigo_barras}" ya existe en el producto "${existingProduct.nombre}".`,
          );
        }
      }

      const { error } = await supabase.from("productos").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      showToast("Producto creado correctamente.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["productos"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-global"] }),
      ]);
    },
    onError: (error) =>
      showToast(mapSupabaseError(error, "Error al crear producto."), "error"),
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      if (userRole !== "administrador") {
        throw new Error("Solo administrador puede editar productos.");
      }

      setUpdatingProductId(id);
      const { error } = await supabase
        .from("productos")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      showToast("Producto actualizado.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["productos"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-global"] }),
      ]);
    },
    onError: (error) =>
      showToast(
        mapSupabaseError(error, "Error al actualizar producto."),
        "error",
      ),
    onSettled: () => setUpdatingProductId(null),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (product) => {
      if (userRole !== "administrador") {
        throw new Error("Solo administrador puede eliminar productos.");
      }

      setDeletingProductId(product.id);
      const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      showToast("Producto eliminado.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["productos"] }),
        queryClient.invalidateQueries({ queryKey: ["stock-global"] }),
      ]);
    },
    onError: (error) =>
      showToast(
        mapSupabaseError(error, "Error al eliminar producto."),
        "error",
      ),
    onSettled: () => setDeletingProductId(null),
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
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
              <svg
                className="h-5 w-5 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="leading-none">
              <p className="text-sm font-bold text-slate-100">Pinturería</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Control de stock
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={() => setActiveTab("despacho")}
                className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </button>
            )}
            {session && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900 py-1 pl-2 pr-1">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-[10px] font-black text-white">
                  {session.user.email[0].toUpperCase()}
                </div>
                <span className="max-w-[150px] truncate text-xs text-slate-300">
                  {session.user.email}
                </span>
                <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                  {perfilLoading
                    ? "Cargando..."
                    : (ROLE_LABELS[userRole] ?? "Sin rol")}
                  {perfil?.sucursal_id
                    ? ` · ${BRANCH_LABELS[perfil.sucursal_id] ?? perfil.sucursal_id}`
                    : ""}
                </span>
                <button
                  onClick={handleSignOut}
                  disabled={authSubmitting}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ── Stats ── */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Productos"
            value={totalProducts}
            accent="sky"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path
                  fillRule="evenodd"
                  d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            }
          />
          <StatCard
            label="Pendientes"
            value={pendingCount}
            accent="amber"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
            }
          />
          <StatCard
            label="Stock crítico"
            value={criticalProducts}
            accent="violet"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            }
          />
          <StatCard
            label="En tránsito"
            value={inTransitCount}
            accent="emerald"
            icon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-5h2.038A2 2 0 0116 11.446V15h-.05a2.5 2.5 0 01-4.9 0H9a2 2 0 01-2-2V5a1 1 0 00-1-1H3z" />
              </svg>
            }
          />
        </div>

        <StockAlertBanner stock={stockQuery.data} threshold={10} />

        {!session && (
          <AuthPanel
            session={session}
            authLoading={authLoading}
            authSubmitting={authSubmitting}
            credentials={credentials}
            onCredentialsChange={setCredentials}
            onSignIn={handleSignIn}
            onResetPassword={handleResetPassword}
          />
        )}

        {/* ── Tabs ── */}
        <div className="mb-6 overflow-x-auto pb-0.5">
          <div className="flex min-w-max gap-0.5 rounded-xl border border-slate-800 bg-slate-900/60 p-1.5">
            {TABS.map((tab) => {
              const isLocked = !canAccessTab(tab.id);
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (canAccessTab(tab.id)) {
                      setActiveTab(tab.id);
                      return;
                    }

                    if (!session) {
                      showToast(
                        "Iniciá sesión para acceder a esta sección.",
                        "error",
                      );
                      return;
                    }

                    showToast(
                      "Tu rol no tiene acceso a esta sección.",
                      "error",
                    );
                  }}
                  disabled={isLocked}
                  title={
                    !session && tab.requiresAuth
                      ? "Requiere sesión iniciada"
                      : isLocked
                        ? "No tenés permisos para esta sección"
                        : undefined
                  }
                  className={`relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-slate-700 text-white shadow-md"
                      : isLocked
                        ? "cursor-not-allowed text-slate-700"
                        : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                >
                  <span className={isLocked ? "opacity-40" : ""}>
                    {TAB_ICONS[tab.icon]}
                  </span>
                  <span>{tab.label}</span>
                  {isLocked && (
                    <svg
                      className="h-3 w-3 shrink-0 opacity-40"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 1a3.5 3.5 0 00-3.5 3.5V6H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1h-1.5V4.5A3.5 3.5 0 008 1zm2 5V4.5a2 2 0 10-4 0V6h4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {tab.id === "despacho" && pendingCount > 0 && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-900">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab content ── */}
        {activeTab === "stock" && canAccessTab("stock") && (
          <StockGlobalTable
            rows={stockQuery.data}
            isLoading={stockQuery.isLoading}
          />
        )}
        {activeTab === "productos" && canAccessTab("productos") && (
          <ProductsCrudTab
            products={productosQuery.data}
            isLoading={productosQuery.isLoading}
            onCreate={(payload) => createProductMutation.mutate(payload)}
            onUpdate={(payload) => updateProductMutation.mutate(payload)}
            onDelete={(product) => {
              if (!session) {
                showToast("Inicia sesion para eliminar productos.", "error");
                return;
              }
              if (
                !window.confirm(
                  `Confirmas eliminar el producto \"${product.nombre}\"?`,
                )
              )
                return;
              deleteProductMutation.mutate(product);
            }}
            isCreating={createProductMutation.isPending}
            isUpdating={updateProductMutation.isPending}
            isDeleting={deleteProductMutation.isPending}
            updatingId={updatingProductId}
            deletingId={deletingProductId}
          />
        )}
        {activeTab === "pedidos" && canAccessTab("pedidos") && (
          <InternalOrderForm
            productos={productosQuery.data}
            pendingOrders={transfersQuery.data}
            onSubmit={(payload) => createOrderMutation.mutate(payload)}
            onCancelOrder={(pedido, motivo) => {
              if (!session) {
                showToast("Inicia sesion para cancelar pedidos.", "error");
                return;
              }
              cancelOrderMutation.mutate({ pedido, motivo });
            }}
            isSubmitting={createOrderMutation.isPending}
            cancelingOrderId={cancelingOrderId}
          />
        )}
        {activeTab === "despacho" && canAccessTab("despacho") && (
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
        {activeTab === "ajustar" && canAccessTab("ajustar") && (
          <StockAdjustTab
            productos={productosQuery.data}
            onAdjust={(params) => {
              if (!window.confirm("Confirmas el ajuste de stock?")) return;
              adjustMutation.mutate(params);
            }}
            isSubmitting={adjustMutation.isPending}
          />
        )}
        {activeTab === "historial" && canAccessTab("historial") && (
          <MovimientosTab
            movimientos={movimientosQuery.data}
            isLoading={movimientosQuery.isLoading}
          />
        )}
        {activeTab === "importar" && canAccessTab("importar") && (
          <CsvImport
            onImported={() => {
              queryClient.invalidateQueries({ queryKey: ["productos"] });
              queryClient.invalidateQueries({ queryKey: ["stock-global"] });
              setActiveTab("stock");
            }}
          />
        )}

        {activeTab && !canAccessTab(activeTab) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            {!session
              ? "Iniciá sesión con usuario de sucursal o administrador para acceder a la app."
              : "Tu usuario no tiene permisos para esta sección. Contactá al administrador."}
          </div>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
