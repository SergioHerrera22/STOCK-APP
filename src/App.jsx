import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CsvImport from "./components/CsvImport";
import StockGlobalTable from "./components/StockGlobalTable";
import InternalOrderForm from "./components/InternalOrderForm";
import DispatchPanel from "./components/DispatchPanel";
import AuthPanel from "./components/AuthPanel";
import StockAdjustTab from "./components/StockAdjustTab";
import MovimientosTab from "./components/MovimientosTab";
import ProductsCrudTab from "./components/ProductsCrudTab";
import UsersPermissionsTab from "./components/UsersPermissionsTab";
import StockAlertBanner from "./components/StockAlertBanner";
import ExportButton from "./components/ExportButton";
import { mapSupabaseError } from "./lib/errorMapper";
import { supabase } from "./lib/supabaseClient";

const ONBOARDING_KEY_PREFIX = "robles.onboarding.dismissed";

const TABS = [
  { id: "stock", label: "Stock", icon: "stock", requiresAuth: true },
  {
    id: "productos",
    label: "Productos",
    icon: "productos",
    requiresAuth: true,
  },
  { id: "pedidos", label: "Pedidos", icon: "pedido", requiresAuth: true },
  { id: "despacho", label: "Despacho", icon: "despacho", requiresAuth: true },
  { id: "ajustar", label: "Ajustes", icon: "ajustar", requiresAuth: true },
  {
    id: "historial",
    label: "Historial",
    icon: "historial",
    requiresAuth: true,
  },
  { id: "usuarios", label: "Usuarios", icon: "usuarios", requiresAuth: true },
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

const ADMIN_EMAIL = "admin@robles.com";

const ROLE_ALLOWED_TABS = {
  administrador: [
    "stock",
    "productos",
    "pedidos",
    "despacho",
    "ajustar",
    "historial",
    "usuarios",
    "importar",
  ],
  sucursal: ["stock", "pedidos", "despacho", "ajustar"],
  deposito: ["stock", "pedidos", "despacho", "ajustar"],
};

const TAB_HELP = {
  stock: {
    title: "Vista de stock global",
    description:
      "Consultá disponibilidad por sucursal, aplicá filtros rápidos y detectá faltantes.",
  },
  productos: {
    title: "Gestión de productos",
    description:
      "Creá, editá y eliminá productos del catálogo con validación de códigos.",
  },
  pedidos: {
    title: "Pedidos internos",
    description:
      "Generá solicitudes al depósito central y seguí el estado de cada pedido.",
  },
  despacho: {
    title: "Despacho y recepción",
    description:
      "Despachá pedidos pendientes y confirmá recepciones en tránsito.",
  },
  ajustar: {
    title: "Ajustes de stock",
    description:
      "Corregí cantidades por ubicación y dejá trazabilidad del motivo del ajuste.",
  },
  historial: {
    title: "Historial de movimientos",
    description:
      "Revisá despachos, recepciones y ajustes registrados en orden cronológico.",
  },
  usuarios: {
    title: "Permisos de usuarios",
    description:
      "Asigná roles y sucursales para controlar qué puede hacer cada cuenta.",
  },
  importar: {
    title: "Importación masiva",
    description:
      "Subí archivos CSV o Excel para cargar productos en lote con vista previa.",
  },
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
  usuarios: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M7 9a3 3 0 100-6 3 3 0 000 6zM13 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.5 16.5A4.5 4.5 0 016 12h2a4.5 4.5 0 014.5 4.5.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5zM12 16.5a3.5 3.5 0 013.5-3.5H16a3.5 3.5 0 013.5 3.5.5.5 0 01-.5.5h-6.5a.5.5 0 01-.5-.5z" />
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
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 md:p-5 ${s.wrap}`}
    >
      <div className={`absolute right-4 top-4 rounded-xl p-2 ${s.bg}`}>
        <div className={s.text}>{icon}</div>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1.5 text-3xl font-black leading-none tracking-tight md:text-4xl ${s.text}`}
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
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "stock";
    return window.localStorage.getItem("robles.activeTab") || "stock";
  });
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentEmail = session?.user?.email?.toLowerCase() ?? null;
  const isAdminUser = currentEmail === ADMIN_EMAIL;
  const profileRole = ["administrador", "sucursal", "deposito"].includes(
    perfil?.rol,
  )
    ? perfil.rol
    : null;
  const effectiveRole = session
    ? isAdminUser
      ? "administrador"
      : (profileRole ?? "sucursal")
    : null;
  const userRole = effectiveRole;
  const allowedTabs = effectiveRole
    ? (ROLE_ALLOWED_TABS[effectiveRole] ?? ["stock"])
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
        setPerfil({
          rol: isAdminUser ? "administrador" : "sucursal",
          sucursal_id: null,
          email: session.user.email,
        });
        return;
      }

      setPerfil(data);
    };

    loadPerfil();
  }, [session, isAdminUser]);

  useEffect(() => {
    if (!canAccessTab(activeTab)) {
      setActiveTab("stock");
    }
  }, [activeTab, session, userRole]);

  useEffect(() => {
    if (!session || !userRole) {
      setShowOnboarding(false);
      return;
    }

    const key = `${ONBOARDING_KEY_PREFIX}.${userRole}`;
    const dismissed = window.localStorage.getItem(key) === "1";
    setShowOnboarding(!dismissed);
  }, [session, userRole]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("robles.activeTab", activeTab);
  }, [activeTab]);

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
    enabled: Boolean(session),
  });
  const stockQuery = useQuery({
    queryKey: ["stock-global"],
    queryFn: fetchStockGlobal,
    enabled: Boolean(session),
  });
  const transfersQuery = useQuery({
    queryKey: ["transferencias-pendientes"],
    queryFn: fetchPendingTransfers,
    enabled: Boolean(session),
  });
  const movimientosQuery = useQuery({
    queryKey: ["movimientos"],
    queryFn: fetchMovimientos,
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (session) return;

    queryClient.removeQueries({ queryKey: ["productos"] });
    queryClient.removeQueries({ queryKey: ["stock-global"] });
    queryClient.removeQueries({ queryKey: ["transferencias-pendientes"] });
    queryClient.removeQueries({ queryKey: ["movimientos"] });
  }, [session, queryClient]);

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

  const visibleTransfers = useMemo(() => {
    const allTransfers = transfersQuery.data ?? [];

    if (!session || !userRole) return [];
    if (userRole === "administrador" || userRole === "deposito") {
      return allTransfers;
    }

    if (userRole === "sucursal") {
      const branchId = perfil?.sucursal_id;
      if (!branchId) return [];
      return allTransfers.filter((item) => item.destino === branchId);
    }

    return [];
  }, [transfersQuery.data, session, userRole, perfil?.sucursal_id]);

  const pendingCount = visibleTransfers.filter(
    (item) => item.estado === "pendiente",
  ).length;
  const inTransitCount = visibleTransfers.filter(
    (item) => item.estado === "en_transito",
  ).length;
  const totalProducts = stockQuery.data?.length ?? 0;
  const criticalProducts = (stockQuery.data ?? []).filter((row) =>
    ["sucursal_1", "sucursal_2", "sucursal_3", "deposito_central"].some(
      (key) => (row[key] ?? 0) <= 5,
    ),
  ).length;

  const quickActions = [
    {
      id: "go-stock",
      label: "Ver stock",
      onClick: () => setActiveTab("stock"),
      show: canAccessTab("stock"),
    },
    {
      id: "go-pedidos",
      label: "Nuevo pedido",
      onClick: () => setActiveTab("pedidos"),
      show: canAccessTab("pedidos"),
    },
    {
      id: "go-despacho",
      label: "Ver pendientes",
      onClick: () => setActiveTab("despacho"),
      show: canAccessTab("despacho") && pendingCount > 0,
    },
    {
      id: "go-ajustes",
      label: "Ajustar stock",
      onClick: () => setActiveTab("ajustar"),
      show: canAccessTab("ajustar"),
    },
    {
      id: "go-usuarios",
      label: "Gestionar usuarios",
      onClick: () => setActiveTab("usuarios"),
      show: canAccessTab("usuarios"),
    },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/assets/brand/logo.jpg"
              alt="Robles Pinturerias"
              className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-lg shadow-orange-500/20"
            />
            <div className="leading-none">
              <p className="text-sm font-bold text-slate-100">Robles</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Pinturerias · Control de stock
              </p>
            </div>
          </div>

          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
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
              <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900 py-1 pl-2 pr-1 sm:w-auto sm:flex-nowrap">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-[10px] font-black text-white">
                  {session.user.email[0].toUpperCase()}
                </div>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-300 sm:max-w-[150px] sm:flex-none">
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
                  className="ml-auto rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50 sm:ml-0"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {!session ? (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-[#4a5058] via-[#3f454d] to-[#353a41] p-6 shadow-xl shadow-black/30">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                    Bienvenido
                  </p>
                  <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">
                    Sistema de Stock Robles
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-200/90">
                    Iniciá sesión para acceder a productos, pedidos, despacho y
                    ajustes según tus permisos.
                  </p>
                </div>
                <img
                  src="/assets/brand/logo.jpg"
                  alt="Robles Pinturerias"
                  className="h-24 w-24 rounded-2xl border border-white/10 object-cover shadow-lg shadow-orange-900/40 md:h-28 md:w-28"
                />
              </div>
            </div>

            <AuthPanel
              session={session}
              authLoading={authLoading}
              authSubmitting={authSubmitting}
              credentials={credentials}
              onCredentialsChange={setCredentials}
              onSignIn={handleSignIn}
              onResetPassword={handleResetPassword}
            />
          </div>
        ) : (
          <>
            {/* ── Stats ── */}
            <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label="Productos"
                value={totalProducts}
                accent="sky"
                icon={
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
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
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
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
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
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
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-5 w-5"
                  >
                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H11a1 1 0 001-1v-5h2.038A2 2 0 0116 11.446V15h-.05a2.5 2.5 0 01-4.9 0H9a2 2 0 01-2-2V5a1 1 0 00-1-1H3z" />
                  </svg>
                }
              />
            </div>

            <StockAlertBanner stock={stockQuery.data} threshold={10} />

            {showOnboarding && (
              <div className="mb-6 rounded-xl border border-orange-400/30 bg-orange-500/10 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-200">
                      Guía rápida para{" "}
                      {userRole === "administrador"
                        ? "administrador"
                        : "sucursal"}
                    </p>
                    {userRole === "administrador" ? (
                      <p className="mt-1 text-xs text-orange-100/90">
                        Empezá por Usuarios para asignar permisos, luego cargá
                        productos y controlá pedidos desde Despacho.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-orange-100/90">
                        Flujo recomendado: revisá Stock, generá Pedidos y seguí
                        su avance en Despacho.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const key = `${ONBOARDING_KEY_PREFIX}.${userRole}`;
                      window.localStorage.setItem(key, "1");
                      setShowOnboarding(false);
                    }}
                    className="rounded-lg border border-orange-300/40 px-3 py-1.5 text-xs font-semibold text-orange-100 transition hover:bg-orange-400/10"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

            {/* ── Tabs ── */}
            <div className="mb-6 overflow-x-auto pb-0.5">
              <div className="grid min-w-[320px] grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 sm:flex sm:min-w-max sm:gap-0.5">
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

                        showToast(
                          "Tu rol no tiene acceso a esta sección.",
                          "error",
                        );
                      }}
                      disabled={isLocked}
                      title={
                        isLocked
                          ? "No tenés permisos para esta sección"
                          : undefined
                      }
                      className={`relative flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 sm:justify-start sm:px-4 ${
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

            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {TAB_HELP[activeTab]?.title ?? "Sección"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {TAB_HELP[activeTab]?.description ?? ""}
                  </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-orange-400/50 hover:text-orange-300"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
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
                    showToast(
                      "Inicia sesion para eliminar productos.",
                      "error",
                    );
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
                pendingOrders={visibleTransfers}
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
                pedidos={visibleTransfers}
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
                onGoToDespacho={() => setActiveTab("despacho")}
              />
            )}
            {activeTab === "usuarios" && canAccessTab("usuarios") && (
              <UsersPermissionsTab
                onSaved={() => showToast("Permisos actualizados.")}
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
                Tu usuario no tiene permisos para esta sección. Contactá al
                administrador.
              </div>
            )}
          </>
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
